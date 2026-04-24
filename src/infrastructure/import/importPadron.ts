/**
 * One-shot importer for Padron SNII enero 2026.
 * Reads the Excel file, normalizes rows, and bulk-inserts into snii.researchers.
 *
 * Usage:
 *   npx tsx src/infrastructure/import/importPadron.ts <path-to-xlsx>
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_FILE = "C:/Users/alber/Documents/Padron_enero_2026.xlsx";
const BATCH_SIZE = 500;

type Row = Record<string, unknown>;

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "SIN INFORMACION" || s === "NO APLICA") return null;
  return s;
}

function toDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function mapRow(r: Row) {
  const cvuRaw = r["CVU"];
  const cvu = typeof cvuRaw === "number" ? cvuRaw : Number.parseInt(String(cvuRaw ?? ""), 10);
  if (!Number.isFinite(cvu)) return null;
  return {
    cvu,
    nombre: clean(r["NOMBRE DEL INVESTIGADOR"]) ?? "",
    nivel: clean(r["NIVEL"]),
    categoria: clean(r["CATEGORIA"]),
    fecha_inicio_vigencia: toDate(r["FECHA INICIO DE VIGENCIA"]),
    fecha_fin_vigencia: toDate(r["FECHA FIN DE VIGENCIA"]),
    area_conocimiento: clean(r["AREA DE CONOCIMIENTO"]),
    disciplina: clean(r["DISCIPLINA"]),
    subdisciplina: clean(r["SUBDISCIPLINA"]),
    especialidad: clean(r["ESPECIALIDAD"]),
    cpi_s: clean(r["CENTRO PUBLICO DE INVESTIGACION SECIHTI (CPI-S)"]),
    institucion_acreditacion: clean(r["INSTITUCION DE ACREDITACION"]),
    dependencia_acreditacion: clean(r["DEPENDENCIA DE ACREDITACION"]),
    subdependencia_acreditacion: clean(r["SUBDEPENDENCIA DE ACREDITACION"]),
    departamento_acreditacion: clean(r["DEPARTAMENTO DE ACREDITACION"]),
    entidad_acreditacion: clean(r["ENTIDAD DE ACREDITACION"]),
    posdoc_invest_por_mexico: clean(r["POSDOCTORADO/ INVESTIGADORES POR MEXICO"]),
    institucion_comision: clean(r["INSTITUCION DE COMISION"]),
    dependencia_comision: clean(r["DEPENDENCIA DE COMISION"]),
    ubicacion_comision: clean(r["UBICACION DE COMISION"]),
    institucion_final: clean(r["INSTITUCION FINAL"]),
    entidad_final: clean(r["ENTIDAD FINAL"]),
    notas: clean(r["NOTAS"]),
  };
}

async function main() {
  const file = resolve(process.argv[2] ?? DEFAULT_FILE);
  console.log(`Reading ${file}`);
  const wb = XLSX.read(readFileSync(file), { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null });
  console.log(`Parsed ${rows.length} rows`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supa = createClient(url, key, {
    db: { schema: "snii" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const mapped = rows.map(mapRow).filter((r): r is NonNullable<ReturnType<typeof mapRow>> => r !== null);
  console.log(`Mapped ${mapped.length} valid rows; skipped ${rows.length - mapped.length}`);

  let inserted = 0;
  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);
    const { error } = await supa.from("researchers").upsert(batch, { onConflict: "cvu" });
    if (error) {
      console.error(`Batch ${i}-${i + batch.length} failed:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    if (inserted % 5000 === 0 || inserted === mapped.length) {
      console.log(`  upserted ${inserted}/${mapped.length}`);
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
