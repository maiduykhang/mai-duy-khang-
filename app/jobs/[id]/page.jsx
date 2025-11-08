'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getJobById } from '@/lib/supabase-data';

// --- Helper Components & Functions ---

const LocationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
);

const SalaryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 004.998 0V7.151c.22.071.409.164.567.267C15.483 8.048 16 9.138 16 10.5c0 1.657-1.343 3-3 3s-3-1.343-3-3c0-1.362.517-2.452 1.433-3.082z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
    </svg>
);

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} năm trước`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} tháng trước`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} ngày trước`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} giờ trước`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} phút trước`;
  return "Vừa xong";
}

// --- Main Page Component ---

export default function JobDetailPage({ params }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!params.id) {
          setError('Job ID is missing.');
          setLoading(false);
          return;
      };
      
      setLoading(true);
      setError(null);
      const { job: jobData, error: fetchError } = await getJobById(params.id);
      
      if (fetchError) {
        console.error('Error fetching job:', fetchError);
        setError('Không thể tải thông tin việc làm. Vui lòng thử lại.');
      } else {
        setJob(jobData);
      }
      
      setLoading(false);
    };

    fetchJob();
  }, [params.id]);

  if (loading) {
    return <div className="text-center p-10 text-gray-600">Đang tải chi tiết việc làm...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-600 bg-red-50 rounded-lg">{error}</div>;
  }

  if (!job) {
    return <div className="text-center p-10 text-gray-700 bg-gray-50 rounded-lg">Không tìm thấy việc làm này.</div>;
  }
  
  const logoUrl = job.employer?.raw_user_meta_data?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=e0f2fe&color=0284c7&bold=true`;

  return (
    <main className="container mx-auto p-4 sm:p-6">
       <div className="mb-6">
         <Link href="/jobs" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Quay lại danh sách
         </Link>
       </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <img src={logoUrl} alt={`${job.company} logo`} className="w-20 h-20 object-contain rounded-md border p-1 bg-white flex-shrink-0"/>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{job.title}</h1>
            <h2 className="text-lg font-semibold text-blue-700">{job.company}</h2>
            <p className="text-sm text-gray-500 mt-1">Đăng {timeAgo(job.created_at)}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left/Main Column */}
          <div className="lg:col-span-2 space-y-8">
             <section>
                <h3 className="text-xl font-bold text-gray-900 mb-4 border-b-2 pb-2">Mô tả công việc</h3>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {job.description || 'Chưa có mô tả.'}
                </div>
            </section>
            {/* Future sections for requirements, benefits can be added here */}
          </div>

          {/* Right/Sidebar Column */}
          <aside className="lg:col-span-1">
            <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100 space-y-4 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 text-center">Thông tin</h3>
               <div className="space-y-3 pt-2">
                 <div className="flex items-start">
                    <SalaryIcon/>
                    <div>
                        <p className="text-sm text-gray-600">Mức lương</p>
                        <p className="font-bold text-green-600 text-base">{job.salary_range || 'Thỏa thuận'}</p>
                    </div>
                 </div>
                 <div className="flex items-start">
                    <LocationIcon/>
                     <div>
                        <p className="text-sm text-gray-600">Địa điểm làm việc</p>
                        <p className="font-semibold text-gray-800">{job.location}</p>
                    </div>
                 </div>
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 2l7.997 3.884A2 2 0 0119 7.816V12a2 2 0 01-2 2h-1v3.232c0 .998-.89 1.83-1.926 1.699l-2.92-0.388A1 1 0 0110.29 18H9.71a1 1 0 01-.864-.853l-2.92 0.388C4.89 17.062 4 16.23 4 15.232V14H3a2 2 0 01-2-2V7.816a2 2 0 01.997-1.932zM14 6L10 4 6 6v6h8V6z" /></svg>
                     <div>
                        <p className="text-sm text-gray-600">Địa điểm phỏng vấn</p>
                        <p className="font-semibold text-gray-800">{job.interview_address}</p>
                    </div>
                 </div>
               </div>
               <div className="pt-4">
                  <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Ứng tuyển ngay
                  </button>
               </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}