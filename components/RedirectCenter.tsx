'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/lib/types'

interface RedirectCenterProps {
    projects: (Project & { client_name: string })[]
}

export default function RedirectCenter({ projects }: RedirectCenterProps) {
    const [baseUrl, setBaseUrl] = useState('')
    const [copiedLink, setCopiedLink] = useState<string | null>(null)

    useEffect(() => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        const calculatedBaseUrl = appUrl
            ? (appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl)
            : (typeof window !== 'undefined' ? window.location.origin : '')

        setBaseUrl(calculatedBaseUrl)
    }, [])

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedLink(id)
            setTimeout(() => setCopiedLink(null), 2000)
        } catch (err) {
            console.error('Copy failed:', err)
        }
    }

    const generateLinks = (code: string) => [
        { label: 'Entry Router Link', url: `${baseUrl}/track?code=${code}&uid=[UID]`, id: `${code}-entry` },
        { label: 'Complete Callback', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=complete`, id: `${code}-complete` },
        { label: 'Terminate Callback', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=terminate`, id: `${code}-terminate` },
        { label: 'Quota Callback', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=quota`, id: `${code}-quota` },
        { label: 'Duplicate String Callback', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=duplicate_string`, id: `${code}-dup-str` },
        { label: 'Duplicate IP Callback', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=duplicate_ip`, id: `${code}-dup-ip` },
        { label: 'Security Terminate Callback', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=security_terminate`, id: `${code}-sec-term` },
    ]

    return (
        <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Redirect & Callback Center</h2>
                    <p className="text-slate-500 text-sm">Unified links for vendors and tracking partners.</p>
                </div>
                <div className="px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Link Center</span>
                </div>
            </div>

            <div className="space-y-4">
                {projects.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 italic text-sm">
                        No projects available. Create a project to see routing links.
                    </div>
                ) : (
                    projects.map((project) => (
                        <div key={project.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <details className="group">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-open:bg-indigo-50 group-open:text-indigo-600 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826L10.242 9.172a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102 1.101" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{project.project_code}</h3>
                                            <p className="text-xs text-slate-400">{project.client_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${project.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                                            }`}>
                                            {project.status}
                                        </span>
                                        <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </summary>
                                <div className="px-5 pb-5 pt-2 border-t border-slate-50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {generateLinks(project.project_code).map((link) => (
                                            <div key={link.id} className="relative group/link">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                                    {link.label}
                                                </label>
                                                <div className="flex">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={link.url}
                                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-l-xl px-3 py-2 text-xs font-mono text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
                                                    />
                                                    <button
                                                        onClick={() => copyToClipboard(link.url, link.id)}
                                                        className={`px-4 py-2 rounded-r-xl border-y border-r transition-all text-xs font-bold ${copiedLink === link.id
                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                            : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                                                            }`}
                                                    >
                                                        {copiedLink === link.id ? 'Copied' : 'Copy'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </details>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
