import { NextRequest } from "next/server";
import { getProgress } from "@/lib/progress-store";
import { db } from "@/lib/db";
import { dbSafe } from "@/lib/pipeline/helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const progress = getProgress(id);

  // If entry exists in progress store, return it directly
  if (progress) {
    return Response.json(progress);
  }

  // Fallback: check DB for completed analyses
  if (db) {
    const analysis = await dbSafe(() =>
      db!.analysis.findUnique({ where: { id } })
    );
    if (analysis) {
      return Response.json({
        analysisId: analysis.id,
        status: analysis.status,
        progress: analysis.status === "completed" ? 1 : 0,
        step: analysis.status === "completed" ? "done" : analysis.status,
        message: analysis.status === "completed" ? "Анализ завершён" : analysis.error || "Обработка...",
        result: analysis.result ? JSON.parse(analysis.result) : null,
        designMd: analysis.designMd || null,
        error: analysis.error || null,
        updatedAt: analysis.createdAt ? new Date(analysis.createdAt).getTime() : Date.now(),
      });
    }
  }

  return Response.json(
    { analysisId: id, status: "error", error: "Анализ не найден" },
    { status: 404 }
  );
}
