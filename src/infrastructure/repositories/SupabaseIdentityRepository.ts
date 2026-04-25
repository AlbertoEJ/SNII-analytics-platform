import type { SnSupabaseClient } from "@/infrastructure/supabase/client";
import type { IdentityRepository } from "@/domain/repositories/IdentityRepository";
import type { ResearcherIdentity } from "@/domain/entities/ResearcherIdentity";

type Row = {
  canonical_id: number;
  cvu: number | null;
  expedientes: string[] | null;
  canonical_name: string;
  name_variants: string[] | null;
  ambiguous: boolean;
  ambiguity_note: string | null;
  first_year: number;
  last_year: number;
};

function mapRow(r: Row): ResearcherIdentity {
  return {
    canonicalId: r.canonical_id,
    cvu: r.cvu,
    expedientes: r.expedientes ?? [],
    canonicalName: r.canonical_name,
    nameVariants: r.name_variants ?? [],
    ambiguous: r.ambiguous,
    ambiguityNote: r.ambiguity_note,
    firstYear: r.first_year,
    lastYear: r.last_year,
  };
}

export class SupabaseIdentityRepository implements IdentityRepository {
  constructor(private readonly client: SnSupabaseClient) {}

  async findByCanonicalId(id: number): Promise<ResearcherIdentity | null> {
    const { data, error } = await this.client
      .from("researchers").select("*").eq("canonical_id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as Row) : null;
  }

  async findByCvu(cvu: number): Promise<ResearcherIdentity | null> {
    const { data, error } = await this.client
      .from("researchers").select("*").eq("cvu", cvu).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as Row) : null;
  }

  async search(
    query: string,
    opts: { year?: number; limit: number; offset: number },
  ): Promise<ResearcherIdentity[]> {
    let q = this.client.from("researchers").select("*")
      .order("canonical_name").range(opts.offset, opts.offset + opts.limit - 1);
    if (query.trim()) {
      const tokens = query.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "")
        .toUpperCase().split(/\s+/).filter(Boolean);
      for (const t of tokens) q = q.ilike("canonical_name", `%${t}%`);
    }
    if (opts.year != null) {
      q = q.lte("first_year", opts.year).gte("last_year", opts.year);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(mapRow);
  }
}
