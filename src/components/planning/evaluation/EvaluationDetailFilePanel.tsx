'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { FileText, Loader2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getEvaluationFileColumns } from '@/components/tables/EvaluationFileColumn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EvaluationFile } from '@/config/types/evaluation';

interface Props {
  evaluationId: number;
  clientId: number;
}

export function EvaluationDetailFilePanel({ evaluationId, clientId }: Props) {
  const [files, setFiles] = useState<EvaluationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const verRef = useRef<HTMLInputElement>(null);

  async function fetchFiles() {
    if (evaluationId <= 0) return;
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/evaluation/${evaluationId}/files`);
      setFiles(res.data.data ?? []);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, [evaluationId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return toast.error('Please select a file');

    const fd = new FormData();
    fd.append('evaluation_file', file);
    fd.append('evaluation_file_desc', descRef.current?.value ?? '');
    fd.append('evaluation_file_ver', verRef.current?.value ?? '1.0');
    fd.append('fk_client_id', String(clientId));

    try {
      setIsUploading(true);
      await axios.post(`/api/evaluation/${evaluationId}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('File uploaded');
      fetchFiles();
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (descRef.current) descRef.current.value = '';
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(file: EvaluationFile) {
    try {
      await axios.delete(
        `/api/evaluation/${evaluationId}/files?fileId=${file.evaluation_file_id}`,
      );
      toast.success('File deleted');
      setFiles((prev) =>
        prev.filter((f) => f.evaluation_file_id !== file.evaluation_file_id),
      );
    } catch {
      toast.error('Delete failed');
    }
  }

  const columns = useMemo(
    () => getEvaluationFileColumns(evaluationId, handleDelete),
    [evaluationId],
  );

  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">
          Evaluation Documents
        </h3>
        <Badge variant="secondary" className="text-xs">
          {files.length}
        </Badge>
      </div>

      <div className="rounded-md border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-slate-50 hover:bg-slate-50">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs h-8 px-3">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j} className="px-3 py-2">
                      <Skeleton className="h-3 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-xs text-slate-400 py-8"
                >
                  No files uploaded yet.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <form
        onSubmit={handleUpload}
        className="border border-dashed border-slate-300 rounded-lg p-4"
      >
        <p className="text-xs font-medium text-slate-500 mb-3">
          Upload new file
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              ref={descRef}
              placeholder="File description…"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Version</Label>
            <Input
              ref={verRef}
              defaultValue="1.0"
              placeholder="1.0"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">File</Label>
            <Input ref={fileInputRef} type="file" className="h-8 text-xs" />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isUploading}
            className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700 cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Upload
          </Button>
        </div>
      </form>
    </div>
  );
}