'use client';

import FlightLogbookFilters from '@/src/components/logbook/FlightLogbookFilters';
import FlightLogbookOffcanvas from '@/src/components/logbook/FlightLogbookOffcanvas';
import FlightLogbookTable from '@/src/components/logbook/FlightLogbookTable';
import { useSession } from '@/src/lib/useSession';
import { useState } from 'react';
import Layout from '../../layout';

export default function OperationLogbookPage() {
  const { ownerId, isLoading } = useSession();
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    pilotId: 0,
    missionPlan: 0,
    missionTypeId: 0,
    missionCategoryId: 0,
    droneSystemId: 0,
    missionResultId: 0,
    missionStatusId: 0,
    clientId: 0,
  });
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <div className="container-fluid">
        <div className="row">
          <FlightLogbookFilters
            ownerId={ownerId}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        <div className="row">
          <div className="col-md-12 col-lg-12">
            <FlightLogbookTable
              ownerId={ownerId}
              filters={filters}
              onRowClick={() => setIsOffcanvasOpen(true)}
            />
          </div>
        </div>

        <FlightLogbookOffcanvas
          isOpen={isOffcanvasOpen}
          onClose={() => setIsOffcanvasOpen(false)}
        />
      </div>
    </Layout>
  );
}