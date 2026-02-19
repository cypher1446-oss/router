import LandingResultLayout from '@/components/LandingResultLayout'
import { getLandingPageData } from '@/lib/landingService'
import { redirect } from 'next/navigation'

export const dynamic = "force-dynamic"

export default async function CompletePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await props.searchParams
    const { headers } = await import('next/headers')
    const headerList = await headers()

    const data = await getLandingPageData(params, {
        headers: { get: (name: string) => headerList.get(name) }
    } as any);

    // Only redirect to paused if it's a real project AND it's paused
    if (data.isPaused && !data.isTest) {
        const country = (params.country as string) || (params.c as string) || ''
        redirect(`/paused?code=${data.code}&uid=${data.uid}&ip=${data.ip}${country ? `&country=${country}` : ''}&desc=${encodeURIComponent(data.pausedReason === 'country_paused' ? 'This Country is Currently Paused' : 'This Project is Currently Paused')}`)
    }

    const title = (params.title as string) || "THANK YOU!"
    const desc = (params.desc as string) || "Survey Completed Successfully"

    return (
        <LandingResultLayout
            title={title}
            description={desc}
            type="success"
            uid={data.uid}
            code={data.code}
            ip={data.ip}
            status={data.isTest ? 'Complete (Test)' : ((params.status as string) || 'Complete')}
        />
    )
}
