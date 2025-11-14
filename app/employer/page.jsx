import Link from 'next/link';

export default function EmployerDashboard() {
  return (
    <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Employer Dashboard</h1>
        <p>Đây là khu vực dành cho nhà tuyển dụng.</p>
        <div className="mt-4">
            <Link href="/employer/post-job" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition">
                Đăng tin tuyển dụng mới
            </Link>
        </div>
        {/* Job management table will be here */}
    </div>
  );
}
