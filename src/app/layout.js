import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { CartProvider } from '@/lib/cart';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata = {
	title: '9 Trip — Đặt Tour & Khách Sạn Trực Tuyến',
	description: 'Nền tảng đặt Tour du lịch, Khách sạn, Hoạt động trải nghiệm và Thuê xe hàng đầu Việt Nam. Giá tốt nhất, hỗ trợ 24/7.',
	keywords: 'tour du lịch, đặt khách sạn, travel, booking, việt nam',
	openGraph: { title: '9 Trip — Đặt Tour & Khách Sạn Trực Tuyến', description: 'Nền tảng đặt Tour du lịch, Khách sạn hàng đầu Việt Nam.', type: 'website', locale: 'vi_VN' },
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
