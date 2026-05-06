import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
	...nextVitals,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
		// Functions backend — not a Next.js app
		'functions/**',
		// Scripts — development only
		'src/scripts/**',
	]),
	{
		rules: {
			// Warn on console usage in app/components (use logger instead)
			'no-console': ['warn', { allow: ['error'] }],
		},
		files: ['src/app/**/*.js', 'src/components/**/*.jsx', 'src/lib/**/*.js'],
	},
]);

export default eslintConfig;
