import type { SniiLevelCode } from "../value-objects/SniiLevel";

export interface Researcher {
  cvu: number;
  nombre: string;
  nivel: SniiLevelCode | null;
  categoria: string | null;
  fechaInicioVigencia: string | null;
  fechaFinVigencia: string | null;
  areaConocimiento: string | null;
  disciplina: string | null;
  subdisciplina: string | null;
  especialidad: string | null;
  cpiS: string | null;
  institucionAcreditacion: string | null;
  dependenciaAcreditacion: string | null;
  subdependenciaAcreditacion: string | null;
  departamentoAcreditacion: string | null;
  entidadAcreditacion: string | null;
  posdocInvestPorMexico: string | null;
  institucionComision: string | null;
  dependenciaComision: string | null;
  ubicacionComision: string | null;
  institucionFinal: string | null;
  entidadFinal: string | null;
  notas: string | null;
}
