import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://opwoaznzlcfxpwtrujse.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wd29hem56bGNmeHB3dHJ1anNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDM4NDgsImV4cCI6MjA5MTgxOTg0OH0.j0JOrrmGP4bm_1jK4onAOsV-7maVfM0AJG8Nw_huS3k'

export const supabase = createClient(supabaseUrl, supabaseKey)