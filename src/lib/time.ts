export function normalizeDateTimeInput(input: string): string {
  const value = input.trim();
  if (!value) {
    return "";
  }

  const spaced = value.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(spaced)) {
    return `${spaced}:00`;
  }

  return spaced;
}

export function isValidRange(start?: string, end?: string): boolean {
  if (!start || !end) {
    return false;
  }

  return start <= end;
}
