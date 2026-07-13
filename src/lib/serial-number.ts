export function normalizeSerial(sn: string | null | undefined): string {
  return (sn ?? '').trim().toLowerCase();
}

/** True if `target` matches any serial in `list` — for systems with more than one drone/aircraft component. */
export function serialInList(list: (string | null | undefined)[] | null | undefined, target: string | null | undefined): boolean {
  const nt = normalizeSerial(target);
  if (!nt) return false;
  return (list ?? []).some((s) => normalizeSerial(s) === nt);
}
