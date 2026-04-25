import type { Era } from "./eraDetection";

/**
 * For each era, the canonical key → list of source-header candidates
 * (in priority order). The first non-null value is used.
 *
 * Canonical keys correspond to ResearcherSnapshot fields.
 */
export interface HeaderMap {
  cvu: string[];
  expediente: string[];
  nombre: string[];
  nivel: string[];
  categoria: string[];
  area_conocimiento: string[];
  disciplina: string[];
  subdisciplina: string[];
  especialidad: string[];
  institucion: string[];
  dependencia: string[];
  entidad: string[];
  pais: string[];
  fecha_inicio_vigencia: string[];
  fecha_fin_vigencia: string[];
}

const EMPTY: HeaderMap = {
  cvu: [], expediente: [], nombre: [], nivel: [], categoria: [],
  area_conocimiento: [], disciplina: [], subdisciplina: [], especialidad: [],
  institucion: [], dependencia: [], entidad: [], pais: [],
  fecha_inicio_vigencia: [], fecha_fin_vigencia: [],
};

export const HEADER_MAPS: Record<Era, HeaderMap> = {
  early: {
    ...EMPTY,
    expediente: ["EXPEDIENTE"],
    nombre: ["NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR", "NOMBRE DE LA INVESTIGADORA O INVESTIGADOR"],
    nivel: ["NIVEL"],
    area_conocimiento: ["ÁREA DEL CONOCIMIENTO"],
    fecha_inicio_vigencia: ["FECHA DE INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA DE FIN DE VIGENCIA"],
  },
  mid90s: {
    ...EMPTY,
    expediente: ["EXPEDIENTE"],
    nombre: ["NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR", "NOMBRE DE LA INVESTIGADORA O INVESTIGADOR"],
    nivel: ["NIVEL"],
    area_conocimiento: ["ÁREA DEL CONOCIMIENTO"],
    institucion: ["INSTITUCIÓN DE ADSCRIPCIÓN"],
    entidad: ["ENTIDAD FEDERATIVA"],
    pais: ["PAIS"],
    fecha_inicio_vigencia: ["FECHA DE INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA DE FIN DE VIGENCIA"],
  },
  "cvu-era": {
    ...EMPTY,
    cvu: ["CVU (a partir de 2003)", "CVU"],
    expediente: ["EXPEDIENTE"],
    nombre: ["NOMBRE DE LA INVESTIGADORA O INVESTIGADOR", "NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR"],
    nivel: ["NIVEL"],
    area_conocimiento: ["ÁREA DEL CONOCIMIENTO"],
    disciplina: ["DISCIPLINA (a partir de 1991)", "DISCIPLINA"],
    subdisciplina: ["SUBDISCIPLINA (a partir de 1991)", "SUBDISCIPLINA"],
    especialidad: ["ESPECIALIDAD (a partir de 1991)", "ESPECIALIDAD"],
    institucion: ["INSTITUCIÓN DE ADSCRIPCIÓN (a partir de 1990)", "INSTITUCIÓN DE ADSCRIPCIÓN"],
    dependencia: ["DEPENDENCIA (a partir de 1991)", "DEPENDENCIA"],
    entidad: ["ENTIDAD FEDERATIVA ADSCRIPCIÓN\r\n(a partir de 1990)", "ENTIDAD FEDERATIVA"],
    pais: ["PAIS ADSCRIPCIÓN \r\n(a partir de 1990)", "PAIS"],
    fecha_inicio_vigencia: ["FECHA DE INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA DE FIN DE VIGENCIA"],
  },
  "cvu-only": {
    ...EMPTY,
    cvu: ["CVU"],
    nombre: ["NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR"],
    nivel: ["NIVEL"],
    area_conocimiento: ["ÁREA DEL CONOCIMIENTO"],
    disciplina: ["DISCIPLINA"],
    subdisciplina: ["SUBDISCIPLINA"],
    especialidad: ["ESPECIALIDAD"],
    institucion: ["INSTITUCIÓN DE ADSCRIPCIÓN"],
    dependencia: ["DEPENDENCIA"],
    entidad: ["ENTIDAD FEDERATIVA"],
    pais: ["PAIS"],
    fecha_inicio_vigencia: ["FECHA DE INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA DE FIN DE VIGENCIA"],
  },
  "2025": {
    ...EMPTY,
    cvu: ["CVU padrón corregido"],
    nombre: ["NOMBRE DEL INVESTIGADOR"],
    nivel: ["NIVEL"],
    categoria: ["CATEGORIA"],
    area_conocimiento: ["ÁREA DE CONOCIMIENTO"],
    disciplina: ["DISCIPLINA"],
    subdisciplina: ["SUBDISCIPLINA"],
    institucion: ["INSTITUCIÓN DE ACREDITACIÓN"],
    dependencia: ["DEPENDENCIA DE ACREDITACIÓN"],
    entidad: ["ENTIDAD DE ACREDITACIÓN"],
    fecha_inicio_vigencia: ["FECHA INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA FIN DE VIGENCIA"],
  },
  "2026": {
    ...EMPTY,
    cvu: ["CVU"],
    nombre: ["NOMBRE DEL INVESTIGADOR"],
    nivel: ["NIVEL"],
    categoria: ["CATEGORIA"],
    area_conocimiento: ["AREA DE CONOCIMIENTO"],
    disciplina: ["DISCIPLINA"],
    subdisciplina: ["SUBDISCIPLINA"],
    especialidad: ["ESPECIALIDAD"],
    // 2026 collapse: prefer FINAL > COMISION > ACREDITACION.
    institucion: ["INSTITUCION FINAL", "INSTITUCION DE COMISION", "INSTITUCION DE ACREDITACION"],
    dependencia: ["DEPENDENCIA DE COMISION", "DEPENDENCIA DE ACREDITACION"],
    entidad: ["ENTIDAD FINAL", "UBICACION DE COMISION", "ENTIDAD DE ACREDITACION"],
    fecha_inicio_vigencia: ["FECHA INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA FIN DE VIGENCIA"],
  },
};

/** Pick the first non-null value for the given canonical key. */
export function pickField(
  row: Record<string, unknown>,
  candidates: string[],
): unknown {
  for (const c of candidates) {
    if (c in row) {
      const v = row[c];
      if (v !== null && v !== undefined && v !== "" && v !== "-") return v;
    }
  }
  return null;
}
