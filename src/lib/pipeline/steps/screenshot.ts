/**
 * Step: Capture screenshot if no image available yet.
 * Populates: extractedImageBase64, extractedImageUrl, dataSources
 */

import type { PipelineStep } from '../types';
import { captureScreenshot } from '@/lib/screenshot';

export const screenshotStep: PipelineStep = {
  id: 'screenshot',
  label: 'Скриншот',

  async run(ctx) {
    // Skip if: already have image, adapter can't fetch HTML, or visual-only adapter
    if (ctx.extractedImageBase64 || !ctx.hasUrls || !ctx.urls[0] || !ctx.adapter.canFetchHtml) {
      return;
    }

    const firstUrl = ctx.urls[0];
    console.log('[screenshot] Trying to capture:', firstUrl);
    const ss = await captureScreenshot(firstUrl);
    if (ss) {
      ctx.extractedImageBase64 = ss.base64;
      ctx.extractedImageUrl = firstUrl;
      ctx.dataSources.push('screenshot');
      console.log('[screenshot] Captured via', ss.source);
    }
  },
};
