'use client';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client.
// It's safe to use public keys in client-side code when Row Level Security is enabled.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Fetches a single job by its ID from the Supabase database.
 * @param {string} id - The UUID of the job to fetch.
 * @returns {Promise<{ job: object | null, error: object | null }>}
 */
export async function getJobById(id) {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      employer:employer_id (
        email,
        raw_user_meta_data
      )
    `)
    .eq('id', id)
    .single(); // Use .single() to get one record or null if not found.

  return { job: data, error };
}
