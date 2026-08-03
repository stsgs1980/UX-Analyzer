// eslint.config.md.mjs -- Markdown-only linting (run via: bun run lint:md)
// Uses the markdown processor + code-block-language + unicode rules.

import unicodePolicy from './eslint-rules/unicode-policy.js';
import codeBlockLanguage from './eslint-rules/code-block-language.js';
import markdownSnippetsProcessor from './eslint-processors/markdown-snippets.js';

const mdConfig = [
  {
    files: ['**/*.md'],
    ignores: ['node_modules/**', '.next/**', 'skills/**', 'upload/**', 'eslint-rules/**', 'eslint-processors/**'],
    processor: markdownSnippetsProcessor,
    plugins: {
      'unicode-policy': unicodePolicy,
      'code-block-language': { rules: { 'missing-language': codeBlockLanguage } },
    },
    rules: {
      'unicode-policy/emoji-in-md': 'warn',
      'unicode-policy/unicode-graphics-in-md': 'warn',
      'code-block-language/missing-language': 'warn',
    },
  },
];

export default mdConfig;
