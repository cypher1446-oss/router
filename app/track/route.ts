import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getClientIp } from '@/lib/getClientIp'

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const rawUid = searchParams.get('uid')
    const clickid = searchParams.get('clickid') || searchParams.get('cid')

    // 1. UID Validation & Normalization
    let validatedUid = (rawUid && rawUid.trim() !== '' && rawUid !== '[UID]' && rawUid !== 'N/A')
        ? rawUid
        : crypto.randomUUID()

    if (!code) {
        const errorUrl = new URL('/paused', request.url)
        errorUrl.searchParams.set('title', 'INVALID LINK')
        errorUrl.searchParams.set('desc', 'The project code is missing or invalid.')
        errorUrl.searchParams.set('status', 'error')
        return NextResponse.redirect(errorUrl)
    }

    const supabase = await createAdminClient()

    try {
        // 2. Fetch project details
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_code', code)
            .maybeSingle()

        // 3. PAUSE LOGIC & TEST MODE
        // If project does NOT exist in our DB, it's a TEST link.
        // Rule: Directly launch, but do NOT record in responses table.
        if (!project && !fetchError) {
            const testTarget = searchParams.get('target') || 'https://www.google.com'
            return NextResponse.redirect(new URL(testTarget))
        }

        if (!project) {
            const errorUrl = new URL('/paused', request.url)
            errorUrl.searchParams.set('title', 'PROJECT NOT FOUND')
            errorUrl.searchParams.set('desc', 'The project code does not exist in our system.')
            return NextResponse.redirect(errorUrl)
        }

        // Check if project as a whole is paused
        if (project.status === 'paused') {
            const pauseUrl = new URL('/paused', request.url)
            pauseUrl.searchParams.set('code', code)
            pauseUrl.searchParams.set('ip', ip)
            pauseUrl.searchParams.set('title', 'PROJECT PAUSED')
            pauseUrl.searchParams.set('desc', 'This project is currently paused by admin.')
            return NextResponse.redirect(pauseUrl)
        }

        // Check for country-specific active toggle
        const countryParam = searchParams.get('country') || searchParams.get('c')
        if (project.is_multi_country && countryParam) {
            const countryConfig = (project.country_urls as any[] || []).find(c => c.country_code === countryParam)
            if (countryConfig && countryConfig.active === false) {
                const pauseUrl = new URL('/paused', request.url)
                pauseUrl.searchParams.set('code', code)
                pauseUrl.searchParams.set('country', countryParam)
                pauseUrl.searchParams.set('ip', ip)
                pauseUrl.searchParams.set('title', 'COUNTRY UNAVAILABLE')
                pauseUrl.searchParams.set('desc', `Target country ${countryParam} is currently not active for this project.`)
                return NextResponse.redirect(pauseUrl)
            }
        }

        const userAgent = request.headers.get('user-agent') || 'Unknown'

        // --- Device Type Detection ---
        let deviceType = 'Desktop'
        const ua = userAgent.toLowerCase()
        if (ua.includes('tablet') || ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
            deviceType = 'Tablet'
        } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
            deviceType = 'Mobile'
        }

        // --- Geo IP Validation ---
        let geoCountry = 'Unknown'
        let geoMismatch = false

        if (ip !== '127.0.0.1') {
            try {
                const vercelCountry = request.headers.get('x-vercel-ip-country')
                if (vercelCountry) {
                    geoCountry = vercelCountry
                } else {
                    const geoRes = await fetch(`http://ip-api.com/json/${ip}`)
                    const geoData = await geoRes.json()
                    if (geoData.status === 'success') {
                        geoCountry = geoData.countryCode
                    }
                }

                if (project?.country !== 'Global' && geoCountry !== project?.country) {
                    geoMismatch = true
                }
            } catch (err) {
                console.error('Geo IP detection failed:', err)
            }
        }

        // Helper for response logging and redirection
        const logAndRedirect = async (status: string, reason?: string, params: Record<string, string> = {}) => {
            const { data: record } = await supabase
                .from('responses')
                .insert([{
                    project_id: project.id,
                    uid: validatedUid,
                    status,
                    reason,
                    ip,
                    user_agent: userAgent,
                    device_type: deviceType,
                    geo_country: geoCountry,
                    geo_mismatch: status === 'security_terminate' && reason === 'geo_mismatch',
                    clickid: clickid || null,
                    created_at: new Date().toISOString()
                }])
                .select('id')
                .single()

            const searchParamsToPass = new URLSearchParams({
                ...params,
                code: code || '',
                uid: validatedUid || 'N/A',
                response_id: record?.id || '',
                status,
                ip,
                ts: Date.now().toString()
            })

            const target = status === 'security_terminate' ? '/security-terminate' :
                status === 'duplicate_ip' ? '/duplicate-ip' :
                    status === 'duplicate_string' ? '/duplicate-string' :
                        status === 'paused' ? '/paused' :
                            `/${status}`

            return NextResponse.redirect(new URL(`${target}?${searchParamsToPass.toString()}`, request.url))
        }

        if (geoMismatch) {
            return await logAndRedirect('security_terminate', 'geo_mismatch')
        }

        if (validatedUid) {
            const { data: existingComplete } = await supabase
                .from('responses')
                .select('id')
                .eq('project_id', project.id)
                .eq('uid', validatedUid)
                .eq('status', 'complete')
                .limit(1)

            if (existingComplete && existingComplete.length > 0) {
                return await logAndRedirect('duplicate_string', 'already_complete')
            }
        }

        // IP Threshold Check
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count: ipCount } = await supabase
            .from('responses')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('ip', ip)
            .gt('created_at', yesterday)

        if (ipCount && ipCount >= 10) {
            return await logAndRedirect('duplicate_ip', 'abuse_threshold')
        }

        // 4. Generate Supplier Token
        let supplierToken = validatedUid
        if (project.token_prefix) {
            const { data: tokenData, error: tokenError } = await supabase
                .rpc('generate_supplier_token', { project_id_param: project.id })

            if (tokenError) {
                console.error('Failed to generate supplier token:', tokenError)
                supplierToken = validatedUid
            } else {
                supplierToken = tokenData
            }
        }

        // 5. Mandatory Logging BEFORE Redirect
        const { data: insertedResponse, error: insertError } = await supabase
            .from('responses')
            .insert([{
                project_id: project.id,
                uid: validatedUid,
                supplier_token: supplierToken || null,
                status: 'started',
                ip: ip,
                user_agent: userAgent,
                device_type: deviceType,
                geo_country: geoCountry,
                geo_mismatch: false,
                clickid: clickid || null,
                created_at: new Date().toISOString()
            }])
            .select('id')
            .single()

        if (insertError) {
            console.error('CRITICAL: Response insert failed:', insertError)
            return new Response(JSON.stringify({
                error: 'Failed to record tracking session',
                details: insertError
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // 6. Pre-Screener Redirection Logic
        if (project.has_prescreener) {
            return NextResponse.redirect(new URL(`/prescreener?response_id=${insertedResponse.id}`, request.url))
        }

        // 7. Final Redirection (Direct to Survey)
        let finalUrl = project.base_url
        const countryParamFinal = searchParams.get('country') || searchParams.get('c')

        if (project.is_multi_country) {
            const countryConfig = (project.country_urls as any[] || []).find(c => c.country_code === countryParamFinal && c.active !== false)
            if (countryConfig) {
                finalUrl = countryConfig.target_url
            }
        }

        const tokenToUse = supplierToken || validatedUid

        if (tokenToUse) {
            const placeholders = ['[UID]', '[identifier]', '{uid}', '{UID}', '{ResID}', '{rid}', '{ID}', '[ID]', '{rid}', '{id}']
            let replaced = false
            placeholders.forEach(p => {
                if (finalUrl.includes(p)) {
                    finalUrl = finalUrl.replaceAll(p, encodeURIComponent(tokenToUse))
                    replaced = true
                }
            })

            if (!replaced) {
                if (finalUrl.endsWith('=') || finalUrl.endsWith('?') || finalUrl.endsWith('&')) {
                    finalUrl += encodeURIComponent(tokenToUse)
                }
            }
        }

        return NextResponse.redirect(new URL(finalUrl))

    } catch (error) {
        console.error('Track route exception:', error)
        const fatalUrl = new URL('/paused', request.url)
        fatalUrl.searchParams.set('title', 'TRACKING ERROR')
        fatalUrl.searchParams.set('desc', 'An unexpected error occurred while starting your session.')
        return NextResponse.redirect(fatalUrl)
    }
}
