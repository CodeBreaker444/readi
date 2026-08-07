export function seedLucProcedureProgressFromSteps(
  luc_procedure_steps: unknown
): Record<string, Record<string, string>> | null {
  if (!luc_procedure_steps) return null;

  const rawTasks: unknown[] = Array.isArray(
    (luc_procedure_steps as { tasks?: unknown })?.tasks
  )
    ? ((luc_procedure_steps as { tasks: unknown[] }).tasks)
    : [];

  const seed: Record<string, Record<string, string>> = {
    checklist: {},
    communication: {},
    assignment: {},
  };

  for (const step of rawTasks as {
    checklist?: { checklist_code?: string }[];
    communication?: { communication_code?: string }[];
    assignment?: { assignment_code?: string }[];
  }[]) {
    for (const item of step?.checklist ?? []) {
      if (item?.checklist_code) seed.checklist[item.checklist_code] = 'N';
    }
    for (const item of step?.communication ?? []) {
      if (item?.communication_code) seed.communication[item.communication_code] = 'N';
    }
    for (const item of step?.assignment ?? []) {
      if (item?.assignment_code) seed.assignment[item.assignment_code] = 'N';
    }
  }

  return seed;
}
