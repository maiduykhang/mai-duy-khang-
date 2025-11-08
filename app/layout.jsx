import './globals.css';
import SupabaseProvider from '@/lib/supabase-provider';

export const metadata = {
  title: 'WorkHub - Trung tâm việc làm & tuyển dụng',
  description: 'Nền tảng tìm kiếm việc làm và đăng tin tuyển dụng hàng đầu Việt Nam.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="bg-gray-100">
        <SupabaseProvider>
          {/* Header/Navbar can be added here */}
          <main>{children}</main>
          {/* Footer can be added here */}
        </SupabaseProvider>
      </body>
    </html>
  );
}
