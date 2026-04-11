/** Build initial luc_procedure_progress JSON from luc_procedure.procedure_steps (same shape as calendar create). */
export function seedLucProcedureProgressFromSteps(
  luc_procedure_steps: unknown
): Record<string, Record<string, string>> | null {
  if (!luc_procedure_steps) return null;
  const tasks = (luc_procedure_steps as { tasks?: Record<string, unknown[]> })?.tasks ?? {};
  const seed: Record<string, Record<string, string>> = {
    checklist: {},
    communication: {},
    assignment: {},
  };
  for (const item of (tasks as { checklist?: { checklist_code?: string }[] }).checklist ?? []) {
    if (item?.checklist_code) seed.checklist[item.checklist_code] = 'N';
  }
  for (const item of (tasks as { communication?: { communication_code?: string }[] }).communication ?? []) {
    if (item?.communication_code) seed.communication[item.communication_code] = 'N';
  }
  for (const item of (tasks as { assignment?: { assignment_code?: string }[] }).assignment ?? []) {
    if (item?.assignment_code) seed.assignment[item.assignment_code] = 'N';
  }
  return seed;
}
