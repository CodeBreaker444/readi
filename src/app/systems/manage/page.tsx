'use client';

import AddComponentModal from '@/components/system/AddComponentModal';
import AddModelModal from '@/components/system/AddModelModal';
import AddSystemModal from '@/components/system/AddSystemModal';
import { ComponentLogModal } from '@/components/system/ComponentLogModal';
import DataTable from '@/components/system/DataTable';
import EditComponentModal from '@/components/system/EditComponentModal';
import EditModelModal from '@/components/system/EditModelModal';
import EditSystemModal from '@/components/system/EditSystemModal';
import { FilesDownloadModal, SystemFile } from '@/components/system/FilesDownloadModal';
import ViewComponentModal from '@/components/system/ViewComponentModal';
import ViewToolModal from '@/components/system/ViewToolModal';
import { DroneToolData, getComponentColumns, getModelColumns, systemCreateColumns } from '@/components/tables/SystemColumn';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { AlertTriangle, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type ActiveTab = 'system' | 'model' | 'component' | 'maintenance';

interface DeleteConfirm {
    open: boolean;
    type: 'system' | 'model' | 'component';
    id: number;
    name: string;
    warning: string;
    canDelete: boolean;
    usedBy?: { systems: any[]; components: any[] };
    attachedSystemCode?: string;
}

export default function DroneToolPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState<boolean>(false);
    const [toolData, setToolData] = useState<DroneToolData[]>([]);
    const [activeTab, setActiveTab] = useState<ActiveTab>('system');

    const [showAddTool, setShowAddTool] = useState<boolean>(false);
    const [showAddModel, setShowAddModel] = useState<boolean>(false);
    const [showAddComponent, setShowAddComponent] = useState<boolean>(false);
    const [showViewTool, setShowViewTool] = useState<boolean>(false);
    const [showViewComponent, setShowViewComponent] = useState<boolean>(false);
    const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
    const [showComponentLog, setShowComponentLog] = useState<boolean>(false);
    const [logComponent, setLogComponent] = useState<any | null>(null);
    const [showEditSystem, setShowEditSystem] = useState<boolean>(false);
    const [showEditModel, setShowEditModel] = useState<boolean>(false);
    const [showEditComponent, setShowEditComponent] = useState<boolean>(false);
    const [selectedToolId, setSelectedToolId] = useState<number | null>(null);
    const [directModelId, setDirectModelId] = useState<number | null>(null);
    const [directComponentId, setDirectComponentId] = useState<number | null>(null);

    const [models, setModels] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [tools, setTools] = useState<DroneToolData[]>([]);
    const [componentData, setComponentData] = useState<any[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [loadingComponents, setLoadingComponents] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [detachingComponent, setDetachingComponent] = useState(false);

    const [filesModal, setFilesModal] = useState<{
        open: boolean;
        toolCode: string;
        files: SystemFile[];
    }>({ open: false, toolCode: '', files: [] });

    useEffect(() => {
        fetchToolData();
        fetchModels();
        fetchClients();
    }, []);

    useEffect(() => {
        if (activeTab === 'component') fetchAllComponents();
    }, [activeTab]);

    const fetchToolData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/system/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: 'ALL', status: 'ALL' }),
            });
            const result = await response.json();
            if (result.code === 1) {
                setToolData(result.data);
                setTools(result.data);
            } else {
                toast.error(result.message || 'Failed to fetch System data');
            }
        } catch {
            toast.error('Error fetching System data');
        } finally {
            setLoading(false);
        }
    };

    const fetchModels = async () => {
        setLoadingModels(true);
        try {
            const response = await fetch('/api/system/model/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const result = await response.json();
            if (result.code === 1) setModels(result.data);
        } catch (error) {
            console.error('Error fetching models:', error);
        } finally {
            setLoadingModels(false);
        }
    };

   
    const fetchAllComponents = async () => {
        setLoadingComponents(true);
        try {
            const response = await fetch('/api/system/component/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const result = await response.json();
            if (result.code === 1) setComponentData(result.data);
        } catch (error) {
            console.error('Error fetching components:', error);
        } finally {
            setLoadingComponents(false);
        }
    };

    const fetchClients = async () => {
        try {
            const response = await axios.get('/api/client/list');
            if (!response.data.data) {
                toast.error('Failed to load Clients');
                return;
            }
            setClients(response.data.data ?? []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const handleView = (toolId: number) => { setSelectedToolId(toolId); setShowViewTool(true); };
    const handleViewComponent = (row: any) => { setSelectedComponent(row); setShowViewComponent(true); };
    const handleLogComponent = (row: any) => { setLogComponent(row); setShowComponentLog(true); };
    const handleEditSystem = (tool: DroneToolData) => { setSelectedToolId(tool.tool_id); setShowEditSystem(true); };

    const handleDelete = async (toolId: number) => {
        const tool = toolData.find(t => t.tool_id === toolId);
        setDeleteConfirm({
            open: true,
            type: 'system',
            id: toolId,
            name: tool?.tool_code || `#${toolId}`,
            warning: 'Deleting this system will deactivate it. Attached components will remain and are not deleted.',
            canDelete: true,
        });
    };

    const handleViewFiles = (tool: DroneToolData) => {
        setFilesModal({ open: true, toolCode: tool.tool_code, files: tool.files ?? [] });
    };

    const handleEditModelDirect = (modelId: number) => {
        setSelectedToolId(null);
        setDirectModelId(modelId);
        setShowEditModel(true);
    };

    const handleDeleteModel = (modelId: number, modelName: string) => {
        setDeleteConfirm({
            open: true,
            type: 'model',
            id: modelId,
            name: modelName,
            warning: 'This model will be permanently removed from the platform.',
            canDelete: true,
        });
    };

    const handleEditComponentDirect = (componentId: number) => {
        setSelectedToolId(null);
        setDirectComponentId(componentId);
        setShowEditComponent(true);
    };

    const handleDeleteComponent = (componentId: number, componentName: string) => {
        setDeleteConfirm({
            open: true,
            type: 'component',
            id: componentId,
            name: componentName,
            warning: 'This component will be permanently removed from the platform.',
            canDelete: true,
        });
    };

    const handleDetachFromSystem = async () => {
        if (!deleteConfirm) return;
        setDetachingComponent(true);
        try {
            const res = await fetch(`/api/system/component/${deleteConfirm.id}/detach`, { method: 'POST' });
            const result = await res.json();
            if (result.code === 1) {
                toast.success('Component detached from system');
                setDeleteConfirm(null);
                fetchAllComponents();
            } else {
                toast.error(result.message || 'Failed to detach component');
            }
        } catch {
            toast.error('Error detaching component');
        } finally {
            setDetachingComponent(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            if (deleteConfirm.type === 'system') {
                const res = await fetch(`/api/system/${deleteConfirm.id}/delete`, { method: 'POST' });
                const result = await res.json();
                if (result.code === 1) {
                    toast.success('System deactivated successfully');
                    setDeleteConfirm(null);
                    fetchToolData();
                } else {
                    toast.error(result.message || 'Failed to delete system');
                    setDeleteConfirm(null);
                }
            } else if (deleteConfirm.type === 'model') {
                const res = await fetch(`/api/system/model/${deleteConfirm.id}/delete`, { method: 'POST' });
                const result = await res.json();
                if (result.code === 1) {
                    toast.success('Model deleted successfully');
                    setDeleteConfirm(null);
                    fetchModels();
                } else {
                    const { systems = [], components = [] } = result.usedBy || {};
                    setDeleteConfirm(prev => prev ? {
                        ...prev,
                        warning: result.message,
                        canDelete: false,
                        usedBy: { systems, components },
                    } : null);
                }
            } else if (deleteConfirm.type === 'component') {
                const res = await fetch(`/api/system/component/${deleteConfirm.id}/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ force: false }),
                });
                const result = await res.json();
                if (result.code === 1) {
                    toast.success('Component deleted successfully');
                    setDeleteConfirm(null);
                    fetchAllComponents();
                } else if (result.code === 2) {
                    setDeleteConfirm(prev => prev ? {
                        ...prev,
                        warning: result.message,
                        canDelete: false,
                        attachedSystemCode: result.system_code,
                    } : null);
                } else {
                    toast.error(result.message || 'Failed to delete component');
                    setDeleteConfirm(null);
                }
            }
        } catch {
            toast.error('Error during delete');
            setDeleteConfirm(null);
        } finally {
            setDeleting(false);
        }
    };

    const toolCodeMap = useMemo(() => {
        const map: Record<number, string> = {};
        toolData.forEach(t => { map[t.tool_id] = t.tool_code; });
        return map;
    }, [toolData]);

    const systemColumns = useMemo(
        () =>
            systemCreateColumns({
                onView: handleView,
                onDelete: handleDelete,
                onEditSystem: handleEditSystem,
                onViewFiles: handleViewFiles,
                isDark,
            }),
        [isDark, toolData],
    );

const modelColumns = useMemo(
        () => getModelColumns({ 
            isDark, 
            onEdit: handleEditModelDirect, 
            onDelete: handleDeleteModel 
        }),
        [isDark]
    );

    const componentColumns = useMemo(
        () => getComponentColumns({
            isDark,
            toolCodeMap,
            onView: handleViewComponent,
            onEdit: handleEditComponentDirect,
            onDelete: handleDeleteComponent,
            onLog: handleLogComponent,
        }),
        [isDark, toolCodeMap]
    );

    const tabConfig: { key: ActiveTab; label: string }[] = [
        { key: 'system', label: 'System' },
        { key: 'model', label: 'Model' },
        { key: 'component', label: 'Components' },
    ];

    return (
        <div className="min-h-screen">
            <div
                className={`top-0 z-10 backdrop-blur-md transition-colors ${
                    isDark
                        ? 'bg-slate-900/80 border-b border-slate-800 text-white'
                        : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                } px-6 py-4`}
            >
                <div className="mx-auto max-w-[1800px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 rounded-full bg-violet-600" />
                        <div>
                            <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Drone System List
                            </h1>
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Manage drone tools, models, and sub-components
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { fetchToolData(); fetchModels(); if (activeTab === 'component') fetchAllComponents(); }}
                            disabled={loading}
                            className={`h-8 gap-1.5 text-xs transition-all ${
                                isDark
                                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            <span className="hidden xs:inline">Refresh</span>
                        </Button>

                        <div className="flex gap-2 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <Button size="sm" onClick={() => setShowAddTool(true)}
                                className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                                <Plus size={14} /> Add System
                            </Button>
                            <Button size="sm" onClick={() => setShowAddModel(true)}
                                className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                                <Plus size={14} /> Add Model
                            </Button>
                            <Button size="sm" onClick={() => setShowAddComponent(true)}
                                className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                                <Plus size={14} /> Add Component
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 mx-auto max-w-[1800px]">
                <Card className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                    <div className={`flex gap-1  p-1 ml-3 rounded-lg w-fit ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    {tabConfig.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === key
                                    ? isDark
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'bg-white text-violet-700 shadow-sm'
                                    : isDark
                                    ? 'text-slate-400 hover:text-slate-200'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                    <CardContent className="pt-6">
                        {activeTab === 'system' && (
                            <DataTable columns={systemColumns} data={toolData} loading={loading} />
                        )}
                        {activeTab === 'model' && (
                            <DataTable columns={modelColumns} data={models} loading={loadingModels} />
                        )}
                        {activeTab === 'component' && (
                            <DataTable columns={componentColumns} data={componentData} loading={loadingComponents} />
                        )}
                    </CardContent>
                </Card>
            </div>

            {showAddTool && (
                <AddSystemModal open={showAddTool} onClose={() => setShowAddTool(false)}
                    onSuccess={() => { setShowAddTool(false); fetchToolData(); }}
                    models={models} clients={clients} />
            )}

            {showAddModel && (
                <AddModelModal open={showAddModel} onClose={() => setShowAddModel(false)}
                    onSuccess={() => { setShowAddModel(false); fetchModels(); }} />
            )}

            {showAddComponent && (
                <AddComponentModal open={showAddComponent} onClose={() => setShowAddComponent(false)}
                    onSuccess={() => setShowAddComponent(false)} tools={tools} models={models} />
            )}

            {showViewTool && selectedToolId && (
                <ViewToolModal open={showViewTool} toolId={selectedToolId}
                    onClose={() => { setShowViewTool(false); setSelectedToolId(null); }} />
            )}

            <ViewComponentModal
                open={showViewComponent}
                component={selectedComponent}
                systemCode={selectedComponent ? toolCodeMap[selectedComponent.fk_tool_id] : undefined}
                onClose={() => { setShowViewComponent(false); setSelectedComponent(null); }}
            />

            <ComponentLogModal
                open={showComponentLog}
                componentId={logComponent?.tool_component_id ?? null}
                componentLabel={logComponent
                    ? `${logComponent.component_type ?? ''}${logComponent.component_code ? ` — ${logComponent.component_code}` : ''}`
                    : ''}
                onClose={() => { setShowComponentLog(false); setLogComponent(null); }}
            />

            {showEditSystem && (
                <EditSystemModal open={showEditSystem} toolId={selectedToolId}
                    onClose={() => { setShowEditSystem(false); setSelectedToolId(null); }}
                    onSuccess={() => { setShowEditSystem(false); setSelectedToolId(null); fetchToolData(); }}
                    clients={clients} models={models} />
            )}

            {showEditModel && (
                <EditModelModal open={showEditModel} toolId={selectedToolId}
                    initialModelId={directModelId}
                    onClose={() => { setShowEditModel(false); setSelectedToolId(null); setDirectModelId(null); }}
                    onSuccess={() => { setShowEditModel(false); setSelectedToolId(null); setDirectModelId(null); fetchModels(); }} />
            )}

            {showEditComponent && (
                <EditComponentModal open={showEditComponent} toolId={selectedToolId}
                    initialComponentId={directComponentId}
                    onClose={() => { setShowEditComponent(false); setSelectedToolId(null); setDirectComponentId(null); }}
                    onSuccess={() => { setShowEditComponent(false); setSelectedToolId(null); setDirectComponentId(null); fetchAllComponents(); }}
                    models={models} clients={clients} tools={tools} />
            )}

            <FilesDownloadModal open={filesModal.open} toolCode={filesModal.toolCode} files={filesModal.files}
                onClose={() => setFilesModal({ open: false, toolCode: '', files: [] })} />

            {deleteConfirm && (
                <Dialog open={deleteConfirm.open} onOpenChange={() => setDeleteConfirm(null)}>
                    <DialogContent className={`max-w-lg ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
                        <DialogHeader>
                            <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                                <AlertTriangle className={`h-5 w-5 ${
                                    deleteConfirm.canDelete ? 'text-amber-500'
                                    : deleteConfirm.attachedSystemCode ? 'text-amber-500'
                                    : 'text-red-500'
                                }`} />
                                {deleteConfirm.canDelete
                                    ? `Delete ${deleteConfirm.type === 'model' ? 'Model' : deleteConfirm.type === 'component' ? 'Component' : 'System'}`
                                    : deleteConfirm.attachedSystemCode ? 'Component Attached to System'
                                    : 'Cannot Delete'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3 py-1">
                            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <span className="font-semibold">{deleteConfirm.name}</span>
                            </p>
                            <div className={`rounded-lg p-3 text-sm ${
                                deleteConfirm.canDelete
                                    ? isDark ? 'bg-amber-950/40 text-amber-300 border border-amber-800/50' : 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : isDark ? 'bg-red-950/40 text-red-300 border border-red-800/50' : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                                {deleteConfirm.warning}
                            </div>

                            {deleteConfirm.usedBy && (
                                <div className="space-y-2">
                                    {deleteConfirm.usedBy.systems.length > 0 && (
                                        <div>
                                            <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Systems using this model:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {deleteConfirm.usedBy.systems.map((s: any) => (
                                                    <span key={s.id} className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                                        {s.code}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {deleteConfirm.usedBy.components.length > 0 && (
                                        <div>
                                            <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Components using this model:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {deleteConfirm.usedBy.components.map((c: any) => (
                                                    <span key={c.id} className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                                        {c.code} ({c.type})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {deleteConfirm.type === 'component' && deleteConfirm.attachedSystemCode && (
                                <div className={`rounded-lg p-3 text-xs space-y-2 ${isDark ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}>
                                    <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Attached to system:
                                        <span className={`ml-2 px-2 py-0.5 rounded font-semibold ${isDark ? 'bg-violet-900/40 text-violet-300' : 'bg-violet-50 text-violet-700'}`}>
                                            {deleteConfirm.attachedSystemCode}
                                        </span>
                                    </p>
                                    <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                                        Detach the component from this system first, then you can delete it from the platform.
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={detachingComponent}
                                        onClick={handleDetachFromSystem}
                                        className={`mt-1 ${isDark ? 'border-slate-500 text-slate-300 hover:bg-slate-600' : 'border-slate-300 hover:bg-slate-100'}`}
                                    >
                                        {detachingComponent ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                        {detachingComponent ? 'Detaching...' : `Detach from ${deleteConfirm.attachedSystemCode}`}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setDeleteConfirm(null)}
                                className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
                                {deleteConfirm.canDelete ? 'Cancel' : 'Close'}
                            </Button>
                            {deleteConfirm.canDelete && !deleteConfirm.attachedSystemCode && (
                                <Button variant="destructive" disabled={deleting} onClick={handleConfirmDelete}>
                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
