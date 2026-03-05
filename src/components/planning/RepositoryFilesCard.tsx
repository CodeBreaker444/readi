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
import { FolderOpen } from "lucide-react";

interface RepositoryFilesCardProps {
  logbookFiles: RepositoryFile[];
  testFiles: RepositoryFile[];
}

function FileTable({
  files,
  label,
}: {
  files: RepositoryFile[];
  label: string;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Filename</TableHead>
            <TableHead className="text-center">File Size</TableHead>
            <TableHead>Last Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
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
                <TableCell>
                  <a
                    href={file.document_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    {file.repository_filename}
                  </a>
                </TableCell>
                <TableCell className="text-center">
                  {file.repository_filesize || ""}
                </TableCell>
                <TableCell>{file.last_update || ""}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function RepositoryFilesCard({
  logbookFiles = [],
  testFiles = [],
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
          <FileTable files={logbookFiles} label="Mission Planning Files" />
        </TabsContent>
        <TabsContent value="test" className="mt-4">
          <FileTable files={testFiles} label="Mission Planning Test Files" />
        </TabsContent>
      </Tabs>
    </div>
  );
}