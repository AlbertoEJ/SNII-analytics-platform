import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { detectEra, type Era } from "./eraDetection";
import { HEADER_MAPS, pickField } from "./headerMaps";
import { resolveIdentities, type RawTuple } from "./identityResolution";
import { normalizeName } from "./normalizeName";

const HISTORIC_DIR_DEFAULT = "C:/Users/alber/Documents/Historico SNII";
const PADRON_2026_DEFAULT = "C:/Users/alber/Documents/Padron_enero_2026.xlsx";
const BATCH = 1000;

interface FileSpec { year: number; path: string; era: Era; }
type Row = Record<string, unknown>;

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "SIN INFORMACION" || s === "NO APLICA" || s === "-") return null;
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
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
}

function inferYearFromFilename(filename: string): number | null {
  const m = filename.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function readRows(path: string): { headers: string[]; rows: Row[] } {
  const wb = XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
  // Pick the sheet with the most rows (handles multi-sheet workbooks like 2022/2023/2024).
  let bestSheet = wb.Sheets[wb.SheetNames[0]];
  let bestCount = 0;
  for (const name of wb.SheetNames) {
    const s = wb.Sheets[name];
    const r = XLSX.utils.sheet_to_json<Row>(s, { defval: null });
    if (r.length > bestCount) { bestCount = r.length; bestSheet = s; }
  }
  const rows = XLSX.utils.sheet_to_json<Row>(bestSheet, { defval: null });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

async function main() {
  const historicDir = process.argv[2] ?? HISTORIC_DIR_DEFAULT;
  const padron2026 = process.argv[3] ?? PADRON_2026_DEFAULT;

  // Discover files.
  const files: FileSpec[] = [];
  for (const f of readdirSync(historicDir)) {
    if (!/^Investigadores_vigentes_\d{4}/.test(f)) continue;
    const year = inferYearFromFilename(f);
    if (year == null) continue;
    const path = join(historicDir, f);
    const { headers } = readRows(path);
    files.push({ year, path, era: detectEra(headers) });
  }
  // Add 2026 padron.
  if (padron2026) {
    const { headers } = readRows(padron2026);
    files.push({ year: 2026, path: padron2026, era: detectEra(headers) });
  }
  files.sort((a, b) => a.year - b.year);
  console.log(`Discovered ${files.length} files: ${files.map((f) => f.year).join(", ")}`);

  // Pass 1: read every row, build raw tuples + remember mapped fields per (idx).
  const tuples: RawTuple[] = [];
  type MappedRow = {
    year: number;
    sourceFile: string;
    nivel: string | null;
    categoria: string | null;
    area_conocimiento: string | null;
    disciplina: string | null;
    subdisciplina: string | null;
    especialidad: string | null;
    institucion: string | null;
    dependencia: string | null;
    entidad: string | null;
    pais: string | null;
    fecha_inicio_vigencia: string | null;
    fecha_fin_vigencia: string | null;
  };
  const mapped: MappedRow[] = [];

  for (const f of files) {
    const { rows } = readRows(f.path);
    const m = HEADER_MAPS[f.era];
    let kept = 0;
    for (const r of rows) {
      const cvu = clean(pickField(r, m.cvu));
      const expediente = clean(pickField(r, m.expediente));
      if (!cvu && !expediente) continue;
      const name = clean(pickField(r, m.nombre)) ?? "";
      tuples.push({ year: f.year, name, cvu: cvu ?? undefined, expediente: expediente ?? undefined });
      mapped.push({
        year: f.year,
        sourceFile: basename(f.path),
        nivel: clean(pickField(r, m.nivel)),
        categoria: clean(pickField(r, m.categoria)),
        area_conocimiento: clean(pickField(r, m.area_conocimiento)),
        disciplina: clean(pickField(r, m.disciplina)),
        subdisciplina: clean(pickField(r, m.subdisciplina)),
        especialidad: clean(pickField(r, m.especialidad)),
        institucion: clean(pickField(r, m.institucion)),
        dependencia: clean(pickField(r, m.dependencia)),
        entidad: clean(pickField(r, m.entidad)),
        pais: clean(pickField(r, m.pais)),
        fecha_inicio_vigencia: toDate(pickField(r, m.fecha_inicio_vigencia)),
        fecha_fin_vigencia: toDate(pickField(r, m.fecha_fin_vigencia)),
      });
      kept++;
    }
    console.log(`  ${f.year} (${f.era}): ${kept} rows`);
  }

  console.log(`\nTotal raw tuples: ${tuples.length}`);
  const { identities, snapshotMap } = resolveIdentities(tuples);
  console.log(`Resolved ${identities.length} identities, ${snapshotMap.size} snapshot mappings`);
  const ambiguous = identities.filter((i) => i.ambiguous).length;
  console.log(`Ambiguous: ${ambiguous}`);

  // Build final snapshot rows. Dedup on (canonical_id, year) — pick the last
  // mapped row for that pair (later files override earlier ones if a researcher
  // appears in two files for the same year).
  type SnapshotRow = MappedRow & { canonical_id: number };
  const snapByKey = new Map<string, SnapshotRow>();
  tuples.forEach((t, idx) => {
    const id = snapshotMap.get(`${idx}|${t.year}|${t.cvu ?? ""}|${t.expediente ?? ""}`);
    if (id == null) return;
    const m = mapped[idx];
    snapByKey.set(`${id}|${t.year}`, { ...m, canonical_id: id });
  });
  const snapshots = Array.from(snapByKey.values());
  console.log(`Final snapshots: ${snapshots.length}`);

  // Connect to Supabase.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supa = createClient(url, key, {
    db: { schema: "snii" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // TRUNCATE both tables (snapshots first because of FK).
  console.log("Truncating researcher_snapshots and researchers…");
  {
    const { error } = await supa.rpc("truncate_v2_tables");
    if (error) {
      // Fallback: use raw delete if the RPC isn't defined.
      await supa.from("researcher_snapshots").delete().neq("year", -1);
      await supa.from("researchers").delete().neq("canonical_id", -1);
    }
  }

  // Insert identities.
  for (let i = 0; i < identities.length; i += BATCH) {
    const batch = identities.slice(i, i + BATCH).map((id) => ({
      canonical_id: id.canonicalId,
      cvu: id.cvu,
      expedientes: id.expedientes,
      canonical_name: id.canonicalName || normalizeName(""),
      name_variants: id.nameVariants,
      ambiguous: id.ambiguous,
      ambiguity_note: id.ambiguityNote,
      first_year: id.firstYear,
      last_year: id.lastYear,
    }));
    const { error } = await supa.from("researchers").insert(batch);
    if (error) { console.error(error); process.exit(1); }
    if ((i + batch.length) % 5000 === 0 || i + batch.length === identities.length) {
      console.log(`  identities ${i + batch.length}/${identities.length}`);
    }
  }

  // Insert snapshots.
  for (let i = 0; i < snapshots.length; i += BATCH) {
    const batch = snapshots.slice(i, i + BATCH).map((s) => ({
      canonical_id: s.canonical_id,
      year: s.year,
      nivel: s.nivel,
      categoria: s.categoria,
      area_conocimiento: s.area_conocimiento,
      disciplina: s.disciplina,
      subdisciplina: s.subdisciplina,
      especialidad: s.especialidad,
      institucion: s.institucion,
      dependencia: s.dependencia,
      entidad: s.entidad,
      pais: s.pais,
      fecha_inicio_vigencia: s.fecha_inicio_vigencia,
      fecha_fin_vigencia: s.fecha_fin_vigencia,
      source_file: s.sourceFile,
    }));
    const { error } = await supa.from("researcher_snapshots").insert(batch);
    if (error) { console.error(error); process.exit(1); }
    if ((i + batch.length) % 10000 === 0 || i + batch.length === snapshots.length) {
      console.log(`  snapshots ${i + batch.length}/${snapshots.length}`);
    }
  }

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
