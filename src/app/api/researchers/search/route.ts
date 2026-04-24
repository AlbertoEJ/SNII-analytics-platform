import { NextResponse } from "next/server";
import { container } from "@/lib/container";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });

  const result = await container().searchResearchers.execute({
    query: q,
    limit: 8,
    offset: 0,
  });

  return NextResponse.json({
    items: result.items.map((r) => ({
      cvu: r.cvu,
      nombre: r.nombre,
      nivel: r.nivel,
      area: r.areaConocimiento,
      entidad: r.entidadFinal ?? r.entidadAcreditacion,
    })),
    total: result.total,
  });
}
