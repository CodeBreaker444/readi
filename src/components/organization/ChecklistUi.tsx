import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge as ShadBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

 
export function Modal({
  open,
  title,
  onClose,
  children,
  isDark,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={`max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border shadow-2xl
          ${isDark ? "bg-gray-900 border-gray-700/60 text-gray-100" : "bg-white border-gray-200 text-gray-900"}
        `}
        style={{ backdropFilter: "none" }}
      >
        <DialogHeader
          className={`px-6 py-4 border-b flex flex-row items-center justify-between space-y-0
            ${isDark ? "border-gray-700/60 bg-gray-900" : "border-gray-100 bg-gray-50"}
          `}
        >
          <div className="flex items-center gap-3">
            <DialogTitle
              className={`text-base font-semibold tracking-tight ${isDark ? "text-gray-100" : "text-gray-900"}`}
            >
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[75vh]">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

 
export function Badge({ active }: { active: string | null }) {
  const isActive = active === "Y";
  return (
    <ShadBadge
      variant="outline"
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full border
        ${
          isActive
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
            : "bg-gray-500/10 text-gray-500 border-gray-500/20"
        }
      `}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`}
      />
      {isActive ? "Active" : "Inactive"}
    </ShadBadge>
  );
}
 
type FormData = {
  checklist_code: string;
  checklist_ver: string;
  checklist_active: "Y" | "N";
  checklist_desc: string;
  checklist_json: string;
};

export function ChecklistForm({
  initial,
  onSubmit,
  loading,
  submitLabel,
  isDark,
}: {
  initial: FormData;
  onSubmit: (f: FormData) => void;
  loading: boolean;
  submitLabel: string;
  isDark: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonValid, setJsonValid] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const setField =
    (k: keyof FormData) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      if (k === "checklist_json") {
        setJsonError(null);
        setJsonValid(false);
      }
    };

  const validateJsonSchema = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== "object" || Array.isArray(parsed))
        return { valid: false, error: "JSON must be an object" };
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
  };

  const handleJsonCheck = () => {
    const { valid, error } = validateJsonSchema(form.checklist_json);
    if (valid) {
      setJsonError("Valid JSON Schema");
      setJsonValid(true);
    } else {
      setJsonError(error ?? "Invalid JSON Format");
      setJsonValid(false);
    }
  };

  const labelClass = `text-xs font-semibold uppercase tracking-wider ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`;

  const inputClass = `cursor-text ${
    isDark
      ? "bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
  }`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const { valid, error } = validateJsonSchema(form.checklist_json);
        if (!valid) {
          setJsonError(error);
          setJsonValid(false);
          return;
        }
        onSubmit(form);
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>
            Protocol Code <span className="text-red-500">*</span>
          </Label>
          <Input
            className={inputClass}
            value={form.checklist_code}
            onChange={setField("checklist_code")}
            placeholder="PRE-FLIGHT-01"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Version</Label>
          <Input
            className={inputClass}
            value={form.checklist_ver}
            onChange={setField("checklist_ver")}
            placeholder="1.0"
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Status</Label>
          <Select
            value={form.checklist_active}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, checklist_active: v as "Y" | "N" }))
            }
          >
            <SelectTrigger className={`cursor-pointer ${inputClass}`}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent
              className={
                isDark
                  ? "bg-gray-800 border-gray-700 text-gray-100"
                  : "bg-white border-gray-200"
              }
            >
              <SelectItem value="Y" className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </SelectItem>
              <SelectItem value="N" className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Inactive
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>
          Description <span className="text-red-500">*</span>
        </Label>
        <Input
          className={inputClass}
          value={form.checklist_desc}
          onChange={setField("checklist_desc")}
          placeholder="Enter checklist description..."
          required
        />
      </div>

      <Separator className={isDark ? "bg-gray-700/60" : "bg-gray-100"} />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className={labelClass}>JSON Schema (SurveyJS)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleJsonCheck}
            className={`cursor-pointer h-7 px-3 text-xs gap-1.5 ${
              isDark
                ? "border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <ShieldCheck size={12} />
            Validate JSON
          </Button>
        </div>

        <div
          className={`rounded-xl border overflow-hidden transition-colors ${
            jsonError
              ? jsonValid
                ? "border-emerald-500/50"
                : "border-red-500/40"
              : isDark
              ? "border-gray-700"
              : "border-gray-200"
          }`}
        >
          <div
            className={`flex items-center gap-2 px-4 py-2 border-b ${
              isDark
                ? "bg-gray-800 border-gray-700"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <span
              className={`text-xs font-mono ml-1 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              schema.json
            </span>
          </div>

          <Textarea
            className={`cursor-text rounded-none border-0 font-mono text-sm leading-relaxed h-44 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isDark
                ? "bg-gray-900 text-gray-200 placeholder:text-gray-600"
                : "bg-white text-gray-800 placeholder:text-gray-400"
            }`}
            value={form.checklist_json}
            onChange={setField("checklist_json")}
            placeholder={'{\n  "pages": [...]\n}'}
          />
        </div>

        {jsonError && (
          <p
            className={`text-xs flex items-center gap-1.5 mt-1 ${
              jsonValid ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {jsonValid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {jsonError}
          </p>
        )}
      </div>

      <div className="pt-1">
        <Button
          type="submit"
          disabled={loading}
          className={`cursor-pointer w-full h-11 text-sm font-semibold rounded-xl transition-all gap-2
            ${
              loading
                ? `cursor-not-allowed ${
                    isDark
                      ? "bg-gray-800 text-gray-500 border border-gray-700 hover:bg-gray-800"
                      : "bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-100"
                  }`
                : "bg-violet-600 hover:bg-violet-500 cursor-pointer text-white shadow-sm active:scale-[0.99]"
            }
          `}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Processing...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}