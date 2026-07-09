export function normalizeSerial(sn: string | null | undefined): string {
  return (sn ?? '').trim().toLowerCase();
}

export function serialsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeSerial(a);
  const nb = normalizeSerial(b);
  return !!na && !!nb && na === nb;
}
