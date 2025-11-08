'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase-provider';

export function useRealtimeJobs() {
  const { supabase } = useSupabase();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        employer:employer_id (
          raw_user_meta_data
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
    return data || [];
  }, [supabase]);

  useEffect(() => {
    const getInitialData = async () => {
      setLoading(true);
      const initialJobs = await fetchJobs();
      setJobs(initialJobs);
      setLoading(false);
    };

    getInitialData();

    const channel = supabase
      .channel('realtime-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        async (payload) => {
          const updatedJobs = await fetchJobs();
          setJobs(updatedJobs);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchJobs]);

  return { jobs, loading };
}