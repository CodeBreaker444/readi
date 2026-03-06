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
import { Download, FolderOpen, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Button } from "../ui/button";

interface RepositoryFilesCardProps {
  logbookFiles: RepositoryFile[];
  testFiles: RepositoryFile[];
  onFileDeleted?: () => void;
}

function FileTable({
  files,
  label,
  fileType,
  onFileDeleted,
}: {
  files: RepositoryFile[];
  label: string;
  fileType: "mission_planning_logbook" | "mission_planning_test_logbook";
  onFileDeleted?: () => void;
}) {
  const [downloading, setDownloading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<RepositoryFile | null>(null);

  const handleDownload = async (file: RepositoryFile) => {
    try {
      setDownloading(file.file_id);
      const key = file.repository_folder || "";
      if (!key) {
        toast.error("No file key available.");
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
      console.error("Download failed:", err);
      toast.error("Failed to download file.");
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
      toast.success("File deleted successfully.");
      onFileDeleted?.();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete file.");
    } finally {
      setDeleting(null);
      setFileToDelete(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Filename</TableHead>
              <TableHead className="text-center">File Size</TableHead>
              <TableHead>Last Action</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-16 text-center text-muted-foreground"
                >
                  No files found.
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.file_id}>
                  <TableCell>{label}</TableCell>
                  <TableCell>
                    {file.repository_filename_description || ""}
                  </TableCell>
                  <TableCell>{file.repository_filename}</TableCell>
                  <TableCell className="text-center">
                    {file.repository_filesize || ""}
                  </TableCell>
                  <TableCell>{file.last_update || ""}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloading === file.file_id}
                        onClick={() => handleDownload(file)}
                      >
                        {downloading === file.file_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span className="sr-only">Download</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleting === file.file_id}
                        onClick={() => confirmDelete(file)}
                      >
                        {deleting === file.file_id ? "..." : "Delete"}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{fileToDelete?.repository_filename}</strong> from storage.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 text-destructive-foreground hover:bg-red-500/90"
            >
              Delete
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
}: RepositoryFilesCardProps) {
  return (
    <div className="p-4">
      <Tabs defaultValue="logbook">
        <TabsList>
          <TabsTrigger value="logbook" className="gap-1">
            <FolderOpen className="h-3 w-3" />
            Mission Planning Files
            <Badge variant="secondary" className="ml-1">
              {logbookFiles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-1">
            <FolderOpen className="h-3 w-3" />
            Mission Planning Test Files
            <Badge variant="secondary" className="ml-1">
              {testFiles.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="logbook" className="mt-4">
          <FileTable
            files={logbookFiles}
            label="Mission Planning Files"
            fileType="mission_planning_logbook"
            onFileDeleted={onFileDeleted}
          />
        </TabsContent>
        <TabsContent value="test" className="mt-4">
          <FileTable
            files={testFiles}
            label="Mission Planning Test Files"
            fileType="mission_planning_test_logbook"
            onFileDeleted={onFileDeleted}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}