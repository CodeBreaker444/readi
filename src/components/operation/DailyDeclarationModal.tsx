"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { InsertPilotDeclarationPayload } from "../../config/types/operation";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isDark: boolean;
}

const DECLARATION_TYPE = "PIC_Suitable_declaration";

const CHECKLIST_ITEMS = [
  { key: "rested", label: "I am adequately rested and not fatigued" },
  { key: "fit", label: "I am physically and mentally fit to fly" },
  { key: "medication", label: "I am not under the influence of medication that may impair my performance" },
  { key: "briefed", label: "I have reviewed the mission plan and area of operation" },
  { key: "equipment", label: "Equipment and drone systems have been inspected and are airworthy" },
];

export function DailyDeclarationModal({ open, onClose, onSuccess, isDark }: Props) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const allChecked = CHECKLIST_ITEMS.every((item) => answers[item.key] === true);

  const toggle = (key: string) =>
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async () => {
    if (!allChecked) {
      toast.warning("Please confirm all checklist items before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: InsertPilotDeclarationPayload = {
        declaration_type: DECLARATION_TYPE,
        declaration_data: answers,
      };
      await axios.post("/api/operation/pilot/declaration", payload);
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to save declaration", {
        description: error?.response?.data?.message ?? "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const overlay = isDark ? "bg-black/60" : "bg-black/40";
  const panel = isDark
    ? "bg-[#0d1117] border border-white/10 text-white"
    : "bg-white border border-slate-200 text-slate-900";
  const itemBg = isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-50 hover:bg-slate-100";
  const btnPrimary = allChecked
    ? "bg-violet-600 hover:bg-violet-700 text-white"
    : "bg-slate-400 cursor-not-allowed text-white";
  const btnSecondary = isDark
    ? "border border-white/20 text-white/70 hover:bg-white/10"
    : "border border-slate-300 text-slate-600 hover:bg-slate-100";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${overlay}`}>
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${panel}`}>
        <h2 className="mb-1 text-lg font-semibold">Daily Pilot Declaration</h2>
        <p className={`mb-5 text-sm ${isDark ? "text-white/50" : "text-slate-500"}`}>
          Confirm all items to proceed with starting a mission today.
        </p>

        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors ${itemBg}`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors ${
                  answers[item.key]
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isDark
                    ? "border-white/30 bg-transparent"
                    : "border-slate-300 bg-transparent"
                }`}
              >
                {answers[item.key] ? "✓" : ""}
              </span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting || !allChecked}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${btnPrimary}`}
          >
            {submitting ? "Saving…" : "Submit Declaration"}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${btnSecondary}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
