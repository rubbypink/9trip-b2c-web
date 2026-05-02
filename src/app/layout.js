import { Geist_Mono, Roboto } from 'next/font/google';
import '../styles/globals.css';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { CartProvider } from '@/lib/cart';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FloatButtonGroup from '@/components/shared/FloatButtonGroup';
import BackToTop from '@/components/shared/BackToTop';
import { SITE, SITE_DESCRIPTION, SITE_KEYWORDS } from '@/lib/constants';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['vietnamese', 'latin'],
  display: 'swap',
  variable: '--font-roboto',
});

const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata = {
	title: `${SITE.name} — ${SITE.tagline}`,
	description: SITE_DESCRIPTION,
	keywords: SITE_KEYWORDS,
	openGraph: {
		title: `${SITE.name} — ${SITE.tagline}`,
		description: SITE_DESCRIPTION,
		type: 'website',
		locale: 'vi_VN',
		siteName: SITE.name,
		url: SITE.url,
	},
};

export default function RootLayout({ children }) {
	return (
		<html
			lang="vi"
			className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col bg-white text-gray-900">
				<AuthWrapper>
					<CartProvider>
						<Header />
						<main className="flex-1">{children}</main>
						<Footer />
						<FloatButtonGroup />
						<BackToTop />
					</CartProvider>
				</AuthWrapper>
			</body>
		</html>
	);
}
