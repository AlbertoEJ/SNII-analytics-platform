export interface ResearcherIdentity {
  canonicalId: number;
  cvu: number | null;
  expedientes: string[];
  canonicalName: string;
  nameVariants: string[];
  ambiguous: boolean;
  ambiguityNote: string | null;
  firstYear: number;
  lastYear: number;
}
