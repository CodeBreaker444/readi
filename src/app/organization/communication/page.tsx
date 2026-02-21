"use client";

import { AddCommunicationForm, CommunicationModal } from "@/components/organization/AddCommunicationForm";
import { CommunicationTable } from "@/components/organization/CommunicationTable";
import { EditCommunicationModal } from "@/components/organization/EditCommunicationModal";
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
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-slate-950 text-slate-300" : "bg-slate-50 text-slate-700"
      }`}
    >
      <div className="mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
              Communication Protocols
            </h1>
            <p className={`text-sm mt-1.5 flex items-center gap-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Manage drone communication schemas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCommunications}
              disabled={isLoading}
              className={`h-9 px-4 rounded-lg border flex items-center gap-2 transition-all active:scale-95 ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
              title="Sync System"
            >
              <HiRefresh className={`text-base ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-600/20 flex items-center gap-2"
            >
              <HiPlus className="text-lg" />
              New Communication
            </button>
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

        <div className={`rounded-xl border p-6 transition-all ${isDark ? "bg-[#0c0f1a] border-slate-800 shadow-black/40" : "bg-white border-slate-200 shadow-sm"}`}>
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