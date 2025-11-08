'use client';
import { useRealtimeJobs } from '@/lib/supabase-realtime';
import JobCard from '@/components/JobCard';

export default function JobsPage() {
  const { jobs, loading } = useRealtimeJobs();

  if (loading) {
    return (
      <main className="container mx-auto p-6 text-center">
        <p className="text-gray-600">Đang tải danh sách việc làm...</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Việc làm mới nhất</h1>
      
      {jobs && jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Chưa có tin tuyển dụng</h2>
            <p className="text-gray-500 mt-2">Hiện tại chưa có công việc nào được đăng. Vui lòng quay lại sau.</p>
        </div>
      )}
    </main>
  );
}
