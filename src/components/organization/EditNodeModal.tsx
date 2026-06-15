"use client";

import { OrgNode } from "@/backend/services/organization/organization-service";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface EditNodeModalProps {
  node: OrgNode;
  members: OrgNode[];
  isDark: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const COMPANY_ROOT_VALUE = "__company_root__";

export default function EditNodeModal({
  node,
  members,
  isDark,
  onClose,
  onSaved,
}: EditNodeModalProps) {
  const { t } = useTranslation();
  const [position, setPosition] = useState(node.data.title);
  const [parentValue, setParentValue] = useState<string>(COMPANY_ROOT_VALUE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPosition(node.data.title);
    const parentNode = members.find((m) =>
      m.children?.some((c) => c.userId === node.userId)
    );
    setParentValue(parentNode?.userId !== undefined ? String(parentNode.userId) : COMPANY_ROOT_VALUE);
  }, [node, members]);

  const eligibleParents = members.filter((m) => m.userId !== node.userId);

  async function handleSave() {
    if (!position.trim()) {
      toast.error(t('organization.chart.edit.toasts.positionRequired'));
      return;
    }
    setSaving(true);
    try {
      const parentUserId =
        parentValue === COMPANY_ROOT_VALUE ? null : Number(parentValue);

      const res = await fetch("/api/organization/chart/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: node.userId,
          position: position.trim(),
          parentUserId,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.code !== 1) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      toast.success(t('organization.chart.edit.toasts.saveSuccess'));
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('organization.chart.edit.toasts.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = `w-full text-sm ${
    isDark
      ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
  }`;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className={`sm:max-w-md ${isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white text-slate-900"}`}
      >
        <DialogHeader>
          <DialogTitle className={isDark ? "text-slate-100" : "text-slate-900"}>
            {t('organization.chart.edit.title')}
          </DialogTitle>
          <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {node.data.name}
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Position */}
          <div className="space-y-1.5">
            <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t('organization.chart.edit.positionLabel')}
            </p>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t('organization.chart.edit.positionPlaceholder')}
              className={inputCls}
            />
          </div>

          {/* Parent */}
          <div className="space-y-1.5">
            <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t('organization.chart.edit.reportsToLabel')}
            </p>
            <Select value={parentValue} onValueChange={setParentValue}>
              <SelectTrigger className={inputCls}>
                <SelectValue placeholder={t('organization.chart.edit.selectParent')} />
              </SelectTrigger>
              <SelectContent className={isDark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}>
                <SelectItem value={COMPANY_ROOT_VALUE}>
                  {t('organization.chart.edit.companyRoot')}
                </SelectItem>
                {eligibleParents.map((m) => (
                  <SelectItem key={m.userId} value={String(m.userId)}>
                    {m.data.name || m.data.email} — {m.data.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className={isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : ""}
          >
            {t('organization.common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {saving ? t('organization.common.saving') : t('organization.chart.edit.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
