/** @type {import('next').NextConfig} */
const nextConfig = {
	/* config options here */
	reactCompiler: true,
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'firebasestorage.googleapis.com',
			},
			{
				protocol: 'https',
				hostname: '**.firebasestorage.googleapis.com',
			},
			{
				protocol: 'https',
				hostname: '**.googleapis.com',
			},
		],
	},
};

export default nextConfig;
