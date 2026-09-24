import './globals.css';
import Header from '@/components/Header';

export const metadata = {
  title: 'tukutemi',
  description: 'お題の画像をもとに、生成AIでつくった画像を投稿して見せ合うアプリ',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Header />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}