import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) return NextResponse.json({ error: "База данных недоступна" }, { status: 503 });

  const { id } = await params;

  try {
    const analysis = await db.analysis.findUnique({ where: { id } });

    if (!analysis) {
      return NextResponse.json({ error: "Анализ не найден" }, { status: 404 });
    }

    return NextResponse.json({
      id: analysis.id,
      urls: JSON.parse(analysis.urls),
      result: analysis.result ? JSON.parse(analysis.result) : null,
      status: analysis.status,
      error: analysis.error,
      createdAt: analysis.createdAt,
    });
  } catch (error) {
    console.error("Failed to fetch analysis:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить анализ" },
      { status: 500 }
    );
  }
}