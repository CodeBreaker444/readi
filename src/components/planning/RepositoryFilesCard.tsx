"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepositoryFile } from "@/config/types/evaluation-planning";
import { getFileDownloadUrl } from "@/lib/get-download-url";
import axios from "axios";
import { Download, FolderOpen, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

interface RepositoryFilesCardProps {
  logbookFiles: RepositoryFile[];
  testFiles: RepositoryFile[];
  onFileDeleted?: () => void;
  isDark: boolean;
}

function FileTable({
  files,
  label,
  fileType,
  onFileDeleted,
  isDark,
}: {
  files: RepositoryFile[];
  label: string;
  fileType: "mission_planning_logbook" | "mission_planning_test_logbook";
  onFileDeleted?: () => void;
  isDark: boolean;
}) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<RepositoryFile | null>(null);

  const handleDownload = async (file: RepositoryFile) => {
    try {
      setDownloading(file.file_id);
      const key = file.repository_folder || "";
      if (!key) {
        toast.error(t("planning.files.noFileKey"));
        return;
      }
      const url = await getFileDownloadUrl(key);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.repository_filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error(t("planning.files.downloadFailed"));
    } finally {
      setDownloading(null);
    }
  };

  const confirmDelete = (file: RepositoryFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    try {
      setDeleting(fileToDelete.file_id);
      setDeleteDialogOpen(false);
      await axios.post("/api/evaluation/planning/delete-repository-file", {
        file_id: fileToDelete.file_id,
        file_type: fileType,
        s3_key: fileToDelete.repository_folder || "",
      });
      toast.success(t("planning.files.missionDeleteSuccess"));
      onFileDeleted?.();
    } catch (err) {
      toast.error(t("planning.files.missionDeleteFailed"));
    } finally {
      setDeleting(null);
      setFileToDelete(null);
    }
  };

  return (
    <>
      <div className={`rounded-md border ${isDark ? "border-slate-800" : ""}`}>
        <Table>
          <TableHeader className={isDark ? "bg-slate-900/50" : "bg-slate-50/50"}>
            <TableRow className={isDark ? "border-slate-800 hover:bg-transparent" : ""}>
              <TableHead className={isDark ? "text-slate-400" : ""}>{t("planning.files.type")}</TableHead>
              <TableHead className={isDark ? "text-slate-400" : ""}>{t("planning.form.description")}</TableHead>
              <TableHead className={isDark ? "text-slate-400" : ""}>{t("planning.files.filename")}</TableHead>
              <TableHead className={`text-center ${isDark ? "text-slate-400" : ""}`}>{t("planning.files.fileSize")}</TableHead>
              <TableHead className={isDark ? "text-slate-400" : ""}>{t("planning.files.lastAction")}</TableHead>
              <TableHead className={`text-center ${isDark ? "text-slate-400" : ""}`}>{t("planning.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow className={isDark ? "border-slate-800 hover:bg-transparent" : ""}>
                <TableCell
                  colSpan={6}
                  className={`h-16 text-center ${isDark ? "text-slate-500" : "text-muted-foreground"}`}
                >
                  {t("planning.files.noFiles")}
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.file_id} className={isDark ? "border-slate-800 hover:bg-slate-800/40" : ""}>
                  <TableCell className={isDark ? "text-slate-300" : ""}>{label}</TableCell>
                  <TableCell className={isDark ? "text-slate-300" : ""}>
                    {file.repository_filename_description || ""}
                  </TableCell>
                  <TableCell className={isDark ? "text-slate-300 font-mono text-[11px]" : ""}>
                    {file.repository_filename}
                  </TableCell>
                  <TableCell className={`text-center ${isDark ? "text-slate-400" : ""}`}>
                    {file.repository_filesize || ""}
                  </TableCell>
                  <TableCell className={isDark ? "text-slate-400" : ""}>
                    {file.last_update || ""}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={isDark ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200" : ""}
                        disabled={downloading === file.file_id}
                        onClick={() => handleDownload(file)}
                        title={t("planning.files.download")}
                      >
                        {downloading === file.file_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className={isDark ? "bg-red-950/50 text-red-400 border border-red-900/50 hover:bg-red-900/50" : ""}
                        disabled={deleting === file.file_id}
                        onClick={() => confirmDelete(file)}
                        title={t("planning.actions.delete")}
                      >
                        {deleting === file.file_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className={isDark ? "bg-slate-900 border-slate-800" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? "text-slate-100" : ""}>{t("planning.files.deleteFileTitle")}</AlertDialogTitle>
            <AlertDialogDescription className={isDark ? "text-slate-400" : ""}>
              {t("planning.files.deleteFileDescPrefix")}{" "}
              <strong className={isDark ? "text-slate-200" : ""}>{fileToDelete?.repository_filename}</strong>{" "}
              {t("planning.files.deleteFileDescSuffix")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? "bg-slate-800 border-slate-700 text-slate-300" : ""}>
              {t("planning.form.no")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t("planning.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function RepositoryFilesCard({
  logbookFiles = [],
  testFiles = [],
  onFileDeleted,
  isDark,
}: RepositoryFilesCardProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4">
      <Tabs defaultValue="logbook" className="w-full">
        <TabsList className={isDark ? "bg-slate-950 border border-slate-800" : ""}>
          <TabsTrigger 
            value="logbook" 
            className={`gap-1.5 ${isDark ? "data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400" : ""}`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {t("planning.files.missionFiles")}
            <Badge 
              variant={isDark ? "outline" : "secondary"} 
              className={`ml-1 text-[10px] px-1 ${isDark ? "border-slate-700 text-slate-400" : ""}`}
            >
              {logbookFiles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="test" 
            className={`gap-1.5 ${isDark ? "data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400" : ""}`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {t("planning.files.missionTestFiles")}
            <Badge 
              variant={isDark ? "outline" : "secondary"} 
              className={`ml-1 text-[10px] px-1 ${isDark ? "border-slate-700 text-slate-400" : ""}`}
            >
              {testFiles.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="logbook" className="mt-4">
          <FileTable
            files={logbookFiles}
            label={t("planning.files.missionFiles")}
            fileType="mission_planning_logbook"
            onFileDeleted={onFileDeleted}
            isDark={isDark}
          />
        </TabsContent>
        <TabsContent value="test" className="mt-4">
          <FileTable
            files={testFiles}
            label={t("planning.files.missionTestFiles")}
            fileType="mission_planning_test_logbook"
            onFileDeleted={onFileDeleted}
            isDark={isDark}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}