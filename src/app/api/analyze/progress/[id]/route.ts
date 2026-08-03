import { NextRequest } from "next/server";
import { getProgress } from "@/lib/progress-store";
import { db } from "@/lib/db";

/**
 * GET /api/analyze/progress/[id]
 * Returns current pipeline progress for polling.
 * Once completed, also fetches the full result from DB.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Check in-memory progress store
  const progress = getProgress(id);

  // 2. If completed in memory, also grab extra data from DB (designMd, etc.)
  if (progress?.status === "completed" && progress.result && db) {
    try {
      const dbRecord = await db.analysis.findUnique({ where: { id } });
      if (dbRecord?.designMd && !progress.result.designMd) {
        progress.result = { ...progress.result, designMd: dbRecord.designMd };
        progress.designMd = dbRecord.designMd;
      }
      if (dbRecord?.result) {
        const parsed = JSON.parse(dbRecord.result);
        if (parsed.referenceCode && !progress.referenceCode) {
          progress.referenceCode = parsed.referenceCode;
        }
        if (parsed.rscPayload && !progress.rscPayload) {
          progress.rscPayload = parsed.rscPayload;
        }
      }
    } catch {
      // DB read failed — return what we have from memory
    }
  }

  // 3. If no in-memory entry, check DB directly (server may have restarted)
  if (!progress && db) {
    try {
      const dbRecord = await db.analysis.findUnique({ where: { id } });
      if (!dbRecord) {
        return Response.json({ error: "Анализ не найден" }, { status: 404 });
      }
      if (dbRecord.status === "completed" && dbRecord.result) {
        const result = JSON.parse(dbRecord.result);
        return Response.json({
          step: "done",
          message: "Анализ завершён!",
          progress: 1,
          status: "completed",
          result,
          designMd: dbRecord.designMd || null,
        });
      }
      if (dbRecord.status === "error") {
        return Response.json({
          step: "error",
          message: dbRecord.error || "Ошибка анализа",
          progress: 0,
          status: "error",
          error: dbRecord.error || "Ошибка анализа",
        });
      }
      // Still running but no in-memory entry (server restarted during analysis)
      return Response.json({
        step: "running",
        message: "Анализ выполняется...",
        progress: 0.5,
        status: "running",
      });
    } catch {
      return Response.json({ error: "Ошибка чтения из базы" }, { status: 500 });
    }
  }

  if (!progress) {
    return Response.json({ error: "Анализ не найден" }, { status: 404 });
  }

  return Response.json(progress);
}
