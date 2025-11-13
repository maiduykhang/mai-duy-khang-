import { ReactNode } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

const Layout = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-20">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            WorkHub
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/jobs" className="text-gray-600 hover:text-blue-600 text-sm font-semibold">
              Việc làm
            </Link>
            {status === 'authenticated' && (session.user.role === 'ADMIN' || session.user.role === 'MODERATOR') && (
              <Link href="/admin/jobs" className="text-gray-600 hover:text-blue-600 text-sm font-semibold">
                Admin
              </Link>
            )}
            {status === 'authenticated' ? (
              <>
                <span className="text-sm text-gray-600 hidden md:block">
                  Chào, {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-gray-600 hover:text-blue-600 text-sm font-semibold"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                href="/admin/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-semibold"
              >
                Đăng nhập Admin
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-white border-t mt-8">
        <div className="container mx-auto px-6 py-4 text-center text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} WorkHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
