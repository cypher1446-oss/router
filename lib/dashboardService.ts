import { createAdminClient } from '@/lib/supabase-server'
import { KPIStats, ProjectAnalytics, Client, Project } from '@/lib/types'

export const dashboardService = {
    async getProjectAnalytics(clientId?: string): Promise<ProjectAnalytics[]> {
        const supabase = await createAdminClient()
        let query = supabase.rpc('get_project_analytics')
        const { data, error } = await query
        if (error) return []
        return data as ProjectAnalytics[]
    },

    async getClients(): Promise<Client[]> {
        const supabase = await createAdminClient()
        const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
        if (error) return []
        return data as Client[]
    },

    async createClient(name: string): Promise<{ data: Client | null; error: any }> {
        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('clients')
            .insert([{ name }])
            .select()
            .single()
        return { data, error }
    },

    async deleteClient(id: string): Promise<{ error: any }> {
        const supabase = await createAdminClient()
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id)
        return { error }
    },

    async getProjects(): Promise<(Project & { client_name: string })[]> {
        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                clients (
                    name
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching projects:', error)
            return []
        }

        return (data as any[]).map(p => ({
            ...p,
            client_name: p.clients?.name || 'Unknown Client'
        }))
    },

    async createProject(project: any): Promise<{ data: Project | null; error: any }> {
        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('projects')
            .insert([{ ...project, status: 'active' }])
            .select()
            .single()
        return { data, error }
    },

    async updateProjectStatus(id: string, status: 'active' | 'paused'): Promise<{ error: any }> {
        const supabase = await createAdminClient()
        const { error } = await supabase
            .from('projects')
            .update({ status })
            .eq('id', id)
        return { error }
    },

    async deleteProject(id: string): Promise<{ error: any }> {
        const supabase = await createAdminClient()
        const { error: responseError } = await supabase
            .from('responses')
            .delete()
            .eq('project_id', id)
        if (responseError) return { error: responseError }
        const { error: projectError } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)
        return { error: projectError }
    },

    async getKPIs(): Promise<any> {
        const metrics = await this.getProjectHealthMetrics()
        const projects = await this.getProjects()

        const clicks_today = metrics.reduce((sum, m) => sum + (m.clicks_today || 0), 0)
        const completes_today = metrics.reduce((sum, m) => sum + (m.completes_today || 0), 0)
        const duplicates_today = metrics.reduce((sum, m) => sum + (m.duplicates_today || 0), 0)
        const security_terminates_today = metrics.reduce((sum, m) => sum + (m.security_terminates_today || 0), 0)
        const active_projects = projects.filter(p => p.status === 'active').length

        return {
            clicks_today,
            completes_today,
            duplicates_today,
            security_terminates_today,
            active_projects,
            total_projects: projects.length
        }
    },

    async getProjectHealthMetrics(): Promise<any[]> {
        const supabase = await createAdminClient()
        const { data, error } = await supabase.rpc('get_project_health_metrics')
        if (error) return []
        return data
    },

    async getProjectById(id: string): Promise<Project | null> {
        const supabase = await createAdminClient()
        const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
        if (error) return null
        return data as Project
    },

    async updateProject(id: string, project: Partial<Project>): Promise<{ error: any }> {
        const supabase = await createAdminClient()
        const { error } = await supabase.from('projects').update(project).eq('id', id)
        return { error }
    },

    async getResponses(filters?: { ip?: string; status?: string }): Promise<any[]> {
        const supabase = await createAdminClient()
        let query = supabase.from('responses').select('*, projects(project_code)').order('created_at', { ascending: false }).limit(100)
        if (filters?.ip) query = query.ilike('ip', `%${filters.ip}%`)
        if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status)
        const { data, error } = await query
        if (error) return []
        return data.map(r => ({
            ...r,
            project_code: r.projects?.project_code || 'Deleted'
        }))
    },

    async flushResponses(): Promise<{ error: any }> {
        const supabase = await createAdminClient()
        const { error } = await supabase
            .from('responses')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')
        return { error }
    }
}
