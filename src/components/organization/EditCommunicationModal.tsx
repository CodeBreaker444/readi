"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Communication } from "@/config/types/communication";
import axios from "axios";
import { Braces, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { HiPencil } from "react-icons/hi";
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
import { Textarea } from "../ui/textarea";

interface EditCommunicationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (updatedItem: Communication) => void;
  communication: Communication | null;
  isDark: boolean;
}

type EditForm = {
  communication_code: string;
  communication_desc: string;
  communication_ver: string;
  communication_active: "Y" | "N";
  communication_json: string;
};

export function EditCommunicationModal({
  open,
  onClose,
  onSuccess,
  communication,
  isDark,
}: EditCommunicationModalProps) {
  const [form, setForm] = useState<EditForm>({
    communication_code: "",
    communication_desc: "",
    communication_ver: "",
    communication_active: "Y",
    communication_json: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (communication) {
      setForm({
        communication_code: communication.communication_code ?? "",
        communication_desc: communication.communication_desc ?? "",
        communication_ver: String(communication.communication_ver ?? ""),
        communication_active: communication.communication_active ?? "Y",
        communication_json:
          typeof communication.communication_json === "object" &&
          communication.communication_json !== null
            ? JSON.stringify(communication.communication_json, null, 2)
            : (communication.communication_json as string) ?? "",
      });
    }
  }, [communication]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!communication) return;
    setIsSubmitting(true);

    try {
      const res = await axios.put("/api/organization/communication/update", {
        communication_id: communication.communication_id,
        ...form,
      });

      if (res.data.code === 1) {
        toast.success("Protocol updated successfully.");
        
        const updatedItem = res.data.data; 
        onSuccess(updatedItem || { ...communication, ...form }); 
        onClose();
      } else {
        toast.error(res.data.message ?? "Update failed.");
      }
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Network error. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePrettify = () => {
    try {
      const obj = JSON.parse(form.communication_json || "{}");
      setForm((prev) => ({ ...prev, communication_json: JSON.stringify(obj, null, 2) }));
      toast.success("JSON prettified.");
    } catch {
      toast.error("Invalid JSON format.");
    }
  };

  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className={`max-w-2xl p-0 overflow-hidden border ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <DialogHeader
          className={`px-6 py-4 border-b ${
            isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"
          }`}
        >
          <DialogTitle
            className={`text-lg font-semibold flex items-center gap-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            <HiPencil className="text-blue-500" />
            Edit Protocol
            {communication && (
              <span className="font-mono text-sm text-blue-400 ml-1">
                #{communication.communication_id}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_code" className={labelClass}>Protocol Code</Label>
                <Input
                  id="edit_code"
                  value={form.communication_code}
                  onChange={(e) => setForm({ ...form, communication_code: e.target.value })}
                  placeholder="COMM-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_ver" className={labelClass}>Version</Label>
                <Input
                  id="edit_ver"
                  value={form.communication_ver}
                  onChange={(e) => setForm({ ...form, communication_ver: e.target.value })}
                  placeholder="1.0"
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Status</Label>
                <Select
                  value={form.communication_active}
                  onValueChange={(val: "Y" | "N") =>
                    setForm({ ...form, communication_active: val })
                  }
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
              <Label htmlFor="edit_desc" className={labelClass}>Description</Label>
              <Input
                id="edit_desc"
                value={form.communication_desc}
                onChange={(e) => setForm({ ...form, communication_desc: e.target.value })}
                placeholder="Matrix description..."
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit_json" className={labelClass}>JSON Matrix Schema</Label>
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
                id="edit_json"
                value={form.communication_json}
                onChange={(e) => setForm({ ...form, communication_json: e.target.value })}
                rows={8}
                placeholder='{ "schema": "v1" }'
                className="font-mono text-xs resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className={`${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500"}`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-36 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest h-10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <HiPencil className="mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}