'use client';

import AddComponentModal from '@/components/system/AddComponentModal';
import AddModelModal from '@/components/system/AddModelModal';
import AddSystemModal from '@/components/system/AddSystemModal';
import DataTable from '@/components/system/DataTable';
import EditComponentModal from '@/components/system/EditComponentModal';
import EditModelModal from '@/components/system/EditModelModal';
import EditSystemModal from '@/components/system/EditSystemModal';
import { FilesDownloadModal, SystemFile } from '@/components/system/FilesDownloadModal';
import UpdateStatusModal from '@/components/system/UpdateStatusModal';
import ViewToolModal from '@/components/system/ViewToolModal';
import { DroneToolData, systemCreateColumns } from '@/components/tables/systemColumn';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function DroneToolPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState<boolean>(false);
    const [toolData, setToolData] = useState<DroneToolData[]>([]);
    const [showAddTool, setShowAddTool] = useState(false);
    const [showAddModel, setShowAddModel] = useState(false);
    const [showAddComponent, setShowAddComponent] = useState(false);
    const [showViewTool, setShowViewTool] = useState(false);
    const [showUpdateStatus, setShowUpdateStatus] = useState(false);
    const [showEditSystem, setShowEditSystem] = useState(false);
    const [showEditModel, setShowEditModel] = useState(false);
    const [showEditComponent, setShowEditComponent] = useState(false);
    const [selectedToolId, setSelectedToolId] = useState<number | null>(null);
    const [models, setModels] = useState([]);
    const [clients, setClients] = useState([]);
    const [tools, setTools] = useState<DroneToolData[]>([]);

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
    const handleUpdateStatus = (toolId: number) => { setSelectedToolId(toolId); setShowUpdateStatus(true); };
    const handleEditSystem = (toolId: number) => { setSelectedToolId(toolId); setShowEditSystem(true); };
    const handleEditModel = (toolId: number) => { setSelectedToolId(toolId); setShowEditModel(true); };
    const handleEditComponent = (toolId: number) => { setSelectedToolId(toolId); setShowEditComponent(true); };

    const handleDelete = async (toolId: number) => {
        try {
            const response = await fetch(`/api/system/${toolId}/delete`, { method: 'POST' });
            const result = await response.json();
            if (result.code === 1) {
                toast.success('System soft deleted successfully');
                fetchToolData();
            } else {
                toast.error(result.message || 'Failed to delete System');
            }
        } catch {
            toast.error('Error deleting System');
        }
    };

    const handleViewFiles = (tool: DroneToolData) => {
        setFilesModal({
            open: true,
            toolCode: tool.tool_code,
            files: tool.files ?? [],
        });
    };

    const columns = useMemo(
        () =>
            systemCreateColumns({
                onView: handleView,
                onUpdateStatus: handleUpdateStatus,
                onDelete: handleDelete,
                onEditSystem: handleEditSystem,
                onEditModel: handleEditModel,
                onEditComponent: handleEditComponent,
                onViewFiles: handleViewFiles,   
                isDark,
            }),
        [isDark],
    );

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
                            <h1
                                className={`text-lg font-bold tracking-tight ${
                                    isDark ? 'text-white' : 'text-slate-900'
                                }`}
                            >
                                Drone System List
                            </h1>
                            <p
                                className={`text-xs ${
                                    isDark ? 'text-slate-500' : 'text-slate-400'
                                }`}
                            >
                                Manage drone tools, models, and sub-components
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchToolData}
                            disabled={loading}
                            className={`h-8 gap-1.5 text-xs transition-all ${
                                isDark
                                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {loading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden xs:inline">Refresh</span>
                        </Button>

                        <div className="flex gap-2 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <Button
                                size="sm"
                                onClick={() => setShowAddTool(true)}
                                className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                            >
                                <Plus size={14} /> Add System
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setShowAddModel(true)}
                                className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                            >
                                <Plus size={14} /> Add Model
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setShowAddComponent(true)}
                                className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                            >
                                <Plus size={14} /> Add Component
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 mx-auto max-w-[1800px]">
                <Card
                    className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}
                >
                    <CardContent className="pt-6">
                        <DataTable columns={columns} data={toolData} loading={loading} />
                    </CardContent>
                </Card>
            </div>


            {showAddTool && (
                <AddSystemModal
                    open={showAddTool}
                    onClose={() => setShowAddTool(false)}
                    onSuccess={() => { setShowAddTool(false); fetchToolData(); }}
                    models={models}
                    clients={clients}
                />
            )}

            {showAddModel && (
                <AddModelModal
                    open={showAddModel}
                    onClose={() => setShowAddModel(false)}
                    onSuccess={() => { setShowAddModel(false); fetchModels(); }}
                />
            )}

            {showAddComponent && (
                <AddComponentModal
                    open={showAddComponent}
                    onClose={() => setShowAddComponent(false)}
                    onSuccess={() => setShowAddComponent(false)}
                    tools={tools}
                    models={models}
                />
            )}

            {showViewTool && selectedToolId && (
                <ViewToolModal
                    open={showViewTool}
                    toolId={selectedToolId}
                    onClose={() => { setShowViewTool(false); setSelectedToolId(null); }}
                />
            )}

            {showUpdateStatus && selectedToolId && (
                <UpdateStatusModal
                    open={showUpdateStatus}
                    toolId={selectedToolId}
                    onClose={() => { setShowUpdateStatus(false); setSelectedToolId(null); }}
                    onSuccess={() => { setShowUpdateStatus(false); setSelectedToolId(null); fetchToolData(); }}
                />
            )}

            {showEditSystem && (
                <EditSystemModal
                    open={showEditSystem}
                    toolId={selectedToolId}
                    onClose={() => { setShowEditSystem(false); setSelectedToolId(null); }}
                    onSuccess={() => { setShowEditSystem(false); setSelectedToolId(null); fetchToolData(); }}
                    clients={clients}
                />
            )}

            {showEditModel && (
                <EditModelModal
                    open={showEditModel}
                    toolId={selectedToolId}
                    onClose={() => { setShowEditModel(false); setSelectedToolId(null); }}
                    onSuccess={() => { setShowEditModel(false); setSelectedToolId(null); fetchModels(); }}
                />
            )}

            {showEditComponent && (
                <EditComponentModal
                    open={showEditComponent}
                    toolId={selectedToolId}
                    onClose={() => { setShowEditComponent(false); setSelectedToolId(null); }}
                    onSuccess={() => { setShowEditComponent(false); setSelectedToolId(null); }}
                    models={models}
                    clients={clients}
                />
            )}

            <FilesDownloadModal
                open={filesModal.open}
                toolCode={filesModal.toolCode}
                files={filesModal.files}
                onClose={() => setFilesModal({ open: false, toolCode: '', files: [] })}
            />
        </div>
    );
}