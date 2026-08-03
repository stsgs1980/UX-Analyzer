import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import unicodePolicy from './eslint-rules/unicode-policy.js';

const eslintConfig = [
  // ── Base: Next.js core-web-vitals + TypeScript ──
  ...nextCoreWebVitals,
  ...nextTypescript,

  // ── TypeScript / React / Next.js overrides ──
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/no-unused-disable-directive': 'off',

      // React
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/purity': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react-compiler/react-compiler': 'off',

      // Next.js
      '@next/next/no-img-element': 'off',
      '@next/next/no-html-link-for-pages': 'off',

      // General
      'prefer-const': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      'no-empty': 'off',
      'no-irregular-whitespace': 'off',
      'no-case-declarations': 'off',
      'no-fallthrough': 'off',
      'no-mixed-spaces-and-tabs': 'off',
      'no-redeclare': 'off',
      'no-undef': 'off',
      'no-unreachable': 'off',
      'no-useless-escape': 'off',
    },
  },

  // ── File ignores ──
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'examples/**',
      'skills',
      'upload/**',
      'eslint-rules/**',
      'eslint-processors/**',
    ],
  },

  // ── Source files: emoji/unicode policy ──
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    plugins: {
      'unicode-policy': unicodePolicy,
    },
    rules: {
      'unicode-policy/emoji': 'warn',
      'unicode-policy/unicode-graphics': 'warn',
    },
  },
];

export default eslintConfig;
