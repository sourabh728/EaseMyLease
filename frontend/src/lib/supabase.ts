import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY',
  )
}

/**
 * Browser Supabase client (publishable key).
 * Use for Storage / hosted DB access — not for app auth (Nest JWT).
 */
export const supabase = createClient(
  supabaseUrl ?? '',
  supabasePublishableKey ?? '',
)
