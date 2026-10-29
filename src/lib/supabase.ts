
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabaseConfigMissing =
  !supabaseUrl || !supabasePublishableKey

export const supabase = !supabaseConfigMissing
  ? createClient(supabaseUrl!, supabasePublishableKey!)
  : null
