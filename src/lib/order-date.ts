/** Chuẩn hoá ngày về YYYY-MM-DD để so sánh/filter đúng. */
export function normalizeOrderDate(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

export function isDateInRange(
  value: string | undefined,
  startDate: string,
  endDate: string,
): boolean {
  const iso = normalizeOrderDate(value);
  if (!iso) return true;
  if (startDate && iso < startDate) return false;
  if (endDate && iso > endDate) return false;
  return true;
}
