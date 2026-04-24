export interface TopNInput {
  label: string;
  count: number;
}

export interface TopNShareResult {
  n: number;
  total: number;
  topCount: number;
  share: number;
  entities: readonly TopNInput[];
}

export function topNShare(items: readonly TopNInput[], n: number): TopNShareResult {
  if (items.length === 0 || n <= 0) {
    return { n: 0, total: 0, topCount: 0, share: 0, entities: [] };
  }
  const sorted = [...items].sort((a, b) => b.count - a.count);
  const capped = Math.min(n, sorted.length);
  const entities = sorted.slice(0, capped);
  const total = sorted.reduce((s, i) => s + i.count, 0);
  const topCount = entities.reduce((s, i) => s + i.count, 0);
  const share = total > 0 ? topCount / total : 0;
  return { n: capped, total, topCount, share, entities };
}
