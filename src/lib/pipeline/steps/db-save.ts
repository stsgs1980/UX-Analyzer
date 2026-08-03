/**
 * Step: Save analysis results to database.
 * Updates the existing DB record (created before pipeline starts).
 */

import type { PipelineStep } from '../types';
import { db } from '@/lib/db';
import { dbSafe } from '../helpers';

export const dbSaveStep: PipelineStep = {
  id: 'db-save',
  label: 'Сохранение',

  async run(ctx) {
    ctx.send({
      type: 'progress',
      step: 'saving',
      message: 'Сохраняю результаты в базу...',
      progress: 0.93,
      analysisId: ctx.analysisId,
    });

    if (!db || !ctx.analysisId || !ctx.analysisResult) {
      return;
    }

    await dbSafe(() =>
      db!.analysis.update({
        where: { id: ctx.analysisId! },
        data: {
          result: JSON.stringify(ctx.analysisResult),
          status: 'completed',
          imageUrl: ctx.extractedImageUrl || null,
          designMd: ctx.designMdContent || null,
        },
      }),
    );
  },
};
