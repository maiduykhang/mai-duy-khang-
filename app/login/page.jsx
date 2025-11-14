'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      let response;
      if (isSignUp) {
        response = await supabase.auth.signUp({ email, password });
      } else {
        response = await supabase.auth.signInWithPassword({ email, password });
      }

      if (response.error) throw response.error;
      
      alert(isSignUp ? 'Kiểm tra email của bạn để xác thực tài khoản!' : 'Đăng nhập thành công!');
      window.location.href = '/';

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">{isSignUp ? 'Đăng ký' : 'Đăng nhập'}</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
          <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            {isSignUp ? 'Đăng ký' : 'Đăng nhập'}
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-sm text-center text-blue-600 hover:underline">
          {isSignUp ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
        </button>
      </div>
    </div>
  );
}
