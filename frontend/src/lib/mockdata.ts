const mockData = {
    code: 1,
    safety_index: 87.5,
    data: {
        'Flight Operations': [
            {
                indicator_name: 'Flight Hours',
                value: 120,
                target: 100,
                unit: 'hrs',
                status: 'GREEN'
            },
            {
                indicator_name: 'Incidents',
                value: 2,
                target: 5,
                unit: '',
                status: 'GREEN'
            },
            {
                indicator_name: 'Mission Success Rate',
                value: 95,
                target: 90,
                unit: '%',
                status: 'GREEN'
            }
        ],
        'Maintenance': [
            {
                indicator_name: 'Scheduled Maintenance',
                value: 8,
                target: 10,
                unit: '',
                status: 'YELLOW'
            },
            {
                indicator_name: 'Unscheduled Repairs',
                value: 3,
                target: 5,
                unit: '',
                status: 'GREEN'
            }
        ],
        'Safety Management': [
            {
                indicator_name: 'Safety Reports',
                value: 15,
                target: 20,
                unit: '',
                status: 'YELLOW'
            },
            {
                indicator_name: 'Training Completion',
                value: 92,
                target: 85,
                unit: '%',
                status: 'GREEN'
            }
        ]
    }
};
const shiIndexData = {
    code: 1,
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    values: [78, 82, 85, 83, 87, 89, 91, 88, 90, 92, 87, 89]
};

const  getSPIKPITrend = {
    code: 1,
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
    values: [95, 92, 98, 94, 96, 97],
    target: 90
  };

    const clients = [
    { id: 1, name: 'Acme Corporation' },
    { id: 2, name: 'Tech Solutions Inc.' },
    { id: 3, name: 'Global Logistics Ltd.' },
    { id: 4, name: 'Infrastructure Partners' },
    { id: 5, name: 'Energy Systems Co.' }
  ];

  const procedures = [
    { id: 1, name: 'LUC-EVAL-001 - Standard Evaluation', type: 'EVALUATION' },
    { id: 2, name: 'LUC-EVAL-002 - Risk Assessment', type: 'EVALUATION' },
    { id: 3, name: 'LUC-EVAL-003 - Environmental Impact', type: 'EVALUATION' },
    { id: 4, name: 'LUC-PLAN-001 - Mission Planning', type: 'PLANNING' },
    { id: 5, name: 'LUC-PLAN-002 - Route Optimization', type: 'PLANNING' }
  ];
const evaluations = [
    {
      id: 1,
      evaluation_code: 'EVAL-2026-0001',
      client_name: 'Acme Corporation',
      evaluation_desc: 'Industrial area survey',
      evaluation_status: 'NEW',
      evaluation_request_date: '2026-01-15',
      evaluation_year: 2026,
      evaluation_result: 'PROCESSING',
      evaluation_offer: 'OFF-2026-001',
      evaluation_sale_manager: 'John Doe'
    },
    {
      id: 2,
      evaluation_code: 'EVAL-2026-0002',
      client_name: 'Tech Solutions Inc.',
      evaluation_desc: 'Campus mapping',
      evaluation_status: 'PROCESSING',
      evaluation_request_date: '2026-01-20',
      evaluation_year: 2026,
      evaluation_result: 'PROCESSING',
      evaluation_offer: 'OFF-2026-002',
      evaluation_sale_manager: 'Jane Smith'
    },
    {
      id: 3,
      evaluation_code: 'EVAL-2026-0003',
      client_name: 'Global Logistics Ltd.',
      evaluation_desc: 'Warehouse inspection',
      evaluation_status: 'COMPLETED',
      evaluation_request_date: '2026-01-10',
      evaluation_year: 2026,
      evaluation_result: 'COMPLETED',
      evaluation_offer: 'OFF-2026-003',
      evaluation_sale_manager: 'Bob Johnson'
    }
  ];
 
const plannings = [
    {
      id: 1,
      planning_code: 'PLAN-2026-0001',
      evaluation_code: 'EVAL-2026-0001',
      planning_desc: 'Industrial area survey planning',
      planning_type: 'Survey',
      planning_status: 'NEW',
      planning_request_date: '2026-01-16',
      planning_year: 2026,
      planning_ver: '1.0',
      planning_result: 'PROGRESS',
      planning_folder: '/docs/2026/001'
    },
    {
      id: 2,
      planning_code: 'PLAN-2026-0002',
      evaluation_code: 'EVAL-2026-0002',
      planning_desc: 'Campus mapping planning',
      planning_type: 'Mapping',
      planning_status: 'PROCESSING',
      planning_request_date: '2026-01-21',
      planning_year: 2026,
      planning_ver: '1.1',
      planning_result: 'PROGRESS',
      planning_folder: '/docs/2026/002'
    },
    {
      id: 3,
      planning_code: 'PLAN-2026-0003',
      evaluation_code: 'EVAL-2026-0003',
      planning_desc: 'Warehouse inspection planning',
      planning_type: 'Inspection',
      planning_status: 'REQ_FEEDBACK',
      planning_request_date: '2026-01-11',
      planning_year: 2026,
      planning_ver: '2.0',
      planning_result: 'PROGRESS',
      planning_folder: '/docs/2026/003'
    }
  ];
 

export const data = {
    mockData,
    shiIndexData,
    getSPIKPITrend,
    clients,
    procedures,
    evaluations,
    plannings,
}