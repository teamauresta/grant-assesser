import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // legacy/ holds the old single-file app, kept for reference only.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'legacy/**', 'next-env.d.ts']),
]);

export default eslintConfig;
