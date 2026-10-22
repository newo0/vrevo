import { getPlots } from "@/lib/site";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(
      { plots: await getPlots() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Не удалось загрузить актуальные статусы" },
      { status: 503 },
    );
  }
}
