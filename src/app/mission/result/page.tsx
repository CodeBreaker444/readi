'use client';

import MissionResultForm from '@/components/mission/MissionResultForm';
import MissionResultSkeleton from '@/components/mission/MissionResultSkeleton';
import MissionResultTable from '@/components/mission/MissionResultTable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { MissionResult } from '@/config/types/types';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function MissionResultPage() {
  const { isDark } = useTheme();
  const [results, setResults] = useState<MissionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/mission/result/list`);
      const result = response.data;
      if (result.code === 1) {
        setResults(result.data.map((item: any) => ({
          id: item.mission_result_id,
          code: item.mission_result_code,
          description: item.mission_result_desc,
        })));
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to fetch mission results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResults(); }, []);

  const handleAddResult = async (newResult: Omit<MissionResult, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/result/add`, {
        mission_result_code: newResult.code,
        mission_result_desc: newResult.description,
      });
      const result = response.data;
      if (result.code === 1) {
        const added: MissionResult = {
          id: result.data.result_id,
          code: result.data.result_type,
          description: result.data.result_description,
        };
        setResults(prev => [...prev, added]);
        toast.success('Mission result added successfully');
        setIsDialogOpen(false);
      } else {
        toast.error(result.message || 'Failed to add result');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error adding result');
    }
  };

  const handleDeleteResult = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/result/${id}/delete`);
      const result = response.data;
      if (result.code === 1) {
        setResults(prev => prev.filter(r => r.id !== id));
        toast.success('Mission result deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete result');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting result');
    }
  };

  const handleEditResult = async (updatedResult: MissionResult) => {
    try {
      const response = await axios.post(`/api/mission/result/${updatedResult.id}/update`, {
        mission_result_code: updatedResult.code,
        mission_result_desc: updatedResult.description,
      });
      const result = response.data;
      if (result.code === 1) {
        setResults(prev => prev.map(r => r.id === updatedResult.id ? updatedResult : r));
        toast.success('Mission result updated successfully');
      } else {
        toast.error(result.message || 'Failed to update result');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating result');
    }
  };

  if (loading) return <MissionResultSkeleton isDark={isDark} />;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800' : 'bg-white'}`}>
      <div className="w-full ">

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
                  Mission Result Management
                </h1>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Define and maintain mission result types for tracking outcomes
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
                <span>Add New Result</span>
              </Button>
            </div>
          </div>
        </div>

        <div className={`m-4 rounded-md border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Mission Result List
            </h2>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              View and manage existing result types
            </p>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <MissionResultTable
              data={results}
              onDelete={handleDeleteResult}
              onEdit={handleEditResult}
              isDark={isDark}
            />
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`sm:max-w-md ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : 'text-gray-900'}>
              Add New Mission Result
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Fill in the details below to create a new mission result type.
            </DialogDescription>
          </DialogHeader>
          <MissionResultForm onSubmit={handleAddResult} isDark={isDark} />
        </DialogContent>
      </Dialog>
    </div>
  );
}