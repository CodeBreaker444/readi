'use client';

import AddComponentModal from '@/components/system/AddComponentModal';
import AddModelModal from '@/components/system/AddModelModal';
import AddToolModal from '@/components/system/AddToolModal';
import DataTable from '@/components/system/DataTable';
import UpdateStatusModal from '@/components/system/UpdateStatusModal';
import ViewToolModal from '@/components/system/ViewToolModal';
import { systemCreateColumns } from '@/components/tables/systemColumn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function DroneToolPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [toolData, setToolData] = useState([]);
  const [showAddTool, setShowAddTool] = useState<boolean>(false);
  const [showAddModel, setShowAddModel] = useState<boolean>(false);
  const [showAddComponent, setShowAddComponent] = useState<boolean>(false);
  const [showViewTool, setShowViewTool] = useState<boolean>(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<number | null>(null);
  const [models, setModels] = useState([]);
  const [clients, setClients] = useState([]);
  const [tools, setTools] = useState([]);

  useEffect(() => {
    fetchToolData();
    fetchModels();
    fetchClients();
  }, []);

  const fetchToolData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/tool/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: 'ALL', status: 'ALL' }),
      });

      const result = await response.json();
      if (result.code === 1) {
        setToolData(result.data);
        setTools(result.data);
      } else {
        toast.error(result.message || 'Failed to fetch tool data');
      }
    } catch (error) {
      toast.error('Error fetching tool data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const fetchModels = async () => {
    try {
      const response = await fetch('/api/system/tool/model/list', {
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
      if (response.data?.clients) setClients(response.data.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleView = (toolId: number) => {
    setSelectedToolId(toolId);
    setShowViewTool(true);
  };

  const handleUpdateStatus = (toolId: number) => {
    setSelectedToolId(toolId);
    setShowUpdateStatus(true);
  };

  const handleDelete = async (toolId: number) => {

    try {
      const response = await fetch(`/api/system/tool/${toolId}/delete`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.code === 1) {
        toast.success('Tool soft deleted successfully');
        fetchToolData();
      } else {
        toast.error(result.message || 'Failed to delete tool');
      }
    } catch (error) {
      toast.error('Error deleting tool');
      console.error(error);
    }
  };

  const columns = useMemo(
    () => systemCreateColumns({
      onView: handleView,
      onUpdateStatus: handleUpdateStatus,
      onDelete: handleDelete,
    }),
    []
  );

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Drone System List</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddTool(true)}>Add Tool</Button>
              <Button onClick={() => setShowAddModel(true)}>Add Model</Button>
              <Button onClick={() => setShowAddComponent(true)}>
                Add Component
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={toolData}
            loading={loading}
          />
        </CardContent>
      </Card>

      {showAddTool && (
        <AddToolModal
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
          clients={clients}
        />
      )}

      {showViewTool && selectedToolId && (
        <ViewToolModal
          open={showViewTool}
          toolId={selectedToolId}
          onClose={() => {
            setShowViewTool(false);
            setSelectedToolId(null);
          }}
        />
      )}

      {showUpdateStatus && selectedToolId && (
        <UpdateStatusModal
          open={showUpdateStatus}
          toolId={selectedToolId}
          onClose={() => {
            setShowUpdateStatus(false);
            setSelectedToolId(null);
          }}
          onSuccess={() => {
            setShowUpdateStatus(false);
            setSelectedToolId(null);
            fetchToolData();
          }}
        />
      )}
    </div>
  );
}