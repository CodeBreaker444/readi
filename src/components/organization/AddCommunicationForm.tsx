"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddCommunicationInput } from "@/config/types/communication";
import axios from "axios";
import { Braces, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";

interface AddCommunicationFormProps {
  onSuccess: (newItem: any) => void;
  isDark: boolean;
}

const INITIAL_FORM: Omit<AddCommunicationInput, "o_id"> = {
  communication_code: "",
  communication_desc: "",
  communication_ver: "",
  communication_active: "Y",
  communication_json: "",
};

export function AddCommunicationForm({ onSuccess, isDark }: AddCommunicationFormProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/organization/communication/add", form);
      if (res.status === 201) {
        toast.success("Communication protocol deployed");
        onSuccess(res.data.data);
        setForm(INITIAL_FORM);
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Deployment failed. Check matrix configuration.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePrettify = () => {
    try {
      const obj = JSON.parse(form.communication_json || "{}");
      setForm((prev) => ({ ...prev, communication_json: JSON.stringify(obj, null, 2) }));
      toast.success("JSON Prettified");
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  const labelClass = `text-xs font-semibold uppercase tracking-wider ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`;

  const inputClass = `cursor-text ${
    isDark
      ? "bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
  }`;

  const selectClass = `cursor-pointer ${
    isDark
      ? "bg-gray-800 border-gray-700 text-gray-100 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
      : "bg-white border-gray-200 text-gray-900 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
  }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Row 1: Code, Version, Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="code" className={labelClass}>
            Protocol Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id="code"
            className={inputClass}
            value={form.communication_code}
            onChange={(e) => setForm({ ...form, communication_code: e.target.value })}
            placeholder="COMM-001"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ver" className={labelClass}>Version</Label>
          <Input
            id="ver"
            className={inputClass}
            value={form.communication_ver}
            onChange={(e) => setForm({ ...form, communication_ver: e.target.value })}
            placeholder="1.0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Status</Label>
          <Select
            value={form.communication_active}
            onValueChange={(val: "Y" | "N") =>
              setForm({ ...form, communication_active: val })
            }
          >
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent
              className={isDark ? "bg-gray-800 border-gray-700 text-gray-100" : ""}
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

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="desc" className={labelClass}>
          Description <span className="text-red-500">*</span>
        </Label>
        <Input
          id="desc"
          className={inputClass}
          value={form.communication_desc}
          onChange={(e) => setForm({ ...form, communication_desc: e.target.value })}
          placeholder="Enter protocol description..."
          required
        />
      </div>

      <Separator className={isDark ? "bg-gray-700/60" : "bg-gray-100"} />

      {/* JSON Schema */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="json" className={labelClass}>JSON Matrix Schema</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrettify}
            className={`cursor-pointer h-7 px-3 text-xs gap-1.5 ${
              isDark
                ? "border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <Braces size={12} />
            Prettify
          </Button>
        </div>

        {/* Code-editor styled wrapper */}
        <div
          className={`rounded-xl border overflow-hidden ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div
            className={`flex items-center gap-2 px-4 py-2 border-b ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <span className={`text-xs font-mono ml-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              matrix.json
            </span>
          </div>
          <Textarea
            id="json"
            value={form.communication_json}
            onChange={(e) => setForm({ ...form, communication_json: e.target.value })}
            rows={8}
            placeholder={'{\n  "schema": "v1"\n}'}
            className={`cursor-text rounded-none border-0 font-mono text-xs resize-none leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isDark
                ? "bg-gray-900 text-gray-200 placeholder:text-gray-600"
                : "bg-white text-gray-800 placeholder:text-gray-400"
            }`}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="pt-1">
        <Button
          type="submit"
          disabled={isSubmitting}
          className={`cursor-pointer w-full h-11 text-sm font-semibold rounded-xl transition-all gap-2 ${
            isSubmitting
              ? `cursor-not-allowed ${
                  isDark
                    ? "bg-gray-800 text-gray-500 border border-gray-700 hover:bg-gray-800"
                    : "bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-100"
                }`
              : "bg-violet-600 hover:bg-violet-500 text-white shadow-sm active:scale-[0.99]"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus size={16} />
              Initialize Protocol
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function CommunicationModal({
  open,
  onClose,
  isDark,
  children,
}: {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className={`max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border shadow-2xl ${
          isDark
            ? "bg-gray-900 border-gray-700/60 text-gray-100"
            : "bg-white border-gray-200 text-gray-900"
        }`}
        style={{ backdropFilter: "none" }}
      >
        <DialogHeader
          className={`px-6 py-4 border-b flex flex-row items-center justify-between space-y-0 ${
            isDark ? "border-gray-700/60 bg-gray-900" : "border-gray-100 bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <DialogTitle
              className={`text-base font-semibold tracking-tight ${
                isDark ? "text-gray-100" : "text-gray-900"
              }`}
            >
              Initialize Protocol Matrix
            </DialogTitle>
          </div>
          
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[75vh]">{children}</div>
      </DialogContent>
    </Dialog>
  );
}