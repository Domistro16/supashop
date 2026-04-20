import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.warn(
    '[supabaseStorage] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing — uploads will fail.',
  );
}

export const supabaseStorage = createClient(url || '', serviceKey || '', {
  auth: { persistSession: false },
});

export const PROOF_BUCKET = process.env.SUPABASE_PROOF_BUCKET || 'proof-of-payment';
