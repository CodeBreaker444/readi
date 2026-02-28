"use client";

import { AddCommunicationForm, CommunicationModal } from "@/components/organization/AddCommunicationForm";
import { CommunicationTable } from "@/components/organization/CommunicationTable";
import { EditCommunicationModal } from "@/components/organization/EditCommunicationModal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/useTheme";
import { Communication } from "@/config/types/communication";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { HiPlus, HiRefresh } from "react-icons/hi";
import { toast } from "sonner";

export default function CommunicationPage() {
  const { isDark } = useTheme();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [editTarget, setEditTarget] = useState<Communication | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchCommunications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("/api/organization/communication");
      if (res.status !== 200) {
        throw new Error(res.data?.message ?? "Failed to load communications");
      }
      setCommunications(res.data.data.data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  function handleAddSuccess(newItem: Communication) {
    setCommunications((prev) => [newItem, ...prev]);
    setIsAddOpen(false);
    toast.success("Communication added successfully.");
  }

  function handleEdit(communication: Communication) {
    setEditTarget(communication);
    setIsEditOpen(true);
  }

  function handleEditClose() {
    setIsEditOpen(false);
    setTimeout(() => setEditTarget(null), 300);
  }

  function handleEditSuccess(updatedItem: Communication) {
    setCommunications((prev) =>
      prev.map((c) =>
        c.communication_id === updatedItem.communication_id ? updatedItem : c
      )
    );
    handleEditClose();
    toast.success("Communication updated successfully.");
  }

  async function handleDelete(communicationId: number) {
    try {
      const res = await axios.post("/api/organization/communication/delete", {
        communication_id: communicationId,
      });

      if (res.data.code !== 1) {
        toast.error(res.data.message ?? "Failed to delete.");
        return;
      }

      setCommunications((prev) =>
        prev.filter((c) => c.communication_id !== communicationId)
      );
      toast.success("Communication deleted.");
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Network error. Please try again.";
      toast.error(message);
    }
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-slate-950 text-slate-300" : "bg-slate-50 text-slate-700"
        }`}
    >
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className={` top-0 z-10 backdrop-blur-md transition-colors w-full ${isDark
            ? "bg-slate-900/80 border-b border-slate-800 text-white"
            : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          } px-6 py-4 mb-8`}>
          <div className="mx-auto max-w-[1800px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-violet-600" />
              <div>
                <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  Communication Protocols
                </h1>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Manage and track drone communication schemas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCommunications}
                disabled={isLoading}
                className={`h-8 gap-1.5 text-xs transition-all ${isDark
                    ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <HiRefresh className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm shadow-violet-500/20"
              >
                <HiPlus className="h-3.5 w-3.5" />
                New Communication
              </Button>
            </div>
          </div>
        </div>
        <CommunicationModal
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          isDark={isDark}
        >
          <AddCommunicationForm
            onSuccess={handleAddSuccess}
            isDark={isDark}
          />
        </CommunicationModal>

        <EditCommunicationModal
          open={isEditOpen}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
          communication={editTarget}
          isDark={isDark}
        />

        <div className={`rounded-xl border mx-3 p-3 transition-all ${isDark ? "bg-[#0c0f1a] border-slate-800 shadow-black/40" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Operational Protocols
            </h2>
            {!isLoading && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border uppercase tracking-wider ${isDark ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-400"}`}>
                {communications.length} Nodes Online
              </span>
            )}
          </div>

          <CommunicationTable
            data={communications}
            loading={isLoading}
            isDark={isDark}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}