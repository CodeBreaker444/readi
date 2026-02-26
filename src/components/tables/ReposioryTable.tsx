'use client';

import type { DocType, RepositoryDocument } from '@/config/types/repository';
import {
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { FilterX, Plus, RotateCcw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DocumentFormModal from '../document-repository/DocumentModal';
import HistoryModal from '../document-repository/HistoryModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useTheme } from '../useTheme';
import { getRepositoryColumns } from './DocumentColumn';
import { TablePagination } from './Pagination';

const AREA_OPTIONS = [
    'BOARD', 'COMPLIANCE', 'DATACONTROLLER', 'MAINTENANCE',
    'OPERATION', 'SAFETY', 'SECURITY', 'TRAINING', 'VENDOR',
];


export default function RepositoryTable() {
    const { isDark } = useTheme()
    const [documents, setDocuments] = useState<RepositoryDocument[]>([]);
    const [docTypes, setDocTypes] = useState<DocType[]>([]);
    const [statusOptions, setStatusOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchText, setSearchText] = useState('');
    const [filterArea, setFilterArea] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const [formOpen, setFormOpen] = useState(false);
    const [editDoc, setEditDoc] = useState<RepositoryDocument | null>(null);
    const [histOpen, setHistOpen] = useState(false);
    const [histDoc, setHistDoc] = useState<RepositoryDocument | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<RepositoryDocument | null>(null);

    useEffect(() => {
        axios.post(`/api/document/type-list`)
            .then((res) => setDocTypes(res.data.items))
            .catch(console.error);
    }, []);

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.post(
                `/api/document/list`,
                {
                    area: filterArea === 'all' ? undefined : filterArea,
                    status: filterStatus === 'all' ? undefined : filterStatus,
                    search: searchText || undefined,
                }
            );
            setDocuments(data.items);
            setStatusOptions(data.filters.status);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [filterArea, filterStatus, searchText]);

    useEffect(() => {
        const t = setTimeout(loadDocuments, 300);
        return () => clearTimeout(t);
    }, [loadDocuments]);

    const handleEdit = useCallback((doc: RepositoryDocument) => {
        setEditDoc(doc);
        setFormOpen(true);
    }, []);



    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return;

        try {
            await axios.post(`/api/document/delete`, {
                document_id: deleteTarget.document_id,
            });

            setDocuments((prev) => prev.filter((d) => d.document_id !== deleteTarget.document_id));
            toast.success('Document deleted successfully.');
        } catch (e) {
            console.error(e);
            toast.error('Error during deletion.');
        } finally {
            setDeleteTarget(null);
        }
    }, [deleteTarget]);

    const handleHistory = useCallback((doc: RepositoryDocument) => {
        setHistDoc(doc);
        setHistOpen(true);
    }, []);

    const handleDeleteTrigger = useCallback((doc: RepositoryDocument) => {
        setDeleteTarget(doc);
    }, []);

    const columns = useMemo(
        () => getRepositoryColumns({
            onEdit: handleEdit,
            onDelete: handleDeleteTrigger,
            onHistory: handleHistory
        }),
        [handleEdit, handleDeleteTrigger, handleHistory]
    );
    const table = useReactTable({
        data: documents,
        columns,
        state: { sorting, columnFilters },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 8 } },
    });

    function resetFilters() {
        setSearchText('');
        setFilterArea('all');
        setFilterStatus('all');
    }

return (
        <div className="flex flex-col min-h-screen w-full bg-background">
            <div className={`sticky top-0 z-10 backdrop-blur-md transition-colors w-full ${
                isDark
                    ? "bg-slate-900/80 border-b border-slate-800 text-white"
                    : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                } px-6 py-4`}>
                <div className="mx-auto max-w-[1800px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 rounded-full bg-violet-600" />
                        <div>
                            <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                LUC Document Repository
                            </h1>
                            <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                Manage and track organizational compliance documents
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => { setEditDoc(null); setFormOpen(true); }}
                            className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm shadow-violet-500/20"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New Document
                        </Button>
                    </div>
                </div>
            </div>

            <div className="w-full px-6 pt-8 pb-8 mx-auto max-w-[1800px] space-y-6">
                
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Search title, code, description..."
                                className="pl-9"
                            />
                        </div>

                        <Select value={filterArea} onValueChange={setFilterArea}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Areas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Areas</SelectItem>
                                {AREA_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Button variant="outline" onClick={resetFilters} className="gap-2 text-xs h-9">
                            <RotateCcw className="h-4 w-4" /> Reset
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map((header) => (
                                        <TableHead key={header.id} style={{ width: header.getSize() }} className="text-xs uppercase font-semibold">
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, rowIndex) => (
                                    <TableRow key={`skeleton-row-${rowIndex}`}>
                                        {columns.map((_, cellIndex) => (
                                            <TableCell key={`skeleton-cell-${cellIndex}`} className="py-4">
                                                <Skeleton
                                                    className={`h-4 rounded-md ${
                                                        cellIndex === 0 ? "w-8" :
                                                        cellIndex === 1 ? "w-24" :
                                                        "w-[80%]"
                                                    }`}
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-72 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <FilterX className="h-10 w-10 opacity-20" />
                                            <p>No documents match your search criteria.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id} className="group transition-colors hover:bg-muted/30">
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-3">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                <TablePagination table={table} />
            </div>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <span className="font-semibold text-foreground">"{deleteTarget?.title}"</span> and remove its data from our servers. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete Document
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <DocumentFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSaved={loadDocuments}
                docTypes={docTypes}
                document={editDoc}
            />
            
            <HistoryModal
                open={histOpen}
                onClose={() => setHistOpen(false)}
                document={histDoc}
            />
        </div>
    );
}