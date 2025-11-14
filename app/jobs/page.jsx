'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function JobsPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (data) setJobs(data);
            setLoading(false);
        };

        fetchJobs();

        const channel = supabase
            .channel('public:jobs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, payload => {
                console.log('Change received!', payload);
                fetchJobs(); // Re-fetch on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Danh sách việc làm</h1>
            {loading ? (
                <p>Đang tải danh sách việc làm...</p>
            ) : jobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map(job => (
                        <div key={job.id} className="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow">
                            <h2 className="text-xl font-bold text-blue-700">{job.title}</h2>
                            <p className="font-semibold text-gray-800">{job.company}</p>
                            <p className="text-gray-600 mt-2">{job.location_city}</p>
                            <p className="text-green-600 font-bold mt-2">
                                {job.salary_min?.toLocaleString()} - {job.salary_max?.toLocaleString()} {job.salary_currency}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p>Hiện chưa có tin tuyển dụng nào.</p>
            )}
        </div>
    );
}
