import LandingResultLayout from '@/components/LandingResultLayout'
import { getLandingPageData } from '@/lib/landingService'

export const dynamic = "force-dynamic"

export default async function PausedPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await props.searchParams
    const { headers } = await import('next/headers')
    const headerList = await headers()

    const data = await getLandingPageData(params, {
        headers: { get: (name: string) => headerList.get(name) }
    } as any);

    // Title/desc may come directly from the redirect (e.g., COUNTRY UNAVAILABLE)
    const titleParam = (params.title as string) || ''
    const descParam = (params.desc as string) || ''

    let title = titleParam || 'SORRY!'
    let desc = descParam
    let statusLabel = 'Paused'

    if (!data.isPaused && data.isTest) {
        // Unknown project - just show test mode info
        title = titleParam || 'TEST MODE'
        desc = descParam || 'Project not found in tool. Viewing as Test.'
        statusLabel = 'Test Mode'
    } else if (data.pausedReason === 'country_paused') {
        desc = descParam || 'This Country is Currently Paused'
    } else if (data.isPaused) {
        desc = descParam || 'This Project is Currently Paused'
    }

    return (
        <LandingResultLayout
            title={title}
            description={desc}
            type="secondary"
            uid={data.uid}
            code={data.code}
            status={statusLabel}
            ip={data.ip}
        />
    )
}
