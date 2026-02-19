import { NextRequest } from "next/server";
import { createAdminClient } from "./supabase-server";
import { getClientIp } from "./getClientIp";

export async function getLandingPageData(
    params: { [key: string]: string | string[] | undefined },
    request: NextRequest
) {
    const code = (params.code as string) || (params.pid as string) || "N/A";
    const uid = (params.uid as string) || "N/A";
    const ip = (params.ip as string) || getClientIp(request);
    const countryParam = (params.country as string) || (params.c as string);

    // Default data
    const result = {
        code,
        uid,
        ip,
        project: null as any,
        isPaused: false,
        isTest: params.is_test === 'true',
        pausedReason: '' as 'project_paused' | 'country_paused' | 'invalid_project' | ''
    };

    if (code !== "N/A") {
        const supabase = await createAdminClient();
        const { data: project } = await supabase
            .from('projects')
            .select('*')
            .eq('project_code', code)
            .maybeSingle();

        if (project) {
            result.project = project;
            result.code = project.project_code || code;

            // Check project-level pause
            if (project.status === 'paused') {
                result.isPaused = true;
                result.pausedReason = 'project_paused';
            }
            // Check country-level pause
            else if (countryParam && project.is_multi_country) {
                const countryConfig = (project.country_urls as any[] || []).find(c => c.country_code === countryParam);
                if (countryConfig && countryConfig.active === false) {
                    result.isPaused = true;
                    result.pausedReason = 'country_paused';
                }
            }
        } else {
            // Not in our tool
            result.isTest = true;
            result.isPaused = false;
        }
    }

    return result;
}
