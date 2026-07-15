'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { CheckCircle2, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DFlightDroneRow } from '@/types/dflight';

interface DFlightPlateSearchProps {
  isDark?: boolean;
  onFound: (drone: DFlightDroneRow) => void;
}

// Requirement: when adding/updating a drone, the user can type its license plate
// (registration number) and look it up directly in d-flight, rather than going
// through the bulk d-flight → Fleet comparison page.
export default function DFlightPlateSearch({ isDark, onFound }: DFlightPlateSearchProps) {
  const { t } = useTranslation();
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundName, setFoundName] = useState<string | null>(null);

  const handleSearch = async () => {
    const trimmed = plate.trim();
    if (!trimmed) return;
    setLoading(true);
    setFoundName(null);
    try {
      const { data } = await axios.get('/api/dflight/search-by-plate', { params: { plate: trimmed } });
      if (data.code === 1 && data.data) {
        setFoundName(data.data.dFlightName);
        onFound(data.data as DFlightDroneRow);
      } else {
        alert(data.message || t('dflight.plateSearch.notFound', { defaultValue: 'No matching D-Flight drone found' }));
      }
    } catch (error: any) {
      alert(error.response?.data?.message || t('dflight.plateSearch.error', { defaultValue: 'Failed to search D-Flight' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-lg border p-3 ${isDark ? 'border-slate-600 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
      <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
        {t('dflight.plateSearch.label', { defaultValue: 'Align with D-Flight by License Plate' })}
      </p>
      <div className="flex gap-2">
        <Input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder={t('dflight.plateSearch.placeholder', { defaultValue: 'e.g. IT-A1B2C3' })}
          className="h-8 text-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleSearch} disabled={loading || !plate.trim()} className="h-8 gap-1.5 text-xs shrink-0">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {t('dflight.plateSearch.search', { defaultValue: 'Search' })}
        </Button>
      </div>
      {foundName && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          {t('dflight.plateSearch.matched', { defaultValue: 'Matched "{{name}}" — fields pre-filled below', name: foundName })}
        </p>
      )}
    </div>
  );
}
