import LandingResultLayout from '@/components/LandingResultLayout'
import { getLandingPageData } from '@/lib/landingService'
import { redirect } from 'next/navigation'

export const dynamic = "force-dynamic"

export default async function SecurityTerminatePage(props: {
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

    const title = (params.title as string) || "ERROR!"
    const desc = (params.desc as string) || "Security Validation Failed: Access Denied"

    return (
        <LandingResultLayout
            title={title}
            description={desc}
            type="dark"
            uid={data.uid}
            code={data.code}
            ip={data.ip}
            status={data.isTest ? 'Security Terminate (Test)' : ((params.status as string) || 'Access Denied')}
        />
    )
}
