'use client';

import OrganizationTree from '@/components/organization/OrganizationTree';
import { dummyOrganizationTree } from '@/data/organizationData';

export default function OrganizationChartPage() {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h4 className="card-title mb-0">Organization Chart</h4>
                </div>
                <div className="col-auto">
                  <button className="btn btn-sm btn-outline-primary me-2">
                    <i className="las la-expand"></i> Expand All
                  </button>
                  <button className="btn btn-sm btn-outline-primary">
                    <i className="las la-compress"></i> Collapse All
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              <OrganizationTree data={dummyOrganizationTree} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}