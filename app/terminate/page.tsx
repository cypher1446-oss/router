import LandingResultLayout from '@/components/LandingResultLayout'
import { getLandingPageData } from '@/lib/landingService'
import { redirect } from 'next/navigation'

export const dynamic = "force-dynamic"

export default async function TerminatePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await props.searchParams
    const { headers } = await import('next/headers')
    const headerList = await headers()

    const data = await getLandingPageData(params, {
        headers: { get: (name: string) => headerList.get(name) }
    } as any);

    if (data.isPaused && !data.isTest) {
        redirect(`/paused?code=${data.code}&uid=${data.uid}&ip=${data.ip}`)
    }

    const title = (params.title as string) || "SORRY!"
    const desc = (params.desc as string) || "The link you are looking for is TERMINATED"

    return (
        <LandingResultLayout
            title={title}
            description={desc}
            type="error"
            uid={data.uid}
            code={data.code}
            ip={data.ip}
            status={data.isTest ? 'Terminate (Test)' : ((params.status as string) || 'Terminate')}
        />
    )
}
