/*
You never call createClient again anywhere else. Just import supabase from  
this file every time you need to talk to the database.
It acts as the bridge between your React code and your Supabase project.


createClient() call and this file is the connection which will play a part
in authentication.
*/

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // no OAuth redirect flow needed for a desktop app
  },
})