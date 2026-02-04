'use client';

import SafetyFilters from '@/src/components/safety-management/SafetyFilters';
import SafetyModal from '@/src/components/safety-management/SafetyModal';
import SafetyTable from '@/src/components/safety-management/SafetyTable';
import { useTheme } from '@/src/components/useTheme';
import { DUMMY_SAFETY_INDICATORS } from '@/src/lib/dummydata';
import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

export interface SafetyIndicator {
  id: number;
  indicator_code: string;
  indicator_type: 'KPI' | 'SPI';
  indicator_area: 'COMPLIANCE' | 'TRAINING' | 'OPERATIONS' | 'MAINTENANCE';
  indicator_name: string;
  indicator_desc?: string;
  target_value: number;
  unit: string;
  frequency: string;
  is_active: 0 | 1;
}
export default function SafetyManagementPage() {
  const { isDark } = useTheme()
  const [indicators, setIndicators] = useState<SafetyIndicator[]>(DUMMY_SAFETY_INDICATORS);
  const [filteredIndicators, setFilteredIndicators] = useState<SafetyIndicator[]>(DUMMY_SAFETY_INDICATORS);
  const [filters, setFilters] = useState({
    search: '',
    area: '',
    type: '',
    active: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<SafetyIndicator | null>(null);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    
    let filtered = [...indicators];
    
    if (newFilters.search) {
      const search = newFilters.search.toLowerCase();
      filtered = filtered.filter(ind =>
        ind.indicator_code.toLowerCase().includes(search) ||
        ind.indicator_name.toLowerCase().includes(search) ||
        ind.indicator_desc?.toLowerCase().includes(search)
      );
    }
    
    if (newFilters.area) {
      filtered = filtered.filter(ind => ind.indicator_area === newFilters.area);
    }
    
    if (newFilters.type) {
      filtered = filtered.filter(ind => ind.indicator_type === newFilters.type);
    }
    
    if (newFilters.active !== '') {
      filtered = filtered.filter(ind => 
        ind.is_active === parseInt(newFilters.active)
      );
    }
    
    setFilteredIndicators(filtered);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      search: '',
      area: '',
      type: '',
      active: '',
    };
    setFilters(resetFilters);
    setFilteredIndicators(indicators);
  };

  const handleNew = () => {
    setSelectedIndicator(null);
    setIsModalOpen(true);
  };

  const handleEdit = (indicator: SafetyIndicator) => {
    setSelectedIndicator(indicator);
    setIsModalOpen(true);
  };

  const handleToggle = (id: number, newStatus: 0 | 1) => {
    const updated = indicators.map(ind =>
      ind.id === id ? { ...ind, is_active: newStatus } : ind
    );
    setIndicators(updated);
    setFilteredIndicators(updated);
  };

  const handleSave = (formData: any) => {
    if (selectedIndicator) {
      // Update existing
      const updated = indicators.map(ind =>
        ind.id === selectedIndicator.id ? { ...ind, ...formData } : ind
      );
      setIndicators(updated);
      setFilteredIndicators(updated);
    } else {
      // Add new
      const newIndicator: SafetyIndicator = {
        id: indicators.length + 1,
        ...formData,
      };
      setIndicators([...indicators, newIndicator]);
      setFilteredIndicators([...indicators, newIndicator]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
  <div className="container mx-auto px-4 py-6">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          Safety Management SPI KPI Definition
        </h1>
        <button
          className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
    </div>

    <SafetyFilters
      filters={filters}
      onFilterChange={handleFilterChange}
      onReset={handleResetFilters}
      onNew={handleNew}
      isDark={isDark}
    />

    <SafetyTable
      indicators={filteredIndicators}
      onEdit={handleEdit}
      onToggle={handleToggle}
      isDark={isDark}
    />

    <SafetyModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onSave={handleSave}
      indicator={selectedIndicator}
      isDark={isDark}
    />
  </div>
</div>

  );
}