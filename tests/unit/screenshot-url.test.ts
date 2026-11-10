import { describe, it, expect } from 'bun:test';
import { buildThumIoUrl } from '@/lib/screenshot';

describe('buildThumIoUrl', () => {
  it('keeps the target URL unencoded (thum.io rejects encoded slashes)', () => {
    const url = buildThumIoUrl('https://example.com/page');
    expect(url).toBe('https://image.thum.io/get/width/1280/crop/800/https://example.com/page');
    expect(url).not.toContain('%2F');
  });

  it('does not percent-encode the scheme separator', () => {
    const url = buildThumIoUrl('https://linear.app/');
    expect(url).toContain('https://linear.app/');
    expect(url).not.toContain('%3A');
  });
});
