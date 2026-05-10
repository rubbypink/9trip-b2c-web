'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Calendar, Heart, Star, LogOut, Menu, X, ChevronRight, CircleUserRound, Images } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
	{ href: '/account/profile', label: 'Thông tin cá nhân', icon: User },
	{ href: '/account/bookings', label: 'Đơn hàng của tôi', icon: Calendar },
	{ href: '/account/wishlist', label: 'Danh sách yêu thích', icon: Heart },
	{ href: '/account/reviews', label: 'Đánh giá của tôi', icon: Star },
];

const IMAGES_STUDIO_EMAILS = ['tranthuaanh90@gmail.com', '9tripphuquoc@gmail.com'];

/**
 * Account sidebar navigation with mobile overlay support.
 */
export default function AccountSidebar() {
	const pathname = usePathname();
	const { profile, user, logout } = useAuth();
	const [mobileOpen, setMobileOpen] = useState(false);

	const displayName = profile?.displayName || user?.displayName || 'Người dùng';
	const email = profile?.email || user?.email || '';
	const avatar = profile?.avatar || user?.photoURL || null;

	const normalizedEmail = email?.toLowerCase?.() || '';
	const showImagesStudio = IMAGES_STUDIO_EMAILS.includes(normalizedEmail);

	function handleLogout() {
		setMobileOpen(false);
		logout();
	}

	function closeMobile() {
		setMobileOpen(false);
	}

	const sidebarContent = (
		<div className="flex flex-col h-full">
			{/* Profile quick info */}
			<div className="p-5 border-b border-border">
				<div className="flex items-center gap-3">
					{avatar ? (
						<img
							src={avatar}
							alt={displayName}
							className="h-10 w-10 rounded-full object-cover ring-2 ring-orange-100"
						/>
					) : (
						<div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
							<CircleUserRound className="h-6 w-6 text-orange-600" />
						</div>
					)}
					<div className="min-w-0">
						<p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
						{email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
					</div>
				</div>
			</div>

			{/* Navigation */}
			<nav className="flex-1 p-3 space-y-1 overflow-y-auto">
				{NAV_ITEMS.map((item) => {
					const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
					const Icon = item.icon;
					return (
						<Link
							key={item.href}
							href={item.href}
							onClick={closeMobile}
							className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
								isActive ? 'bg-orange-50 text-orange-600' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
							}`}
						>
							<Icon className="h-5 w-5 shrink-0" />
							<span>{item.label}</span>
							{isActive && <ChevronRight className="h-4 w-4 ml-auto text-orange-400" />}
						</Link>
					);
				})}
				{showImagesStudio && (
					<a
						href="https://studio.9tripphuquoc.com"
						target="_blank"
						rel="noopener noreferrer"
						onClick={closeMobile}
						className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 w-100 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
					>
						<Images className="h-5 w-5 shrink-0" />
						<span>Images Studio</span>
						<ChevronRight className="h-4 w-4 ml-auto opacity-0" />
					</a>
				)}
			</nav>

			{/* Logout */}
			<div className="p-3 border-t border-border">
				<button
					type="button"
					onClick={handleLogout}
					className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
				>
					<LogOut className="h-5 w-5 shrink-0" />
					<span>Đăng xuất</span>
				</button>
			</div>
		</div>
	);

	return (
		<>
			{/* Mobile toggle button */}
			<button
				type="button"
				onClick={() => setMobileOpen(true)}
				className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card shadow-md border border-border text-muted-foreground hover:text-orange-600 transition-colors"
				aria-label="Mở menu tài khoản"
			>
				<Menu className="h-5 w-5" />
			</button>

			{/* Desktop sidebar */}
			<aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 bg-card border-r border-border shadow-sm">{sidebarContent}</aside>

			{/* Mobile overlay */}
			{mobileOpen && (
				<div className="lg:hidden fixed inset-0 z-40">
					{/* Backdrop */}
					<div
						className="fixed inset-0 bg-black/40 transition-opacity"
						onClick={closeMobile}
						aria-hidden="true"
					/>
					{/* Panel */}
					<aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card shadow-xl z-50 flex flex-col animate-slide-in-left">
						<div className="flex items-center justify-between p-4 border-b border-border">
							<span className="text-sm font-semibold text-foreground">Tài khoản</span>
							<button
								type="button"
								onClick={closeMobile}
								className="p-1.5 rounded-lg text-muted-foreground hover:text-muted-foreground hover:bg-surface-1 transition-colors"
								aria-label="Đóng menu"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						{sidebarContent}
					</aside>
				</div>
			)}
		</>
	);
}
