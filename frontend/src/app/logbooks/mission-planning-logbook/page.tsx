'use client';

import MissionPlanningFilters from '@/src/components/logbook/MissionPlanningFilters';
import MissionPlanningTable from '@/src/components/logbook/MissionPlanningTable';
import { useSession } from '@/src/lib/useSession';
import { useState } from 'react';
import Layout from '../../layout';

export default function MissionPlanningLogbookPage() {
  const { ownerId, isLoading } = useSession();
  const [filters, setFilters] = useState({
    clientId: 0,
    pilotId: 0,
    evaluationId: 0,
    planningId: 0,
    dateStart: '',
    dateEnd: '',
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <div className="container-fluid">
        <div className="row">
          <MissionPlanningFilters
            ownerId={ownerId}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        <div className="row">
          <div className="col-md-12 col-lg-12">
            <MissionPlanningTable
              ownerId={ownerId}
              filters={filters}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}