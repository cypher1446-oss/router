import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side client (Async, for use in Server Components & Route Handlers)
// NOTE: This uses the anon key and respects RLS. 
// With the move to simple admin login, this might be less used for admin operations,
// but kept for any public/user facing features if they exist.
export async function createSessionClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        throw new Error('Supabase configuration is missing.')
    }

    const cookieStore = await cookies()

    return createServerClient(url, key, {
        cookies: {
            getAll() {
                return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options)
                    })
                } catch (error) {
                    // Ignored in Server Components
                }
            },
        },
    })
}

// ADMIN Client - Bypasses RLS
// Uses the SERVICE_ROLE_KEY to have full access.
// IMPORTANT: Use this only for operations authorized by the simple admin check.
export async function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        console.error('Supabase ADMIN Error: Missing configuration', {
            hasUrl: !!url,
            hasKey: !!key,
            keyType: typeof key,
            keyLength: key ? key.length : 0,
            keyPrefix: key ? key.substring(0, 10) : 'none'
        })
        throw new Error(`Supabase SERVICE ROLE missing! URL: ${!!url}, Key: ${!!key}`)
    }

    // Using basic supabase-js client as we don't need auth session handling for the service role
    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    })
}
