/*
You never call createClient again anywhere else. Just import supabase from  
this file every time you need to talk to the database.
It acts as the bridge between your React code and your Supabase project.
*/

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)