// Per-row normalization for snapshot fields, ported from
// supabase/migrations/0010..0015. The institucion slug-dedup (0016) is a
// two-pass step exposed separately as `slugDedupInstituciones`.

import { normalizeArea } from "./area";
import { normalizeCategoria } from "./categoria";
import { normalizeDependencia } from "./dependencia";
import { normalizeEntidad } from "./entidad";
import { normalizeInstitucion, slugDedupInstituciones } from "./institucion";
import { normalizeNivel } from "./nivel";
import { normalizePais } from "./pais";

export interface NormalizableSnapshot {
  nivel: string | null;
  categoria: string | null;
  area_conocimiento: string | null;
  institucion: string | null;
  dependencia: string | null;
  entidad: string | null;
  pais: string | null;
}

/** Apply per-row normalization. Mutates and returns the same object. */
export function normalizeSnapshot<T extends NormalizableSnapshot>(row: T): T {
  row.nivel = normalizeNivel(row.nivel);
  row.categoria = normalizeCategoria(row.categoria);
  row.area_conocimiento = normalizeArea(row.area_conocimiento);
  row.institucion = normalizeInstitucion(row.institucion);
  row.dependencia = normalizeDependencia(row.dependencia);
  row.entidad = normalizeEntidad(row.entidad);
  row.pais = normalizePais(row.pais);
  return row;
}

export { slugDedupInstituciones };
