import './globals.css';

export const metadata = {
  title: 'WorkHub - Trung tâm việc làm Việt Nam',
  description: 'Nền tảng tìm kiếm việc làm và tuyển dụng hàng đầu Việt Nam. An toàn, hiệu quả, và cập nhật thời gian thực.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
