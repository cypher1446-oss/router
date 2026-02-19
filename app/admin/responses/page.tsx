import { dashboardService } from '@/lib/dashboardService'
import ExportResponsesButton from '@/components/ExportResponsesButton'
import ResponseMaintenance from '@/components/ResponseMaintenance'

export const dynamic = 'force-dynamic'

export default async function AdminResponsesPage({
    searchParams,
}: {
    searchParams: Promise<{ ip?: string; status?: string; device_type?: string }>
}) {
    const filters = await searchParams
    const responses = await dashboardService.getResponses(filters)

    // IP Activity Logic for badges - calculate once
    const today = new Date().toDateString()
    const ipCountsToday = responses.reduce((acc: Record<string, number>, r) => {
        const isToday = new Date(r.created_at).toDateString() === today
        if (isToday && r.ip) {
            acc[r.ip] = (acc[r.ip] || 0) + 1
        }
        return acc
    }, {})

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Response Tracking</h1>
                    <p className="text-sm text-slate-500 font-medium">Live logs of all activity across projects.</p>
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <form className="flex flex-1 md:flex-none gap-2">
                        <input
                            type="text"
                            name="ip"
                            placeholder="Filter IP..."
                            defaultValue={filters.ip}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-32"
                        />
                        <select
                            name="status"
                            defaultValue={filters.status || 'all'}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="all">All Status</option>
                            <option value="started">Started</option>
                            <option value="complete">Complete</option>
                            <option value="terminate">Terminate</option>
                            <option value="quota">Quota</option>
                        </select>
                        <select
                            name="device_type"
                            defaultValue={filters.device_type || 'all'}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="all">All Devices</option>
                            <option value="Desktop">Desktop</option>
                            <option value="Mobile">Mobile</option>
                            <option value="Tablet">Tablet</option>
                        </select>
                        <button type="submit" className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-all">
                            Filter
                        </button>
                        {(filters.ip || (filters.status && filters.status !== 'all') || (filters.device_type && filters.device_type !== 'all')) && (
                            <a href="/admin/responses" className="px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-all flex items-center">
                                Clear
                            </a>
                        )}
                    </form>
                    <ExportResponsesButton />
                </div>
            </header>

            <div className="bg-white shadow rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">UID (Original)</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Supplier Token</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Project</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">IP Address</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Device</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">User Agent</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Status</th>

                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {responses.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                        No tracking data matching filters.
                                    </td>
                                </tr>
                            ) : (
                                responses.map((r) => {
                                    const isHighActivity = r.ip && ipCountsToday[r.ip] > 3;
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-mono text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                    {r.uid || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-bold text-indigo-600">
                                                    {r.supplier_token || r.uid || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-medium text-gray-900">{r.project_code}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap lowercase">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center space-x-1">
                                                        <span className="text-[11px] text-gray-500 font-mono">{r.ip}</span>
                                                        {r.geo_country && (
                                                            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded">{r.geo_country}</span>
                                                        )}
                                                    </div>
                                                    {isHighActivity && (
                                                        <span className="text-[8px] font-black uppercase text-rose-600 bg-rose-50 px-1 py-0.5 rounded w-fit border border-rose-100">
                                                            High Activity
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.device_type === 'Mobile' ? 'bg-orange-50 text-orange-600' :
                                                    r.device_type === 'Tablet' ? 'bg-blue-50 text-blue-600' :
                                                        'bg-slate-50 text-slate-600'
                                                    }`}>
                                                    {r.device_type || 'Desktop'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className="text-[10px] text-gray-400 line-clamp-1 max-w-[150px] cursor-help"
                                                    title={r.user_agent}
                                                >
                                                    {(r.user_agent || 'Unknown').substring(0, 80)}
                                                    {(r.user_agent?.length || 0) > 80 ? '...' : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${r.status === 'started' ? 'bg-indigo-50 text-indigo-600' :
                                                    r.status === 'complete' ? 'bg-emerald-50 text-emerald-600' :
                                                        r.status === 'terminate' ? 'bg-rose-50 text-rose-600' :
                                                            r.status === 'security_terminate' ? 'bg-red-600 text-white' :
                                                                'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {r.status}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium" suppressHydrationWarning>
                                                {new Date(r.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-indigo-700 leading-relaxed">
                    <strong>Advanced Monitoring:</strong> High Activity badge indicates IPs with more than 3 hits today. Use filters to audit specific traffic patterns.
                </div>
            </div>

            <ResponseMaintenance />
        </div>
    )
}
