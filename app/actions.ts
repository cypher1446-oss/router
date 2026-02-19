'use server'

import { createAdminClient } from '@/lib/supabase-server'
import { Project, Client } from '@/lib/types'
import { dashboardService } from '@/lib/dashboardService'

export async function createClientAction(name: string): Promise<{ data: Client | null; error: any }> {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('clients')
        .insert([{ name }])
        .select()
        .single()
    return { data, error }
}

export async function flushResponsesAction(): Promise<{ success: boolean; error: any }> {
    const { error } = await dashboardService.flushResponses()
    if (error) return { success: false, error }
    return { success: true, error: null }
}

export async function deleteClientAction(id: string): Promise<{ error: any }> {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
    return { error }
}

export async function createProjectAction(formData: any, countryUrls: any[] = []): Promise<{ data: Project | null; error: any }> {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('projects')
        .insert([{
            ...formData,
            is_multi_country: countryUrls.length > 0,
            country_urls: countryUrls,
            status: 'active'
        }])
        .select()
        .single()
    return { data, error }
}

export async function updateProjectStatusAction(id: string, status: 'active' | 'paused'): Promise<{ error: any }> {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', id)
    return { error }
}

export async function updateProjectAction(id: string, data: any): Promise<{ error: any }> {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('projects')
        .update({
            ...data,
            // Ensure status isn't accidentally overwritten if not provided
            // and mapping is_multi_country based on links presence if passed
        })
        .eq('id', id)
    return { error }
}

export async function updateCountryActiveAction(
    projectId: string,
    countryCode: string,
    active: boolean
): Promise<{ error: any }> {
    const supabase = await createAdminClient()

    // Fetch current country_urls
    const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('country_urls')
        .eq('id', projectId)
        .single()

    if (fetchError || !project) return { error: fetchError || 'Project not found' }

    const updatedUrls = (project.country_urls as any[]).map((c: any) =>
        c.country_code === countryCode ? { ...c, active } : c
    )

    const { error } = await supabase
        .from('projects')
        .update({ country_urls: updatedUrls })
        .eq('id', projectId)

    return { error }
}
