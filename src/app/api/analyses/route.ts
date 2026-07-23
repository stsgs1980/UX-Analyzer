import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  if (!db) return NextResponse.json([]);

  try {
    const analyses = await db.analysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Deduplicate: keep only the latest analysis per unique URL set
    const seen = new Map<string, (typeof analyses)[0]>();
    for (const a of analyses) {
      try {
        const urls: string[] = JSON.parse(a.urls);
        const key = [...urls].sort().join("::");
        if (!seen.has(key)) {
          seen.set(key, a);
        }
      } catch {
        // skip malformed
      }
    }

    const deduped = Array.from(seen.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    return NextResponse.json(
      deduped.map((a) => ({
        id: a.id,
        urls: JSON.parse(a.urls),
        status: a.status,
        error: a.error,
        createdAt: a.createdAt,
        hasResult: !!a.result,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch analyses:", error);
    return NextResponse.json([]);
  }
}

export async function DELETE(request: NextRequest) {
  if (!db) return NextResponse.json({ success: false, error: "База данных недоступна" }, { status: 503 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      await db.analysis.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const count = await db.analysis.deleteMany({});
    return NextResponse.json({ success: true, deleted: count.count });
  } catch (error) {
    console.error("Failed to delete analysis:", error);
    return NextResponse.json(
      { error: "Не удалось удалить" },
      { status: 500 }
    );
  }
}