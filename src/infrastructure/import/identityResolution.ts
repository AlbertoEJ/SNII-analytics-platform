import { normalizeName } from "./normalizeName";

export interface RawTuple {
  year: number;
  name: string;        // raw; we normalize internally
  cvu?: string;        // raw string from XLSX
  expediente?: string; // raw string from XLSX
}

export interface ResolvedIdentity {
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

export interface ResolveResult {
  identities: ResolvedIdentity[];
  /** Map from a stable per-tuple key to the canonical_id assigned. */
  snapshotMap: Map<string, number>;
}

const tupleKey = (t: RawTuple, idx: number) =>
  `${idx}|${t.year}|${t.cvu ?? ""}|${t.expediente ?? ""}`;

export function resolveIdentities(tuples: RawTuple[]): ResolveResult {
  // Step 1: group by CVU. Each CVU becomes a tentative cluster.
  const clusterByCvu = new Map<string, { exps: Set<string>; tupleIdxs: number[] }>();
  // Track expediente → cvu(s) seen.
  const cvusByExp = new Map<string, Set<string>>();

  tuples.forEach((t, idx) => {
    if (t.cvu) {
      let c = clusterByCvu.get(t.cvu);
      if (!c) { c = { exps: new Set(), tupleIdxs: [] }; clusterByCvu.set(t.cvu, c); }
      if (t.expediente) c.exps.add(t.expediente);
      c.tupleIdxs.push(idx);
      if (t.expediente) {
        let s = cvusByExp.get(t.expediente);
        if (!s) { s = new Set(); cvusByExp.set(t.expediente, s); }
        s.add(t.cvu);
      }
    }
  });

  // Detect ambiguous CVUs: any CVU sharing an expediente with another CVU.
  const ambiguousCvus = new Set<string>();
  for (const [, cvus] of cvusByExp) {
    if (cvus.size > 1) for (const c of cvus) ambiguousCvus.add(c);
  }

  // Step 2: assign canonical_ids. CVU clusters first, then orphan-expediente clusters.
  let nextId = 1;
  const cvuToCanonical = new Map<string, number>();
  for (const cvu of clusterByCvu.keys()) {
    cvuToCanonical.set(cvu, nextId++);
  }
  const expToCanonical = new Map<string, number>();
  for (const [exp, cvus] of cvusByExp) {
    if (cvus.size === 1) {
      const cvu = Array.from(cvus)[0];
      const id = cvuToCanonical.get(cvu);
      if (id != null) expToCanonical.set(exp, id);
    } else {
      // ambiguous: pick the first cvu's canonical_id (deterministic by Set iteration).
      const cvu = Array.from(cvus).sort()[0];
      const id = cvuToCanonical.get(cvu);
      if (id != null) expToCanonical.set(exp, id);
    }
  }

  // Step 3: pre-2003 rows (no CVU) — link via expediente, else seed a new id.
  const snapshotMap = new Map<string, number>();
  tuples.forEach((t, idx) => {
    const key = tupleKey(t, idx);
    if (t.cvu) {
      const id = cvuToCanonical.get(t.cvu)!;
      snapshotMap.set(key, id);
    } else if (t.expediente && expToCanonical.has(t.expediente)) {
      snapshotMap.set(key, expToCanonical.get(t.expediente)!);
    } else if (t.expediente) {
      const id = nextId++;
      expToCanonical.set(t.expediente, id);
      snapshotMap.set(key, id);
    }
    // else: no cvu and no expediente — skipped (importer should have filtered earlier).
  });

  // Step 4: build ResolvedIdentity records.
  const acc = new Map<number, {
    cvu: string | null;
    expedientes: Set<string>;
    nameVariants: Set<string>;
    canonicalName: string;
    canonicalNameYear: number;
    firstYear: number;
    lastYear: number;
    ambiguous: boolean;
  }>();

  tuples.forEach((t, idx) => {
    const key = tupleKey(t, idx);
    const id = snapshotMap.get(key);
    if (id == null) return;
    let row = acc.get(id);
    if (!row) {
      row = {
        cvu: t.cvu ?? null,
        expedientes: new Set(),
        nameVariants: new Set(),
        canonicalName: t.name,
        canonicalNameYear: t.year,
        firstYear: t.year,
        lastYear: t.year,
        ambiguous: t.cvu != null && ambiguousCvus.has(t.cvu),
      };
      acc.set(id, row);
    }
    if (t.cvu && row.cvu == null) row.cvu = t.cvu;
    if (t.expediente) row.expedientes.add(t.expediente);
    const norm = normalizeName(t.name);
    if (norm) row.nameVariants.add(norm);
    if (t.year > row.canonicalNameYear) {
      row.canonicalName = t.name;
      row.canonicalNameYear = t.year;
    }
    if (t.year < row.firstYear) row.firstYear = t.year;
    if (t.year > row.lastYear) row.lastYear = t.year;
    if (t.cvu && ambiguousCvus.has(t.cvu)) row.ambiguous = true;
  });

  const identities: ResolvedIdentity[] = [];
  for (const [canonicalId, r] of acc) {
    let note: string | null = null;
    if (r.ambiguous && r.cvu) {
      const collidingExps = Array.from(r.expedientes).filter((e) => (cvusByExp.get(e)?.size ?? 0) > 1);
      if (collidingExps.length) {
        note = `CVU ${r.cvu} shares expediente(s) ${collidingExps.join(", ")} with other CVU(s)`;
      }
    }
    identities.push({
      canonicalId,
      cvu: r.cvu ? Number.parseInt(r.cvu, 10) : null,
      expedientes: Array.from(r.expedientes).sort(),
      canonicalName: r.canonicalName,
      nameVariants: Array.from(r.nameVariants).sort(),
      ambiguous: r.ambiguous,
      ambiguityNote: note,
      firstYear: r.firstYear,
      lastYear: r.lastYear,
    });
  }

  return { identities, snapshotMap };
}
