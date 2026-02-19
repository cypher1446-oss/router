import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getClientIp } from '@/lib/getClientIp'

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const uid = searchParams.get('uid')
    const type = searchParams.get('type')

    if (!code || !type) {
        const errorUrl = new URL('/paused', request.url)
        errorUrl.searchParams.set('title', 'INVALID REQUEST')
        errorUrl.searchParams.set('desc', 'The tracking request is missing required parameters.')
        errorUrl.searchParams.set('status', 'error')
        return NextResponse.redirect(errorUrl)
    }

    const supabase = await createAdminClient()

    try {
        // 1. Fetch project by unique project_code
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_code', code)
            .maybeSingle()

        // --- PAUSE LOGIC ---
        let redirectReason: { title: string; desc: string } | null = null

        if (project) {
            // Check project-level pause
            if (project.status === 'paused') {
                redirectReason = { title: 'PROJECT PAUSED', desc: 'This project is currently paused.' }
            } else {
                // Check country-level pause
                const countryParam = searchParams.get('country') || searchParams.get('c')
                if (project.is_multi_country && countryParam) {
                    const countryConfig = (project.country_urls as any[] || []).find(c => c.country_code === countryParam)
                    if (countryConfig && countryConfig.active === false) {
                        redirectReason = { title: 'COUNTRY UNAVAILABLE', desc: `Target country ${countryParam} is currently not active.` }
                    }
                }
            }
        }

        // If paused, redirect immediately
        if (redirectReason) {
            const pauseUrl = new URL('/paused', request.url)
            pauseUrl.searchParams.set('code', code)
            pauseUrl.searchParams.set('uid', uid || 'N/A')
            pauseUrl.searchParams.set('ip', ip)
            pauseUrl.searchParams.set('title', redirectReason.title)
            pauseUrl.searchParams.set('desc', redirectReason.desc)
            return NextResponse.redirect(pauseUrl)
        }

        // --- TEST MODE (If project doesn't exist in tool) ---
        // Rule: Direct landing, but NO DB record.
        if (!project && !projectError) {
            const landingMap: Record<string, { route: string; title: string; desc: string }> = {
                'complete': { route: '/complete', title: 'THANK YOU!', desc: 'Survey Completed Successfully' },
                'terminate': { route: '/terminate', title: 'SORRY!', desc: 'The link you are looking for is TERMINATED' },
                'quota': { route: '/quotafull', title: 'SORRY!', desc: 'The Quota for this survey is FULL' },
                'duplicate_string': { route: '/duplicate-string', title: 'SORRY!', desc: 'You have already attempted this survey' },
                'duplicate_ip': { route: '/duplicate-ip', title: 'SORRY!', desc: 'Multiple attempts from the same IP are not allowed' },
                'security_terminate': { route: '/security-terminate', title: 'ERROR!', desc: 'Security Validation Failed: Access Denied' }
            }
            const config = landingMap[type] || { route: '/paused', title: 'PAUSED', desc: 'This Project is Currently Paused' }
            const landingUrl = new URL(config.route, request.url)

            landingUrl.searchParams.set('code', code)
            landingUrl.searchParams.set('uid', uid || 'N/A')
            landingUrl.searchParams.set('status', type)
            landingUrl.searchParams.set('ip', ip)
            landingUrl.searchParams.set('is_test', 'true')
            landingUrl.searchParams.set('title', config.title)
            landingUrl.searchParams.set('desc', config.desc)

            return NextResponse.redirect(landingUrl)
        }

        // 4. Continue Normal Logic for Active Projects
        let finalType = type

        if (type === 'complete' && project.complete_target !== null) {
            const { count, error: countError } = await supabase
                .from('responses')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', project.id)
                .eq('status', 'complete')

            if (!countError && count !== null && count >= project.complete_target) {
                finalType = 'quota'
                await supabase
                    .from('projects')
                    .update({ status: 'paused' })
                    .eq('id', project.id)
            }
        }

        const landingMap: Record<string, { db: string; route: string; title: string; desc: string }> = {
            'complete': { db: 'complete', route: '/complete', title: 'THANK YOU!', desc: 'Survey Completed Successfully' },
            'terminate': { db: 'terminate', route: '/terminate', title: 'SORRY!', desc: 'The link you are looking for is TERMINATED' },
            'quota': { db: 'quota', route: '/quotafull', title: 'SORRY!', desc: 'The Quota for this survey is FULL' },
            'duplicate_string': { db: 'terminate', route: '/duplicate-string', title: 'SORRY!', desc: 'You have already attempted this survey' },
            'duplicate_ip': { db: 'terminate', route: '/duplicate-ip', title: 'SORRY!', desc: 'Multiple attempts from the same IP are not allowed' },
            'security_terminate': { db: 'terminate', route: '/security-terminate', title: 'ERROR!', desc: 'Security Validation Failed: Access Denied' }
        }

        const config = landingMap[finalType] || { db: 'started', route: '/paused', title: 'PAUSED', desc: 'This Project is Currently Paused' }

        const { data: latestRecord } = await supabase
            .from('responses')
            .select('id, clickid')
            .eq('project_id', project.id)
            .eq('uid', uid)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        let responseId = latestRecord?.id

        if (latestRecord) {
            await supabase
                .from('responses')
                .update({
                    status: config.db,
                    ip: ip,
                    user_agent: request.headers.get('user-agent') || 'Unknown'
                })
                .eq('id', latestRecord.id)
        } else {
            const { data: newRecord } = await supabase
                .from('responses')
                .insert([{
                    project_id: project.id,
                    uid: uid || null,
                    status: config.db,
                    ip: ip,
                    user_agent: request.headers.get('user-agent') || 'Unknown'
                }])
                .select()
                .single()

            responseId = newRecord?.id
        }

        const landingUrl = new URL(config.route, request.url)
        if (responseId) landingUrl.searchParams.set('response_id', responseId)
        landingUrl.searchParams.set('uid', uid || 'N/A')
        landingUrl.searchParams.set('code', code)
        landingUrl.searchParams.set('status', config.db)
        landingUrl.searchParams.set('ip', ip)
        landingUrl.searchParams.set('title', config.title)
        landingUrl.searchParams.set('desc', config.desc)

        return NextResponse.redirect(landingUrl)

    } catch (error) {
        console.error('Status route error:', error)
        const fatalUrl = new URL('/paused', request.url)
        fatalUrl.searchParams.set('title', 'SYSTEM ERROR')
        fatalUrl.searchParams.set('desc', 'An unexpected error occurred.')
        return NextResponse.redirect(fatalUrl)
    }
}
