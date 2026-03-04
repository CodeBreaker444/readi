"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DroneTool } from "@/config/types/evaluation-planning";
import { useRef, useState } from "react";

interface MissionPlanningLogbookAddNewProps {
  planningId: number;
  evaluationId: number;
  clientId: number;
  droneTools: DroneTool[];
  onSubmit: (formData: FormData) => Promise<{ success: boolean }>;
  defaultLimitJson?: string;
}

export default function MissionPlanningLogbookAddNew({
  planningId,
  evaluationId,
  clientId,
  droneTools = [],
  onSubmit,
  defaultLimitJson = "",
}: MissionPlanningLogbookAddNewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    mission_planning_code: "",
    mission_planning_desc: "",
    mission_planning_limit_json: defaultLimitJson,
    mission_planning_active: "N",
    mission_planning_ver: "",
    mission_planning_tool: "0",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("fk_planning_id", String(planningId));
      formData.append("fk_evaluation_id", String(evaluationId));
      formData.append("fk_client_id", String(clientId));
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      if (fileInputRef.current?.files?.[0]) {
        formData.append("mission_planning_file", fileInputRef.current.files[0]);
      }
      const result = await onSubmit(formData);
      if (result?.success) {
        setForm({
          mission_planning_code: "",
          mission_planning_desc: "",
          mission_planning_limit_json: defaultLimitJson,
          mission_planning_active: "N",
          mission_planning_ver: "",
          mission_planning_tool: "0",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Fill the form for adding a new mission planning.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-1 space-y-2">
            <Label>Mission Code</Label>
            <Input
              name="mission_planning_code"
              value={form.mission_planning_code}
              onChange={handleChange}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Description</Label>
            <Input
              name="mission_planning_desc"
              value={form.mission_planning_desc}
              onChange={handleChange}
            />
          </div>
          <div className="col-span-3 space-y-2">
            <Label>Mission Operation Limits</Label>
            <Textarea
              name="mission_planning_limit_json"
              rows={4}
              value={form.mission_planning_limit_json}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-1 space-y-2">
            <Label>Active</Label>
            <Select
              value={form.mission_planning_active}
              onValueChange={(val) =>
                handleSelectChange("mission_planning_active", val)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="N">No</SelectItem>
                <SelectItem value="Y">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Version</Label>
            <Input
              name="mission_planning_ver"
              value={form.mission_planning_ver}
              onChange={handleChange}
            />
          </div>
          <div className="col-span-3 space-y-2">
            <Label>Drone</Label>
            <Select
              value={form.mission_planning_tool}
              onValueChange={(val) =>
                handleSelectChange("mission_planning_tool", val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select drone" />
              </SelectTrigger>
              <SelectContent>
                {droneTools.map((tool) => (
                  <SelectItem key={tool.tool_id} value={String(tool.tool_id)}>
                    {tool.tool_code} - {tool.tool_desc} [{tool.tool_status}]
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Upload Mission Planning File</Label>
            <Input
              type="file"
              ref={fileInputRef}
              name="mission_planning_file"
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="bg-violet-500 hover:bg-violet-600 cursor-pointer">
          {submitting ? "Adding..." : "Add New Mission Planning"}
        </Button>
      </form>
    </div>
  );
}