import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-10 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
        Tìm kiếm cơ hội, phát triển sự nghiệp
      </h1>
      <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
        Chào mừng đến với WorkHub. Nền tảng tuyển dụng thông minh, kết nối nhà tuyển dụng uy tín với những ứng viên tài năng.
      </p>
      <div className="mt-8">
        <Link
          href="/jobs"
          className="bg-blue-600 text-white px-8 py-3 rounded-md font-semibold text-lg hover:bg-blue-700 transition-colors"
        >
          Xem tất cả việc làm
        </Link>
      </div>
    </div>
  );
}
