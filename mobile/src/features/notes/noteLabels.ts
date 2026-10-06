export function normalizeNoteLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const labels: string[] = [];
  const seen = new Set<string>();

  for (const valueItem of value) {
    if (typeof valueItem !== 'string') continue;

    const label = valueItem.trim();
    const normalizedLabel = label.toLowerCase();
    if (!label || seen.has(normalizedLabel)) continue;

    labels.push(label);
    seen.add(normalizedLabel);
  }

  return labels;
}
