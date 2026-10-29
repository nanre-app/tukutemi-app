import './globals.css';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import ImageGuard from '@/components/ImageGuard';

const SITE_URL = 'https://tukutemi-app.vercel.app';
const SITE_TITLE = 'tukutemi';
const SITE_DESCRIPTION =
  'お題の画像をもとに、生成AIでつくった画像を投稿して見せ合うアプリ';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    siteName: SITE_TITLE,
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: '/ogp.png', width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/ogp.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Header />
        <NavDrawer />
        <ImageGuard />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}