import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// This client uses the service role key to bypass RLS.
// Only use it in admin screens — never expose it to candidate or voter flows.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
