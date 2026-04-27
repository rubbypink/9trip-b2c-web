import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { CartProvider } from '@/lib/cart';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { SITE, SITE_DESCRIPTION, SITE_KEYWORDS } from '@/lib/constants';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

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
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col bg-white text-gray-900">
				<AuthWrapper>
					<CartProvider>
						<Header />
						<main className="flex-1">{children}</main>
						<Footer />
					</CartProvider>
				</AuthWrapper>
			</body>
		</html>
	);
}
