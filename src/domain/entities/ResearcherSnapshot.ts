import type { SniiLevelCode } from "../value-objects/SniiLevel";

export interface ResearcherSnapshot {
  canonicalId: number;
  year: number;
  nivel: SniiLevelCode | null;
  categoria: string | null;
  areaConocimiento: string | null;
  disciplina: string | null;
  subdisciplina: string | null;
  especialidad: string | null;
  institucion: string | null;
  dependencia: string | null;
  entidad: string | null;
  pais: string | null;
  fechaInicioVigencia: string | null;
  fechaFinVigencia: string | null;
  sourceFile: string;
}
