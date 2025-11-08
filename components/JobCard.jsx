'use client';

import Link from 'next/link';

// Helper function to format date into a "time ago" string
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

const LocationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
);

const SalaryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 004.998 0V7.151c.22.071.409.164.567.267C15.483 8.048 16 9.138 16 10.5c0 1.657-1.343 3-3 3s-3-1.343-3-3c0-1.362.517-2.452 1.433-3.082z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
    </svg>
);

export default function JobCard({ job }) {
  // Use a placeholder avatar for the logo, generated from company name.
  const logoUrl = job.employer?.raw_user_meta_data?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=e0f2fe&color=0284c7&bold=true`;
  
  return (
    <Link href={`/jobs/${job.id}`} passHref legacyBehavior>
      <a className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col justify-between overflow-hidden border cursor-pointer h-full group">
        <div>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <img 
                  src={logoUrl} 
                  alt={`${job.company} logo`} 
                  className="w-14 h-14 object-contain rounded-md border p-1 bg-white flex-shrink-0" 
                />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 leading-tight group-hover:text-blue-600 text-base line-clamp-2">
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-700 font-semibold truncate">{job.company}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-800">
              <p className="flex items-start">
                <LocationIcon />
                <span className="line-clamp-1">{job.location}</span>
              </p>
              <p className="flex items-center">
                <SalaryIcon />
                <span className="font-semibold text-green-600">{job.salary_range || 'Thỏa thuận'}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3 border-t flex justify-end items-center text-xs text-gray-500">
          <span>{timeAgo(job.created_at)}</span>
        </div>
      </a>
    </Link>
  );
}
