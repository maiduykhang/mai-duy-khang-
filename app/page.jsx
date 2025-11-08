'use client';
import AuthButton from '@/components/AuthButton';
import { useSupabase } from '@/lib/supabase-provider';

export default function HomePage() {
  const { session } = useSupabase();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">WorkHub</h1>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          Tìm kiếm cơ hội, phát triển sự nghiệp
        </h2>
        <p className="mt-4 text-lg text-gray-600">
          Nền tảng tuyển dụng thông minh dành cho bạn.
        </p>
        
        {session && (
          <div className="mt-8">
            <p className="text-lg">
              Chào mừng trở lại, <span className="font-semibold">{session.user.email}</span>!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
