// Supabase-Admin-Client für Server-API-Routes (Service-Role-Key, niemals im Client verwenden!)
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // ACHTUNG: Niemals im Client verwenden!
  );
}
