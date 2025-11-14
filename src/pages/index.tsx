import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold">Trang Tuyển Dụng</h1>
      <p>Chào mừng đến với hệ thống tuyển dụng</p>
      <div className="mt-4">
        <Link href="/jobs" className="bg-blue-500 text-white px-4 py-2 rounded">
          Xem việc làm
        </Link>
        <Link href="/admin/login" className="ml-2 bg-green-500 text-white px-4 py-2 rounded">
          Admin
        </Link>
      </div>
    </div>
  )
}
