import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client with service_role. Använd ENDAST i API-routes
 * för att skapa användare med lösenord (admin.createUser). Exponera aldrig
 * SUPABASE_SERVICE_ROLE_KEY i klienten.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY måste sättas för att skapa användare.");
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
