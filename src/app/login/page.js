'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, loginWithGoogle, loginWithFacebook } from '@/lib/firebase/auth';
import { useAuth } from '@/lib/auth';
import FirebaseErrorHandler from '@/components/common/FirebaseErrorHandler';

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirect = searchParams.get('redirect') || '/';
	const { user, loading: authLoading } = useAuth();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [socialLoading, setSocialLoading] = useState(null); // "google" | "facebook"

	// Nếu đã đăng nhập thì tự động chuyển hướng
	useEffect(() => {
		if (!authLoading && user) {
			router.replace(redirect);
		}
	}, [user, authLoading, router, redirect]);

	async function handleEmailLogin(e) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			await loginWithEmail(email, password);
			router.replace(redirect);
		} catch (err) {
			setError(err);
		} finally {
			setLoading(false);
		}
	}

	async function handleSocialLogin(provider) {
		setError(null);
		setSocialLoading(provider);
		try {
			const loginFn = provider === 'google' ? loginWithGoogle : loginWithFacebook;
			await loginFn();
			router.replace(redirect);
		} catch (err) {
			setError(err);
		} finally {
			setSocialLoading(null);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
			<div className="w-full max-w-md">
				<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
					{/* Header */}
					<div className="text-center mb-8">
						<h1 className="text-2xl font-bold text-slate-800">Đăng nhập</h1>
						<p className="text-slate-500 mt-1 text-sm">Chào mừng bạn trở lại!</p>
					</div>

					{/* Error */}
					{error && (
						<FirebaseErrorHandler
							error={error}
							onRetry={() => setError(null)}
						/>
					)}

					{/* Email Form */}
					<form
						onSubmit={handleEmailLogin}
						className="space-y-4"
					>
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-slate-700 mb-1"
							>
								Email
							</label>
							<input
								id="email"
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-sm"
								placeholder="your@email.com"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-slate-700 mb-1"
							>
								Mật khẩu
							</label>
							<input
								id="password"
								type="password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-sm"
								placeholder="••••••••"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-semibold rounded-xl transition text-sm"
						>
							{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
						</button>
					</form>

					{/* Divider */}
					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-slate-200" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-3 bg-white text-slate-400">hoặc</span>
						</div>
					</div>

					{/* Social Buttons */}
					<div className="space-y-3">
						<button
							type="button"
							onClick={() => handleSocialLogin('google')}
							disabled={!!socialLoading}
							className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition text-sm font-medium text-slate-700"
						>
							<svg
								className="w-5 h-5"
								viewBox="0 0 24 24"
							>
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							{socialLoading === 'google' ? 'Đang xử lý...' : 'Tiếp tục với Google'}
						</button>

						<button
							type="button"
							onClick={() => handleSocialLogin('facebook')}
							disabled={!!socialLoading}
							className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition text-sm font-medium text-slate-700"
						>
							<svg
								className="w-5 h-5"
								viewBox="0 0 24 24"
							>
								<path
									fill="#1877F2"
									d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
								/>
							</svg>
							{socialLoading === 'facebook' ? 'Đang xử lý...' : 'Tiếp tục với Facebook'}
						</button>
					</div>

					{/* Register Link */}
					<p className="text-center text-sm text-slate-500 mt-6">
						Chưa có tài khoản?{' '}
						<Link
							href={`/register?redirect=${encodeURIComponent(redirect)}`}
							className="text-orange-600 hover:text-orange-700 font-semibold"
						>
							Đăng ký ngay
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center">
					<div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
				</div>
			}
		>
			<LoginForm />
		</Suspense>
	);
}
