import { MaintenanceStatus } from "@/config/types/maintenance";
const CONFIG: Record<
  MaintenanceStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  OK: {
    label: "OK",
    bg: "bg-emerald-50 border border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  ALERT: {
    label: "ALERT",
    bg: "bg-amber-50 border border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  DUE: {
    label: "DUE",
    bg: "bg-rose-50 border border-rose-200",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
};

export default function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const c = CONFIG[status] ?? CONFIG.OK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}


interface ProgressBarProps {
  value: number | null | undefined;
  max: number;
  status: MaintenanceStatus;
  isTriggered: boolean;
}

export function ProgressBar({
  value,
  max,
  status,
  isTriggered,
}: ProgressBarProps) {
  if (!max || max === 0 || value == null) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  const intVal = Math.floor(value);
  const pct = Math.min(100, (intVal / max) * 100);

  let barColor = "bg-emerald-500";
  if (isTriggered && status === "ALERT") barColor = "bg-amber-400";
  if (isTriggered && status === "DUE") barColor = "bg-rose-500";

  return (
    <div className="space-y-1 min-w-[90px]">
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 tabular-nums">
        {intVal}
        <span className="text-slate-400">/{max}</span>
      </p>
    </div>
  );
}