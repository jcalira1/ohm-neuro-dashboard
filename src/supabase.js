import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pzmppudonakuglgdjzzm.supabase.co'
const supabaseKey = 'sb_publishable_Cg1gAH_sDrp0kyqDrflMZg_zkqdn--7'

export const supabase = createClient(supabaseUrl, supabaseKey)