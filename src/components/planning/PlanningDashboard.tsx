"use client";

import { Planning } from "@/config/types/evaluation-planning";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getPlanningColumns } from "../tables/PlanningColumns";
import AddPlanningForm, { AddPlanningFormData } from "./AddPlanningForm";
import CollapsibleCard from "./CollapsibleCard";
import PageHeader from "./PageHeader";
import PlanningTableCard from "./PlanningTableCard";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

type PlanningProps = {
  isDark: boolean;
};

export default function PlanningDashboard({ isDark }: PlanningProps) {
  const router = useRouter()
  const [planningData, setPlanningData] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedRow, setSelectedRow] = useState<Planning | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<Planning | null>(null);

  const fetchPlanning = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/evaluation/planning");
      setPlanningData(response.data.data || []);
    } catch (err) {
      console.error("fetchPlanning error:", err);
      toast.error("Failed to fetch planning data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanning();
  }, [fetchPlanning]);

  const handleSubmit = async (form: AddPlanningFormData): Promise<void> => {
    if (!form.fk_luc_procedure_id || !form.fk_evaluation_id) {
      toast.error("Required fields are missing!");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fk_luc_procedure_id: Number(form.fk_luc_procedure_id),
        fk_evaluation_id: Number(form.fk_evaluation_id),
        fk_client_id: Number(form.fk_client_id),
        planning_desc: form.planning_desc,
        planning_status: form.planning_status,
        planning_request_date: form.planning_request_date,
        planning_year: Number(form.planning_year),
        planning_type: form.planning_type,
        planning_folder: form.planning_folder,
        planning_result: "PROGRESS",
      };

      const response = await axios.post("/api/evaluation/planning", payload);

      if (response.data.code === 1) {
        toast.success("Planning request added successfully");
        await fetchPlanning();
      } else {
        toast.error(response.data.message || "Error adding planning");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerDeleteConfirm = useCallback((row: Planning) => {
    setRowToDelete(row);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = async () => {
    if (!rowToDelete) return;

    const previousData = [...planningData];
    const idToRemove = rowToDelete.planning_id;

    try {
      setPlanningData((prev) => prev.filter((p) => p.planning_id !== idToRemove));
      if (selectedRow?.planning_id === idToRemove) setSelectedRow(null);
      setDeleteDialogOpen(false);

      const response = await axios.delete("/api/evaluation/planning", {
        data: { planning_id: idToRemove },
      });

      if (response.data.code === 1) {
        toast.success("Record deleted");
      } else {
        setPlanningData(previousData);
        toast.error(response.data.message || "Error deleting");
      }
    } catch (err: any) {
      setPlanningData(previousData);
      toast.error(err.response?.data?.message || "Network error during deletion");
    } finally {
      setRowToDelete(null);
    }
  };

  const handleOpen = (row: Planning) => {
    router.push(
      `/planning/planning-mission?c_id=${row.fk_client_id ?? 0}&e_id=${row.fk_evaluation_id}&p_id=${row.planning_id}`
    );
  };

  const handleRowClick = useCallback((row: Planning) => {
    setSelectedRow((prev) => (prev?.planning_id === row.planning_id ? null : row));
  }, []);

  const columns = useMemo(
    () =>
      getPlanningColumns({
        isDark,
        onDelete: triggerDeleteConfirm,
        onOpen: handleOpen,
        deleting: false,
      }),
    [isDark, triggerDeleteConfirm, handleOpen]
  );

  const bg = isDark ? "bg-slate-900" : "bg-slate-50";
  const text = isDark ? "text-slate-100" : "text-slate-900";

  return (
    <div className={cn("min-h-screen transition-colors duration-200", bg, text)}>

      <PageHeader
        title="Planning Dashboard"
        subtitle="Operational Scenario Request Logbook"
        isDark={isDark}
        selectedLabel={
          selectedRow
            ? `PLAN_${selectedRow.planning_year}_${selectedRow.planning_id} — ${selectedRow.planning_desc}`
            : null
        }
        dropdownItems={[
          { label: "Communications", onClick: () => console.log("Communications") },
          { label: "Checklist", onClick: () => console.log("Checklist") },
        ]}
      />

      <div className="mx-auto max-w-[1800px] px-6 py-6 space-y-6">
        <CollapsibleCard
          title="[GO.00.P01] Add Planning Request"
          isDark={isDark}
          defaultOpen={false}
          collapsible
        >
          <AddPlanningForm isDark={isDark} onSubmit={handleSubmit} submitting={submitting} />
        </CollapsibleCard>

        <PlanningTableCard
          data={planningData}
          columns={columns}
          loading={loading}
          isDark={isDark}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          selectedRowId={selectedRow?.planning_id ?? null}
          onRowClick={handleRowClick}
        />
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the planning request{" "}
              <span className="font-bold text-destructive">
                {rowToDelete ? `PLAN_${rowToDelete.planning_year}_${rowToDelete.planning_id}` : ""}
              </span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}