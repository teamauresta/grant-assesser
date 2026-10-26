import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // base.jsx is the legacy app; Task 24 moves it into legacy/.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'legacy/**', 'next-env.d.ts', 'base.jsx']),
]);

export default eslintConfig;
