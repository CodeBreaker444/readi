"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AddCommunicationInput } from "@/config/types/communication";
import axios from "axios";
import { Braces, Loader2 } from "lucide-react";
import { useState } from "react";
import { HiPlus } from "react-icons/hi";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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
      // ✅ Send form fields directly at the top level, not nested under "data"
      const res = await axios.post("/api/organization/communication/add", form);
      if (res.status === 201) {
        toast.success("Communication protocol deployed");
        onSuccess(res.data.data);
        setForm(INITIAL_FORM);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Deployment failed. Check matrix configuration.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePrettify = () => {
    try {
      const jsonStr = form.communication_json || "{}";
      const obj = JSON.parse(jsonStr);
      setForm(prev => ({ ...prev, communication_json: JSON.stringify(obj, null, 2) }));
      toast.success("JSON Prettified");
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code" className={labelClass}>Protocol Code</Label>
          <Input
            id="code"
            value={form.communication_code}
            onChange={(e) => setForm({ ...form, communication_code: e.target.value })}
            placeholder="COMM-001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ver" className={labelClass}>Version</Label>
          <Input
            id="ver"
            value={form.communication_ver}
            onChange={(e) => setForm({ ...form, communication_ver: e.target.value })}
            placeholder="1.0"
          />
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Status</Label>
          <Select
            value={form.communication_active}
            onValueChange={(val: "Y" | "N") => setForm({ ...form, communication_active: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Y">Active (Y)</SelectItem>
              <SelectItem value="N">Inactive (N)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc" className={labelClass}>Description</Label>
        <Input
          id="desc"
          value={form.communication_desc}
          onChange={(e) => setForm({ ...form, communication_desc: e.target.value })}
          placeholder="Matrix description..."
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="json" className={labelClass}>JSON Matrix Schema</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePrettify}
            className="h-6 px-2 text-[10px] text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
          >
            <Braces className="mr-1 h-3 w-3" />
            Prettify
          </Button>
        </div>
        <Textarea
          id="json"
          value={form.communication_json}
          onChange={(e) => setForm({ ...form, communication_json: e.target.value })}
          rows={8}
          placeholder='{ "schema": "v1" }'
          className="font-mono text-xs resize-none"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-40 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest h-11"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <HiPlus className="mr-2 text-lg" />
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
      <DialogContent className={`max-w-2xl p-0 overflow-hidden border ${
        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <DialogHeader className={`px-6 py-4 border-b ${
          isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"
        }`}>
          <DialogTitle className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            Initialize Protocol Matrix
          </DialogTitle>
        </DialogHeader>
        <div className="p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}