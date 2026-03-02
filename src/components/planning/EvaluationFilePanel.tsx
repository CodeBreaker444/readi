'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import axios from 'axios';
import { Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface EvaluationFilePanelProps {
    evaluationId: number;
}

export function EvaluationFilePanel({
    evaluationId,
}: EvaluationFilePanelProps) {
    const [files, setFiles] = useState<EvaluationFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLInputElement>(null);
    const verRef = useRef<HTMLInputElement>(null);

    // Initial load only
    const fetchFiles = async () => {
        if (evaluationId <= 0) return;
        try {
            setIsLoading(true);
            const res = await axios.get(`/api/evaluation/${evaluationId}/files`);
            setFiles(res.data.data ?? []);
        } catch (err) {
            toast.error('Failed to load files');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [evaluationId]);

    // ─── Handle Upload (Local State Update) ──────────────────────────────────
    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        const file = fileInputRef.current?.files?.[0];
        if (!file) return toast.error('Please select a file');

        const fd = new FormData();
        fd.append('evaluation_file', file);
        fd.append('evaluation_file_desc', descRef.current?.value ?? '');
        fd.append('evaluation_file_ver', verRef.current?.value ?? '1.0');

        try {
            setIsUploading(true);
            // Assuming the API returns the new file object in res.data.data
            const res = await axios.post(`/api/evaluation/${evaluationId}/files`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const newFile = res.data.data;

            // Update state locally by appending the new file
            setFiles((prev) => [...prev, newFile]);
            
            toast.success('File uploaded');

            // Reset UI
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (descRef.current) descRef.current.value = '';
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setIsUploading(false);
        }
    }

    async function handleDelete(file: EvaluationFile) {
        try {
            await axios.delete(`/api/evaluation/${evaluationId}/files`);

            toast.success('File deleted');
            
            setFiles(prev => prev.filter(f => f.evaluation_file_id !== file.evaluation_file_id));
        } catch {
            toast.error('Delete failed');
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Evaluation Documents
                    <Badge variant="secondary" className="text-xs">
                        {files.length}
                    </Badge>
                </h3>
            </div>

            <div className="rounded-md border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="text-xs h-8 px-3">#</TableHead>
                            <TableHead className="text-xs h-8 px-3">Filename</TableHead>
                            <TableHead className="text-xs h-8 px-3">Description</TableHead>
                            <TableHead className="text-xs h-8 px-3">Version</TableHead>
                            <TableHead className="text-xs h-8 px-3">Size (MB)</TableHead>
                            <TableHead className="text-xs h-8 px-3">Modified</TableHead>
                            <TableHead className="text-xs h-8 px-3 w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <TableCell key={j} className="px-3 py-2">
                                            <Skeleton className="h-3 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : files.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="text-center text-xs text-slate-400 py-8"
                                >
                                    No files uploaded yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            files.map((file) => (
                                <TableRow key={file.evaluation_file_id}>
                                    <TableCell className="px-3 py-2 text-xs font-mono text-slate-400">
                                        {file.evaluation_file_id}
                                    </TableCell>
                                    <TableCell className="px-3 py-2">
                                        <a
                                            href={`/api/evaluations/${evaluationId}/files/download?key=${encodeURIComponent(file.evaluation_file_folder)}`}
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                            download={file.evaluation_file_filename}
                                        >
                                            <Download className="w-3 h-3 shrink-0" />
                                            {file.evaluation_file_filename}
                                        </a>
                                    </TableCell>
                                    <TableCell className="px-3 py-2 text-xs text-slate-600">
                                        {file.evaluation_file_desc || '—'}
                                    </TableCell>
                                    <TableCell className="px-3 py-2 text-xs font-mono">
                                        v{file.evaluation_file_ver}
                                    </TableCell>
                                    <TableCell className="px-3 py-2 text-xs text-slate-500">
                                        {file.evaluation_file_filesize?.toFixed(2)} MB
                                    </TableCell>
                                    <TableCell className="px-3 py-2 text-xs text-slate-400 font-mono">
                                        {file.last_update
                                            ? new Date(file.last_update).toLocaleDateString()
                                            : '—'}
                                    </TableCell>
                                    <TableCell className="px-3 py-2">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete file?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Delete <strong>{file.evaluation_file_filename}</strong>? This cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(file)}
                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <form onSubmit={handleUpload} className="border border-dashed border-slate-300 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-500 mb-3">Upload new file</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div className="sm:col-span-1 space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input ref={descRef} placeholder="File description…" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Version</Label>
                        <Input ref={verRef} defaultValue="1.0" placeholder="1.0" className="h-8 text-xs" />
                    </div>
                    <div className="sm:col-span-1 space-y-1">
                        <Label className="text-xs">File</Label>
                        <Input ref={fileInputRef} type="file" className="h-8 text-xs" />
                    </div>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isUploading}
                        className="gap-1.5 h-8"
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