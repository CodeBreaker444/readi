'use client';

import MissionTypeForm from '@/components/mission/MissionTypeForm';
import MissionTypeSkeleton from '@/components/mission/MissionTypeSkeleton';
import MissionTypeTable from '@/components/mission/MissionTypeTable';
import { useTheme } from '@/components/useTheme';
import { MissionType } from '@/config/types/types';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

 
export default function MissionTypePage() {
  const { isDark } = useTheme();
  const [missionTypes, setMissionTypes] = useState<MissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
  }, [ ]);

  const handleAddMissionType = async (newType: Omit<MissionType, 'id'>) => {
  try {
    const response = await axios.post(`/api/mission/type/add`, {
      mission_type_name: newType.name,
      mission_type_desc: newType.description,
      mission_type_code: newType.code,
      mission_type_label: newType.label
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
      setShowForm(false);
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
      mission_type_label: updatedType.label
    });

    const result = await response.data;
    if (result.code === 1) {
      setMissionTypes(prev => 
        prev.map(type => 
          type.id === updatedType.id ? updatedType : type
        )
      );
    }
  } catch (error) {
    console.error('Error updating mission type:', error);
  }
};
  if (loading) {
     <MissionTypeSkeleton isDark={isDark} />
  }

 return (
    <div className={`min-h-screen ${isDark ? 'bg-linear-to-br from-gray-900 via-gray-900 to-gray-800' : 'bg-linear-to-br from-gray-50 via-white to-gray-100'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-10 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Mission Types Management
            </h1>
            <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage and configure mission types for your operations
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
              showForm
                ? isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                : 'bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
            }`}
          >
            {showForm ? (
              <>
                <X size={20} />
                <span className="hidden sm:inline">Cancel</span>
              </>
            ) : (
              <>
                <Plus size={20} />
                <span className="hidden sm:inline">Add New Type</span>
              </>
            )}
          </button>
        </div>

        <div className={`grid gap-4 sm:gap-6 lg:gap-8 ${showForm ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
          <div className={`rounded-xl sm:rounded-2xl shadow-xl border overflow-hidden transition-all duration-300 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Mission Type List</h2>
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

          {showForm && (
            <div className={`rounded-xl sm:rounded-2xl shadow-xl border overflow-hidden transition-all duration-300 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Add New Mission Type</h2>
                <p className={`text-xs sm:text-sm mt-1 sm:mt-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Create a new mission type entry
                </p>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <MissionTypeForm 
                  onSubmit={(data) => {
                    handleAddMissionType(data);
                    setShowForm(false);
                  }} 
                  isDark={isDark} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}