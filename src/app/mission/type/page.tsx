'use client';

import MissionTypeForm from '@/components/mission/MissionTypeForm';
import MissionTypeTable from '@/components/mission/MissionTypeTable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { MissionType } from '@/config/types/types';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MissionTypePage() {
  const { isDark } = useTheme();
  const [missionTypes, setMissionTypes] = useState<MissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchMissionTypes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/mission/type/list`);
      const result = await response.data;
      if (result.code === 1) {
        setMissionTypes(result.data);
      }
    } catch (error) {
      console.error('Error fetching mission types:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissionTypes();
  }, []);

  const handleAddMissionType = async (newType: Omit<MissionType, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/type/add`, {
        mission_type_name: newType.name,
        mission_type_desc: newType.description,
        mission_type_code: newType.code,
        mission_type_label: newType.label,
      });
      const result = await response.data;
      if (result.code === 1) {
        const newMissionType: MissionType = {
          id: result.data.mission_type_id,
          name: result.data.type_name,
          code: result.data.type_code,
          label: result.data.type_description,
          description: result.data.type_description,
        };
        setMissionTypes(prev => [...prev, newMissionType]);
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Error adding mission type:', error);
    }
  };

  const handleDeleteMissionType = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/type/${id}/delete`);
      const result = await response.data;
      if (result.code === 1) {
        setMissionTypes(prev => prev.filter(type => type.id !== id));
      }
    } catch (error) {
      console.error('Error deleting mission type:', error);
    }
  };

  const handleEditMissionType = async (updatedType: MissionType) => {
    try {
      const response = await axios.put(`/api/mission/type/${updatedType.id}/edit`, {
        mission_type_name: updatedType.name,
        mission_type_desc: updatedType.description,
        mission_type_code: updatedType.code,
        mission_type_label: updatedType.label,
      });
      const result = await response.data;
      if (result.code === 1) {
        setMissionTypes(prev =>
          prev.map(type => (type.id === updatedType.id ? updatedType : type))
        );
      }
    } catch (error) {
      console.error('Error updating mission type:', error);
    }
  };

  // if (loading) {
  //   return <MissionTypeSkeleton isDark={isDark} />;
  // }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
      <div className="w-full">

        <div
          className={` top-0 z-10 backdrop-blur-md transition-colors ${isDark
              ? "bg-slate-900/80 border-b border-slate-800 text-white"
              : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
            } px-6 py-4`}
        >
          <div className="mx-auto max-w-[1800px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-violet-600" />

              <div>
                <h1
                  className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"
                    }`}
                >
                  Mission Types Management
                </h1>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Manage and configure mission types for your operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className={`h-8 gap-1.5 text-xs font-semibold transition-all shadow-sm ${isDark
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "bg-violet-600 hover:bg-violet-700 text-white"
                  }`}
              >
                <Plus size={14} />
                <span>Add New Type</span>
              </Button>
            </div>
          </div>
        </div>

        <div className={`rounded-xl m-3 mt-6 sm:rounded-2xl   border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Mission Type List
            </h2>
            <p className={`text-xs sm:text-sm mt-1 sm:mt-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              View and manage existing types
            </p>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <MissionTypeTable
              data={missionTypes}
              onDelete={handleDeleteMissionType}
              onEdit={handleEditMissionType}
              isDark={isDark}
            />
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`sm:max-w-lg ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : 'text-gray-900'}>
              Add New Mission Type
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Fill in the details below to create a new mission type.
            </DialogDescription>
          </DialogHeader>
          <MissionTypeForm
            onSubmit={(data) => {
              handleAddMissionType(data);
            }}
            isDark={isDark}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}