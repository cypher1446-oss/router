'use client'

import { useState } from 'react'
import { flushResponsesAction } from '@/app/actions'
import { useRouter } from 'next/navigation'

export default function ResponseMaintenance() {
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const router = useRouter()

    const handleExportAll = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/responses/export')
            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `FULL-DB-BACKUP-${new Date().toISOString().split('T')[0]}.xlsx`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error(error)
            alert('Failed to export data')
        } finally {
            setLoading(false)
        }
    }

    const handleFlush = async () => {
        setLoading(true)
        try {
            const result = await flushResponsesAction()
            if (result.success) {
                alert('Database flushed successfully!')
                setShowConfirm(false)
                router.refresh()
            } else {
                throw new Error(result.error?.message || 'Flush failed')
            }
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="mt-12 p-8 bg-white rounded-3xl border-2 border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">Database Maintenance</h2>
                    <p className="text-sm text-slate-500 max-w-md">
                        Manage your storage by exporting full backups and clearing old tracking data.
                    </p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={handleExportAll}
                        disabled={loading}
                        className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                    >
                        Export FULL Database (Excel)
                    </button>

                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={loading}
                        className="px-6 py-2.5 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl hover:bg-rose-100 transition-all border border-rose-100 disabled:opacity-50"
                    >
                        Flush All Responses
                    </button>
                </div>
            </div>

            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Are you absolutely sure?</h3>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            This will permanently delete **ALL** response tracking data. This action cannot be undone. We recommend exporting a full backup first.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFlush}
                                disabled={loading}
                                className="flex-1 px-4 py-3 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
                            >
                                {loading ? 'Flushing...' : 'Yes, Delete All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
