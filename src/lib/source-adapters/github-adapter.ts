/**
 * GitHub Adapter — handles GitHub repository URLs.
 *
 * Fetch strategy: Use GitHub API (unauthenticated) to get README,
 * file tree, tech stack, and basic repo metadata.
 *
 * URL pattern: github.com/<owner>/<repo>
 * API limit: 60 requests/hour (unauthenticated)
 */

import type { SourceAdapter, FetchContext, FetchResult } from './types';
import { withTimeout } from '@/lib/pipeline/helpers';

export class GitHubAdapter implements SourceAdapter {
  readonly type = 'github' as const;
  readonly label = 'GitHub Repository';
  readonly canFetchHtml = false;
  readonly canExtractRsc = false;
  readonly hasMultiplePages = true;
  readonly hasSourceCode = true;
  readonly category = 'code' as const;

  async fetch(ctx: FetchContext): Promise<FetchResult> {
    const url = ctx.urls[0];
    if (!url) {
      return { images: [], metadata: { title: 'GitHub Repo' } };
    }

    // Parse owner/repo from URL
    const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoMatch) {
      return { images: [], metadata: { title: 'GitHub Repo', originalUrl: url } };
    }

    const owner = repoMatch[1];
    const repo = repoMatch[2].replace(/\.git$/, '').replace(/\/$/, '');

    try {
      // Fetch repo info + README + file tree in parallel
      const [repoInfo, readmeContent, treeResult] = (await Promise.allSettled([
        this.fetchJson(`https://api.github.com/repos/${owner}/${repo}`),
        this.fetchText(`https://api.github.com/repos/${owner}/${repo}/readme`, {
          Accept: 'application/vnd.github.raw+json',
        }),
        this.fetchJson(`https://api.github.com/repos/${owner}/${repo}/git/trees/main`),
      ])) as [
        PromiseSettledResult<Record<string, unknown> | null>,
        PromiseSettledResult<string>,
        PromiseSettledResult<Record<string, unknown> | null>,
      ];

      const repoData = repoInfo.status === 'fulfilled' ? repoInfo.value : null;
      const readme = readmeContent.status === 'fulfilled' ? readmeContent.value : '';
      const tree = treeResult.status === 'fulfilled' ? treeResult.value : null;

      // Build file tree string
      let fileTree = '';
      if (tree && tree.tree) {
        fileTree = (tree.tree as Array<{ path: string; type: string }>)
          .map((f) => `${f.type === 'tree' ? '📁' : '📄'} ${f.path}`)
          .join('\n');
      }

      // Detect tech stack from file tree
      const techStack = this.detectTechStack(tree, readme);

      // Extract topics
      const topics: string[] = Array.isArray(repoData?.topics) ? (repoData.topics as string[]) : [];

      // Derive metadata fields with proper typing
      const repoName = (repoData?.full_name as string) || `${owner}/${repo}`;
      const repoOwner = (repoData?.owner as Record<string, string>)?.login || owner;
      const repoOwnerUrl =
        (repoData?.owner as Record<string, string>)?.html_url || `https://github.com/${owner}`;
      const repoDescription = (repoData?.description as string) || '';

      // Build source code string for analysis
      const sourceCode = [
        `# ${repoName}`,
        repoDescription ? `\n${repoDescription}` : '',
        readme ? `\n---\n## README\n\n${readme.substring(0, 30000)}` : '',
        fileTree ? `\n---\n## File Tree\n\n${fileTree}` : '',
        topics.length > 0 ? `\n---\n## Topics: ${topics.join(', ')}` : '',
      ].join('');

      return {
        images: [],
        sourceCode,
        sourceCodeLanguage: 'markdown',
        metadata: {
          title: repoName,
          author: repoOwner,
          authorUrl: repoOwnerUrl,
          description: repoDescription,
          originalUrl: url,
          extra: {
            stars: repoData?.stargazers_count,
            forks: repoData?.forks_count,
            language: repoData?.language as string | undefined,
            topics,
            techStack,
            fileTree,
            homepage: repoData?.homepage || null,
          },
        },
      };
    } catch (e) {
      console.warn('[github-adapter] Fetch failed:', e);
      return {
        images: [],
        metadata: { title: 'GitHub Repo', originalUrl: url },
      };
    }
  }

  extraSteps() {
    return [];
  }

  /** Fetch JSON from GitHub API with timeout */
  private async fetchJson(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<Record<string, unknown> | null> {
    try {
      const res = await withTimeout(
        fetch(url, {
          headers: { Accept: 'application/vnd.github.v3+json', ...headers },
          signal: AbortSignal.timeout(15000),
        }),
        15000,
        'github-api',
      );
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('[github-adapter] API call failed:', url, e);
      return null;
    }
  }

  /** Fetch text from GitHub API with timeout */
  private async fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
    try {
      const res = await withTimeout(
        fetch(url, {
          headers: { Accept: 'application/vnd.github.raw+json', ...headers },
          signal: AbortSignal.timeout(15000),
        }),
        15000,
        'github-api-text',
      );
      if (!res.ok) return '';
      return await res.text();
    } catch (e) {
      console.warn('[github-adapter] Text API call failed:', url, e);
      return '';
    }
  }

  /** Detect tech stack from file tree and README content */
  private detectTechStack(tree: Record<string, unknown> | null, readme: string): string[] {
    const stack: string[] = [];
    if (!tree?.tree) return stack;

    const files = (tree.tree as Array<{ path: string }>).map((f) => f.path.toLowerCase());

    if (files.some((f) => f.includes('package.json'))) stack.push('Node.js/JavaScript');
    if (files.some((f) => f.includes('bun.lockb') || f.includes('bun.lock'))) stack.push('Bun');
    if (files.some((f) => f === 'requirements.txt' || f.includes('pyproject.toml')))
      stack.push('Python');
    if (files.some((f) => f.includes('go.mod'))) stack.push('Go');
    if (files.some((f) => f.includes('cargo.toml'))) stack.push('Rust');
    if (files.some((f) => f.includes('pom.xml') || f.includes('build.gradle'))) stack.push('Java');
    if (
      files.some((f) => f === 'next.config.js' || f === 'next.config.ts' || f === 'next.config.mjs')
    )
      stack.push('Next.js');
    if (files.some((f) => f === 'tailwind.config.js' || f === 'tailwind.config.ts'))
      stack.push('Tailwind CSS');
    if (files.some((f) => f === 'tsconfig.json')) stack.push('TypeScript');
    if (files.some((f) => f === 'vite.config.ts' || f === 'vite.config.js')) stack.push('Vite');
    if (files.some((f) => f.includes('docker-compose'))) stack.push('Docker');

    if (readme) {
      if (readme.includes('React') && !stack.includes('Next.js')) stack.push('React');
      if (readme.includes('Vue')) stack.push('Vue');
      if (readme.includes('Angular')) stack.push('Angular');
      if (readme.includes('PostgreSQL')) stack.push('PostgreSQL');
      if (readme.includes('MongoDB') || readme.includes('Mongo')) stack.push('MongoDB');
      if (readme.includes('Redis')) stack.push('Redis');
    }

    return [...new Set(stack)];
  }
}
