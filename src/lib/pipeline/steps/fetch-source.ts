/**
 * Step: Fetch source content — pages, images, Pinterest pins.
 * Handles: Pinterest oEmbed, uploaded images, direct image URLs.
 * Populates: extractedImageBase64, extractedImageUrl, dataSources, pinterestData
 */

import type { PipelineStep } from '../types';
import { withTimeout } from '../helpers';
import { isPinterestPin, fetchPinterestOembed, downloadImageAsBase64 } from '@/lib/pinterest';
import { isImageUrlSafe } from '@/lib/url-safety';

export const fetchSourceStep: PipelineStep = {
  id: 'fetch-source',
  label: 'Загрузка источника',

  async run(ctx) {
    const aid = ctx.analysisId;

    // ── Pinterest oEmbed ──
    if (ctx.pinterestSource && ctx.hasUrls) {
      ctx.send({
        type: 'progress',
        step: 'pinterest',
        message: 'Получаю данные пина из Pinterest...',
        progress: 0.06,
        analysisId: aid,
      });

      for (const url of ctx.urls) {
        if (isPinterestPin(url)) {
          try {
            const pinData = await withTimeout(fetchPinterestOembed(url), 8000, 'Pinterest oEmbed');
            console.log(
              '[pinterest] oEmbed result:',
              pinData ? `OK (title: ${pinData.title})` : 'NULL',
            );
            if (pinData) {
              ctx.pinterestData = {
                title: pinData.title,
                authorName: pinData.authorName,
                thumbnailUrl: pinData.thumbnailUrl,
              };
              if (pinData.thumbnailUrl) {
                ctx.send({
                  type: 'progress',
                  step: 'pinterest',
                  message: `Скачиваю обложку: ${pinData.title || 'пин'}...`,
                  progress: 0.1,
                  analysisId: aid,
                });
                const imgBase64 = await withTimeout(
                  downloadImageAsBase64(pinData.thumbnailUrl),
                  15000,
                  'Pinterest image',
                );
                if (imgBase64) {
                  ctx.extractedImageBase64 = imgBase64;
                  ctx.extractedImageUrl = pinData.thumbnailUrl;
                  ctx.dataSources.push('pinterest');
                }
              }
            }
          } catch (e) {
            console.warn('[pinterest] Failed:', e);
          }
          break;
        }
      }
    }

    // ── Uploaded image ──
    if (ctx.hasImageUpload && ctx.imageBase64) {
      ctx.send({
        type: 'progress',
        step: 'upload',
        message: 'Изображение загружено, начинаю анализ...',
        progress: 0.1,
        analysisId: aid,
      });
      ctx.extractedImageBase64 = ctx.imageBase64;
      ctx.dataSources.push('image_upload');
    }

    // ── Direct image URL ──
    if (!ctx.extractedImageBase64 && ctx.hasUrls && !ctx.pinterestSource) {
      const firstUrl = ctx.urls[0];
      const isImageUrl = /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(firstUrl);
      if (isImageUrl && isImageUrlSafe(firstUrl)) {
        ctx.send({
          type: 'progress',
          step: 'downloading_image',
          message: 'Скачиваю изображение по URL...',
          progress: 0.1,
          analysisId: aid,
        });
        try {
          const imgBase64 = await withTimeout(
            downloadImageAsBase64(firstUrl),
            15000,
            'Image download',
          );
          if (imgBase64) {
            ctx.extractedImageBase64 = imgBase64;
            ctx.extractedImageUrl = firstUrl;
            ctx.dataSources.push('image_url');
          }
        } catch (e) {
          console.warn('[image] Download failed:', e);
        }
      }
    }
  },
};
