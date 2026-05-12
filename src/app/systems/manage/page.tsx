'use client';

import AddComponentModal from '@/components/system/AddComponentModal';
import AddModelModal from '@/components/system/AddModelModal';
import AddSystemModal from '@/components/system/AddSystemModal';
import { ComponentFlightLogsModal } from '@/components/system/ComponentFlightLogsModal';
import { ComponentLogModal } from '@/components/system/ComponentLogModal';
import ComponentRelationsModal from '@/components/system/ComponentRelationsModal';
import DataTable from '@/components/system/DataTable';
import DuplicateSystemModal from '@/components/system/DuplicateSystemModal';
import EditComponentModal from '@/components/system/EditComponentModal';
import EditModelModal from '@/components/system/EditModelModal';
import EditSystemModal from '@/components/system/EditSystemModal';
import { FilesDownloadModal, SystemFile } from '@/components/system/FilesDownloadModal';
import SystemComponentsTable from '@/components/system/SystemComponentsTable';
import ViewComponentModal from '@/components/system/ViewComponentModal';
import ViewToolModal from '@/components/system/ViewToolModal';
import { DroneToolData, getComponentColumns, getModelColumns } from '@/components/tables/SystemColumn';
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
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type ActiveTab = 'system' | 'model' | 'component';

interface DeleteConfirm {
    open: boolean;
    type: 'system' | 'model' | 'component';
    id: number;
    name: string;
    warningKey?: string;
    warning?: string;
    canDelete: boolean;
    usedBy?: { systems: any[]; components: any[] };
    attachedSystemCode?: string;
}

export default function DroneToolPage() {
    const { isDark } = useTheme();
    const { t } = useTranslation();

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
    const [showFlightLogs, setShowFlightLogs] = useState<boolean>(false);
    const [flightLogsComponent, setFlightLogsComponent] = useState<any | null>(null);
    const [showEditSystem, setShowEditSystem] = useState<boolean>(false);
    const [showDuplicateSystem, setShowDuplicateSystem] = useState<boolean>(false);
    const [showEditModel, setShowEditModel] = useState<boolean>(false);
    const [showEditComponent, setShowEditComponent] = useState<boolean>(false);
    const [selectedToolId, setSelectedToolId] = useState<number | null>(null);
    const [duplicateSourceSystemId, setDuplicateSourceSystemId] = useState<number | null>(null);
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

    const [showRelations, setShowRelations] = useState(false);
    const [relationsToolId, setRelationsToolId] = useState<number | null>(null);
    const [relationsToolCode, setRelationsToolCode] = useState<string>('');

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
        fetchAllComponents();
    }, []);

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
         toast.error(result.message || t('systems.manage.toasts.fetchSystemFailed'));
            }
        } catch {
            toast.error(t('systems.manage.toasts.fetchSystemError'));
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
                toast.error(t('systems.manage.toasts.fetchClientsFailed'));
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
    const handleFlightLogsComponent = (row: any) => { setFlightLogsComponent(row); setShowFlightLogs(true); };
    const handleEditSystem = (tool: DroneToolData) => { setSelectedToolId(tool.tool_id); setShowEditSystem(true); };
    const handleDuplicateSystem = (tool: DroneToolData) => {
        setDuplicateSourceSystemId(tool.tool_id);
        setShowDuplicateSystem(true);
    };

    const handleDelete = async (toolId: number) => {
        const tool = toolData.find(t => t.tool_id === toolId);
        setDeleteConfirm({
            open: true,
            type: 'system',
            id: toolId,
            name: tool?.tool_code || `#${toolId}`,
            warningKey: 'systems.manage.deleteDialog.warningSystem',
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
            warningKey: 'systems.manage.deleteDialog.warningModel',
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
            warningKey: 'systems.manage.deleteDialog.warningComponent',
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
                toast.success(t('systems.manage.toasts.componentDetached'));
                setDeleteConfirm(null);
                fetchAllComponents();
            } else {
                toast.error(result.message || t('systems.manage.toasts.detachFailed'));
            }
        } catch {
            toast.error(t('systems.manage.toasts.detachError'));
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
                    toast.success(t('systems.manage.toasts.systemDeactivated'));
                    setDeleteConfirm(null);
                    fetchToolData();
                } else {
                    toast.error(result.message || t('systems.manage.toasts.deleteFailed'));
                    setDeleteConfirm(null);
                }
            } else if (deleteConfirm.type === 'model') {
                const res = await fetch(`/api/system/model/${deleteConfirm.id}/delete`, { method: 'POST' });
                const result = await res.json();
                if (result.code === 1) {
                    toast.success(t('systems.manage.toasts.modelDeleted'));
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
                    toast.success(t('systems.manage.toasts.componentDeleted'));
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
                    toast.error(result.message || t('systems.manage.toasts.componentDeleteFailed'));
                    setDeleteConfirm(null);
                }
            }
        } catch {
            toast.error(t('systems.manage.toasts.deleteError'));
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

    const modelMap = useMemo(() => {
        const map: Record<number, string> = {};
        models.forEach((m: any) => { map[m.tool_model_id] = `${m.factory_type} ${m.factory_model}`; });
        return map;
    }, [models]);

    const modelColumns = useMemo(
        () => getModelColumns({
            isDark,
            onEdit: handleEditModelDirect,
            onDelete: handleDeleteModel
        }),
        [isDark, t]
    );

    const componentColumns = useMemo(
        () => getComponentColumns({
            isDark,
            toolCodeMap,
            modelMap,
            onView: handleViewComponent,
            onEdit: handleEditComponentDirect,
            onDelete: handleDeleteComponent,
            onLog: handleLogComponent,
        }),
        [isDark, toolCodeMap, modelMap, t]
    );

    const standaloneComponents = useMemo(
        () => componentData.filter((c: any) => !c.fk_tool_id || c.system_detached),
        [componentData]
    );

    const tabConfig: { key: ActiveTab; label: string }[] = [
        { key: 'system', label: t('systems.manage.tabs.system') },
        { key: 'model', label: t('systems.manage.tabs.model') },
        { key: 'component', label: t('systems.manage.tabs.component') },
    ];

    return (
        <div className="min-h-screen">
            <div
                className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
                    ? 'bg-slate-900/80 border-b border-slate-800 text-white'
                    : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                    } px-3 sm:px-6 py-4`}
            >
                <div className="mx-auto max-w-[1800px] space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 shrink-0 rounded-full bg-violet-600" />
                            <div>
                                <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {t('systems.manage.title')}
                                </h1>
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {t('systems.manage.subtitle')}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { fetchToolData(); fetchModels(); fetchAllComponents(); }}
                            disabled={loading}
                            className={`sm:hidden h-8 gap-1.5 text-xs transition-all ${isDark
                                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        </Button>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { fetchToolData(); fetchModels(); fetchAllComponents(); }}
                            disabled={loading}
                            className={`hidden sm:flex h-8 gap-1.5 text-xs transition-all ${isDark
                                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            {t('systems.manage.refresh')}
                        </Button>

                        <Button size="sm" onClick={() => setShowAddTool(true)}
                            className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                            <Plus size={14} /><span className="sm:hidden">{t('systems.manage.buttons.system')}</span><span className="hidden sm:inline">{t('systems.manage.buttons.addSystem')}</span>
                        </Button>
                        <Button size="sm" onClick={() => setShowAddModel(true)}
                            className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                            <Plus size={14} /><span className="sm:hidden">{t('systems.manage.buttons.model')}</span><span className="hidden sm:inline">{t('systems.manage.buttons.addModel')}</span>
                        </Button>
                        <Button size="sm" onClick={() => setShowAddComponent(true)}
                            className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                            <Plus size={14} /><span className="sm:hidden">{t('systems.manage.buttons.component')}</span><span className="hidden sm:inline">{t('systems.manage.buttons.addComponent')}</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-3 sm:p-6 mx-auto max-w-[1800px]">
                <Card className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                    <div className={`flex gap-1  p-1 ml-3 rounded-lg w-fit ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        {tabConfig.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`px-5 cursor-pointer py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === key
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
                            <SystemComponentsTable
                                systems={toolData}
                                components={componentData}
                                modelMap={modelMap}
                                loading={loading || loadingComponents}
                                onViewSystem={handleView}
                                onEditSystem={handleEditSystem}
                                onDuplicateSystem={handleDuplicateSystem}
                                onDeleteSystem={handleDelete}
                                onViewFiles={handleViewFiles}
                                onViewComponent={handleViewComponent}
                                onEditComponent={handleEditComponentDirect}
                                onDeleteComponent={handleDeleteComponent}
                                onLogComponent={handleLogComponent}
                                onFlightLogsComponent={handleFlightLogsComponent}
                                onOpenRelations={(toolId, toolCode) => {
                                    setRelationsToolId(toolId);
                                    setRelationsToolCode(toolCode);
                                    setShowRelations(true);
                                }}
                            />
                        )}
                        {activeTab === 'model' && (
                            <DataTable columns={modelColumns} data={models} loading={loadingModels} exportFilename="models" />
                        )}
                        {activeTab === 'component' && (
                            <DataTable columns={componentColumns} data={standaloneComponents} loading={loadingComponents} exportFilename="components" />
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
                    onSuccess={() => { setShowAddComponent(false); fetchAllComponents(); fetchToolData(); }} tools={tools} models={models} />
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

            <ComponentFlightLogsModal
                open={showFlightLogs}
                componentId={flightLogsComponent?.tool_component_id ?? null}
                componentLabel={flightLogsComponent
                    ? `${flightLogsComponent.component_type ?? ''}${flightLogsComponent.component_code ? ` — ${flightLogsComponent.component_code}` : ''}`
                    : ''}
                onClose={() => { setShowFlightLogs(false); setFlightLogsComponent(null); }}
            />

            {showEditSystem && (
                <EditSystemModal open={showEditSystem} toolId={selectedToolId}
                    onClose={() => { setShowEditSystem(false); setSelectedToolId(null); }}
                    onSuccess={() => { setShowEditSystem(false); setSelectedToolId(null); fetchToolData(); }}
                    clients={clients} models={models} />
            )}

            <DuplicateSystemModal
                open={showDuplicateSystem}
                sourceSystemId={duplicateSourceSystemId}
                clients={clients}
                onClose={() => { setShowDuplicateSystem(false); setDuplicateSourceSystemId(null); }}
                onSuccess={() => {
                    setShowDuplicateSystem(false);
                    setDuplicateSourceSystemId(null);
                    fetchToolData();
                    fetchAllComponents();
                }}
            />

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
                    onSuccess={() => { setShowEditComponent(false); setSelectedToolId(null); setDirectComponentId(null); fetchAllComponents(); fetchToolData(); }}
                    models={models} clients={clients} tools={tools} />
            )}

            <FilesDownloadModal open={filesModal.open} toolCode={filesModal.toolCode} files={filesModal.files}
                onClose={() => setFilesModal({ open: false, toolCode: '', files: [] })} />

            <ComponentRelationsModal
                open={showRelations}
                toolId={relationsToolId}
                toolCode={relationsToolCode}
                tools={tools}
                onClose={() => { setShowRelations(false); setRelationsToolId(null); setRelationsToolCode(''); }}
                onSuccess={() => { fetchAllComponents(); fetchToolData(); }}
            />

            {deleteConfirm && (
                <Dialog open={deleteConfirm.open} onOpenChange={() => setDeleteConfirm(null)}>
                    <DialogContent className={`max-w-lg ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
                        <DialogHeader>
                            <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                                <AlertTriangle className={`h-5 w-5 ${deleteConfirm.canDelete ? 'text-amber-500'
                                    : deleteConfirm.attachedSystemCode ? 'text-amber-500'
                                        : 'text-red-500'
                                    }`} />
                                {deleteConfirm.canDelete
                                    ? t(`systems.manage.deleteDialog.delete${deleteConfirm.type.charAt(0).toUpperCase() + deleteConfirm.type.slice(1)}`)
                                    : deleteConfirm.attachedSystemCode ? t('systems.manage.deleteDialog.attachedToSystem')
                                        : t('systems.manage.deleteDialog.cannotDelete')}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3 py-1">
                            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <span className="font-semibold">{deleteConfirm.name}</span>
                            </p>
                            <div className={`rounded-lg p-3 text-sm ${deleteConfirm.canDelete
                                ? isDark ? 'bg-amber-950/40 text-amber-300 border border-amber-800/50' : 'bg-amber-50 text-amber-800 border border-amber-200'
                                : isDark ? 'bg-red-950/40 text-red-300 border border-red-800/50' : 'bg-red-50 text-red-800 border border-red-200'
                                }`}>
                                {deleteConfirm.warningKey ? t(deleteConfirm.warningKey) : deleteConfirm.warning}
                            </div>

                            {deleteConfirm.usedBy && (
                                <div className="space-y-2">
                                    {deleteConfirm.usedBy.systems.length > 0 && (
                                        <div>
                                            <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('systems.manage.deleteDialog.systemsUsingModel')}</p>
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
                                            <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('systems.manage.deleteDialog.componentsUsingModel')}</p>
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
                                      {t('systems.manage.deleteDialog.attachedToSystemLabel')}
                                        <span className={`ml-2 px-2 py-0.5 rounded font-semibold ${isDark ? 'bg-violet-900/40 text-violet-300' : 'bg-violet-50 text-violet-700'}`}>
                                            {deleteConfirm.attachedSystemCode}
                                        </span>
                                    </p>
                                    <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                                        {t('systems.manage.deleteDialog.detachFirst')}
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={detachingComponent}
                                        onClick={handleDetachFromSystem}
                                        className={`mt-1 ${isDark ? 'border-slate-500 text-slate-300 hover:bg-slate-600' : 'border-slate-300 hover:bg-slate-100'}`}
                                    >
                                        {detachingComponent ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                        {detachingComponent ? t('systems.manage.deleteDialog.detaching') : t('systems.manage.deleteDialog.detachFrom', { code: deleteConfirm.attachedSystemCode })}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setDeleteConfirm(null)}
                                className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
                                {deleteConfirm.canDelete ? t('systems.manage.deleteDialog.cancel') : t('systems.manage.deleteDialog.close')}
                            </Button>
                            {deleteConfirm.canDelete && !deleteConfirm.attachedSystemCode && (
                                <Button variant="destructive" disabled={deleting} onClick={handleConfirmDelete}>
                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                    {deleting ? t('systems.manage.deleteDialog.deleting') : t('systems.manage.deleteDialog.confirmDelete')}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
