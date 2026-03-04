"use client";

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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import EditPlanningRequestCard from "./EditPlanningRequestCard";
import MissionPlanningLogbookAddNew from "./MissionPlanningLogbookAddNew";
import MissionPlanningLogbookTable from "./MissionPlanningLogbookTable";
import RepositoryFilesCard from "./RepositoryFilesCard";
import TaskCompletionSection from "./TaskCompletionSection";

import type {
  DroneTool,
  PlanningData,
  PlanningLogbookRow,
  RepositoryFile,
  TaskData,
} from "@/config/types/evaluation-planning";
import axios from "axios";
import { toast } from "sonner";
import Breadcrumbs from "../Breadcrumbs";
import { useTheme } from "../useTheme";

export default function PlanningMissionContent() {
  const { isDark } = useTheme()
  const searchParams = useSearchParams();
  const router = useRouter();

  const c_id = parseInt(searchParams.get("c_id") || "0");
  const e_id = parseInt(searchParams.get("e_id") || "0");
  const p_id = parseInt(searchParams.get("p_id") || "0");

  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [logbookList, setLogbookList] = useState<PlanningLogbookRow[]>([]);
  const [droneTools, setDroneTools] = useState<DroneTool[]>([]);
  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [repoLogbookFiles, setRepoLogbookFiles] = useState<RepositoryFile[]>([]);
  const [repoTestFiles, setRepoTestFiles] = useState<RepositoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [openedRowId, setOpenedRowId] = useState<number | null>(null);

  const [showEditPlanning, setShowEditPlanning] = useState(true);
  const [showAddNewMission, setShowAddNewMission] = useState(true);
  const [showLogbookTable, setShowLogbookTable] = useState(true);
  const [showRepoFiles, setShowRepoFiles] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  useEffect(() => {
    if (!c_id || !e_id || !p_id) {
      router.replace("/planning-dashboard");
    }
  }, [c_id, e_id, p_id, router]);

  const loadPageData = useCallback(async () => {
    if (!p_id) return;
    setLoading(true);
    try {
      const [planningRes, logbookRes, toolsRes, repoLogbookRes, repoTestRes] = await Promise.all([
        axios.post("/api/evaluation/planning/planning-data", { e_id: p_id }),
        axios.post("/api/evaluation/planning/logbook", { p_id }),
        axios.post("/api/evaluation/planning/drone", { client_id: c_id, active: "ALL", status: "ALL" }),
        axios.post("/api/evaluation/planning/repository", { id: p_id, repository_type: "mission_planning_logbook" }),
        axios.post("/api/evaluation/planning/repository", { id: p_id, repository_type: "mission_planning_test_logbook" })
      ]);

      setPlanningData(planningRes.data.data ?? null);
      setLogbookList(logbookRes.data.data ?? []);
      setDroneTools(toolsRes.data.data ?? []);

      const rawTaskJson = planningRes.data.data?.planning_json;
      if (rawTaskJson) {
        try { setTaskData(JSON.parse(rawTaskJson)); } catch { setTaskData(null); }
      }

      setRepoLogbookFiles(repoLogbookRes.data.data ?? []);
      setRepoTestFiles(repoTestRes.data.data ?? []);
    } catch (err: any) {
      console.error("Failed to load page data:", err);
      toast.error("Failed to load mission data.");
    } finally {
      setLoading(false);
    }
  }, [p_id, c_id]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);


  const handleOpenRow = (missionPlanningId: number) => {
    setOpenedRowId(missionPlanningId);
    setShowAddNewMission(true);
    setShowEditPlanning(true);
  };

  const confirmDelete = (id: number) => {
    setIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteLogbook = async () => {
    if (idToDelete === null) return;

    const previousList = [...logbookList];

    try {
      setLogbookList((prev) => prev.filter(item => item.mission_planning_id !== idToDelete));
      if (openedRowId === idToDelete) setOpenedRowId(null);

      await axios.post('/api/evaluation/planning/delete-mission-planning', { missionPlanningId: idToDelete });

      toast.success("Logbook entry deleted successfully");
    } catch (err) {
      setLogbookList(previousList);
      console.error("Delete failed:", err);
      toast.error("Failed to delete. The list has been restored.");
    } finally {
      setIdToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleAddMissionPlanning = async (
    formData: FormData
  ): Promise<{ success: boolean }> => {
    try {
      const res = await axios.post("/api/evaluation/planning/add-mission-planning", formData);
      const newEntry = res.data.data;

      if (newEntry) {
        setLogbookList((prev) => [newEntry, ...prev]);
      } else {
        await loadPageData();
      }

      setOpenedRowId(null);
      toast.success("Mission added successfully");

      return { success: true };
    } catch (err: any) {
      console.error("Add failed:", err);
      toast.error("Failed to add mission.");

      return { success: false };
    }
  };

  const handleUpdatePlanning = async (formData: Record<string, unknown>): Promise<{ success: boolean }> => {
    try {
      await axios.post("/api/evaluation/planning/update-planning", formData);
      await loadPageData();
      toast.success("Planning updated");
      return { success: true };
    } catch (err) {
      console.error("Update failed:", err);
      return { success: false };
    }
  };

  const handleManageLogbook = (row: PlanningLogbookRow) => {
    router.push(`/planning-mission-detail?c_id=${c_id}&e_id=${e_id}&p_id=${p_id}&mp_id=${row.mission_planning_id}`);
  };

  const ToggleIcon = ({ show }: { show: boolean }) =>
    show ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-6 w-64" /><Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
        <Skeleton className="h-96" />
      </div>
    );
  }


  const breadcrumbItems = [
    { label: "Mission Planning Dashboard", href: "/planning/planning-dashboard" },
    { label: "Planning Mission", href: "#" },
  ];

  return (
    <div className="w-full px-6 space-y-4">
      <div className={` top-0 py-2 z-10 backdrop-blur-md transition-all -mx-6 mt-0 mb-6 px-6 py-4",
  ${isDark
          ? 'bg-slate-900/80 border-b border-slate-800'
          : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'}
`}>
        <div className="mx-auto   flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-violet-600" />

            <div>
              <h1 className={`
          text-lg font-bold tracking-tight flex items-center gap-2",
          ${isDark ? 'text-white' : 'text-slate-900'}
        `}>
                Mission Planning Data
                {planningData?.planning_code && (
                  <span className={`font-normal text-sm opacity-70", 
              ${isDark ? 'text-slate-400' : 'text-slate-500'}
            `}>
                    &nbsp;— {planningData.planning_code}
                  </span>
                )}
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Manage mission logbooks and operational planning parameters
              </p>
            </div>
          </div>

        </div>
      </div>
      
      <Breadcrumbs items={breadcrumbItems} isDark={isDark} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Edit Mission Planning Request</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowEditPlanning(!showEditPlanning)}>
              <ToggleIcon show={showEditPlanning} />
            </Button>
          </CardHeader>
          {showEditPlanning && (
            <CardContent className="p-0">
              <EditPlanningRequestCard
                planningData={planningData}
                clinetId={c_id}
                evaluationId={e_id}
                planningId={p_id}
                onUpdate={handleUpdatePlanning}
              />
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Mission Planning Logbook Add New</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowAddNewMission(!showAddNewMission)}>
              <ToggleIcon show={showAddNewMission} />
            </Button>
          </CardHeader>
          {showAddNewMission && (
            <CardContent className="p-0">
              <MissionPlanningLogbookAddNew
                planningId={p_id}
                evaluationId={e_id}
                clientId={c_id}
                droneTools={droneTools}
                onSubmit={handleAddMissionPlanning}
                defaultLimitJson={planningData?.default_limit_json || ""}
              />
            </CardContent>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Mission Planning Logbook</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowLogbookTable(!showLogbookTable)}>
            <ToggleIcon show={showLogbookTable} />
          </Button>
        </CardHeader>
        {showLogbookTable && (
          <CardContent>
            <MissionPlanningLogbookTable
              data={logbookList}
              openedRowId={openedRowId}
              onOpen={handleOpenRow}
              onDelete={confirmDelete}
              onManage={handleManageLogbook}
            />
          </CardContent>
        )}
      </Card>

      <TaskCompletionSection taskData={taskData} planningId={p_id} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Repository Files</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowRepoFiles(!showRepoFiles)}>
            <ToggleIcon show={showRepoFiles} />
          </Button>
        </CardHeader>
        {showRepoFiles && (
          <CardContent className="p-0">
            <RepositoryFilesCard logbookFiles={repoLogbookFiles} testFiles={repoTestFiles} />
          </CardContent>
        )}
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the mission logbook entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLogbook} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
