'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-server'
import bcrypt from 'bcrypt'

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
        const supabase = await createAdminClient()

        // Fetch admin user
        const { data: admin, error: dbError } = await supabase
            .from('admins')
            .select('password_hash')
            .eq('email', email)
            .single()

        if (dbError || !admin) {
            return { error: 'Invalid credentials' }
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, admin.password_hash)

        if (passwordMatch) {
            const cookieStore = await cookies()

            // Set a simple auth cookie
            cookieStore.set('admin_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            })

            return { success: true }
        }
    } catch (err) {
        console.error('Login error:', err)
        return { error: 'Authentication service unavailable' }
    }

    return { error: 'Invalid credentials' }
}

export async function logoutAction() {
    const cookieStore = await cookies()
    cookieStore.delete('admin_session')
    return { success: true }
}
