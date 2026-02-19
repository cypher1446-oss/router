import { createSessionClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'

export const dynamic = 'force-dynamic'

interface PreScreenerProps {
    searchParams: Promise<{ response_id: string }>
}

export default async function PreScreenerPage({ searchParams }: PreScreenerProps) {
    const { response_id } = await searchParams

    if (!response_id) {
        redirect('/paused')
    }

    const supabase = await createSessionClient()

    // 1. Fetch response and associated project
    const { data: response, error } = await supabase
        .from('responses')
        .select('*, projects(*)')
        .eq('id', response_id)
        .single()

    if (error || !response || !response.projects) {
        console.error('Pre-screener error:', error)
        redirect('/paused')
    }

    const project = response.projects

    // 2. If external pre-screener URL exists, redirect
    if (project.prescreener_url) {
        const externalUrl = project.prescreener_url.replace('[response_id]', response_id)
        redirect(externalUrl)
    }

    // 3. Internal Pre-Screener Action
    async function handleQualification(formData: FormData) {
        'use server'
        const age = parseInt(formData.get('age') as string)
        const country = formData.get('country') as string
        const res_id = formData.get('response_id') as string

        const supabase = await createSessionClient()

        // Simple Qualification Logic: Age 18+ and Country matches project country (if not Global)
        const isQualified = age >= 18 && (project.country === 'Global' || project.country === country)

        if (isQualified) {
            // Success: Redirect to client survey
            let finalUrl = project.base_url
            const token = response.supplier_token || response.uid || ''
            if (token) {
                finalUrl = finalUrl.replace('[UID]', encodeURIComponent(token))
                finalUrl = finalUrl.replace('[identifier]', encodeURIComponent(token))
            } else {
                finalUrl = finalUrl.replace('[UID]', '')
                finalUrl = finalUrl.replace('[identifier]', '')
            }
            redirect(finalUrl)
        } else {
            // Fail: Update status and redirect to terminate
            await supabase
                .from('responses')
                .update({ status: 'terminate' })
                .eq('id', res_id)

            redirect(`/terminate?response_id=${res_id}`)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full flex flex-col items-center">
                {/* Brand Logo */}
                <div className="mb-8 hover:scale-105 transition-transform duration-300">
                    <a href="http://opinioninsights.in/" target="_blank" rel="noopener noreferrer">
                        <BrandLogo
                            className="h-16 w-auto drop-shadow-sm"
                            fallbackClassName="text-2xl font-black text-indigo-900 tracking-tighter uppercase"
                        />
                    </a>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Quick Verification</h1>
                        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                            Please provide your details to continue to the survey. This helps us ensure you're a good fit for this research.
                        </p>
                    </div>

                    <form action={handleQualification} className="space-y-6">
                        <input type="hidden" name="response_id" value={response_id} />

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">How old are you?</label>
                            <input
                                type="number"
                                name="age"
                                required
                                min="1"
                                max="120"
                                placeholder="Enter your age"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Your Country</label>
                            <select
                                name="country"
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium appearance-none"
                            >
                                <option value="">Select your country...</option>
                                <option value="US">United States</option>
                                <option value="UK">United Kingdom</option>
                                <option value="CA">Canada</option>
                                <option value="IN">India</option>
                                <option value="AU">Australia</option>
                                <option value="Global">Other / Global</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all font-inter mt-2"
                        >
                            Continue to Survey
                        </button>
                    </form>

                    <p className="text-center text-[10px] text-gray-400 mt-8 font-medium">
                        By continuing, you agree to our terms of service and privacy policy.
                        No sensitive personal data is stored.
                    </p>
                </div>
            </div>
        </div>
    )
}
