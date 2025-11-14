import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-800">WorkHub</h1>
        <p className="mt-3 text-lg text-gray-600">
          Chào mừng đến với Trung tâm việc làm Việt Nam
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/jobs" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition">
            Xem việc làm
          </Link>
          <Link href="/admin" className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition">
            Admin Dashboard
          </Link>
           <Link href="/login" className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition">
            Đăng nhập
          </Link>
        </div>
      </div>
    </main>
  );
}
