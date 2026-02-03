import { Assignment, Checklist, Communication, Document, DocumentType, LUCProcedure, Notifications, OrganizationNode, SafetyIndicator } from '../config/types';

export const DUMMY_DOCUMENTS: Document[] = [
  {
    document_id: 1,
    doc_type_id: 1,
    doc_code: 'LUC-COMP-001',
    title: 'Safety Management System Manual',
    description: 'Comprehensive manual for safety management procedures and protocols',
    status: 'APPROVED',
    area: 'COMPLIANCE',
    category: 'Manual',
    confidentiality: 'INTERNAL',
    owner_role: 'Compliance Manager',
    effective_date: '2024-01-01',
    expiry_date: '2025-01-01',
    keywords: 'safety, management, procedures, compliance',
    tags: '["safety", "compliance", "manual"]',
    version_label: 'v2.1',
    change_log: 'Updated regulatory requirements for 2024',
    file_path: '/uploads/docs/luc-comp-001-v2.1.pdf',
    created_at: '2024-01-15T10:30:00',
    updated_at: '2024-01-20T14:45:00',
    type_name: 'Safety Manual',
  },
  {
    document_id: 2,
    doc_type_id: 2,
    doc_code: 'LUC-TRAIN-002',
    title: 'Pilot Training Curriculum',
    description: 'Complete training curriculum for drone pilots including theoretical and practical components',
    status: 'APPROVED',
    area: 'TRAINING',
    category: 'Curriculum',
    confidentiality: 'INTERNAL',
    owner_role: 'Training Manager',
    effective_date: '2024-02-01',
    expiry_date: '2025-02-01',
    keywords: 'training, pilot, curriculum, education',
    tags: '["training", "pilot", "education"]',
    version_label: 'v1.5',
    change_log: 'Added new modules for advanced flight operations',
    file_path: '/uploads/docs/luc-train-002-v1.5.pdf',
    created_at: '2024-01-10T09:00:00',
    updated_at: '2024-01-28T16:20:00',
    type_name: 'Training Document',
  },
  {
    document_id: 3,
    doc_type_id: 3,
    doc_code: 'LUC-OPS-003',
    title: 'Standard Operating Procedures',
    description: 'Standard operating procedures for daily drone operations',
    status: 'IN_REVIEW',
    area: 'OPERATION',
    category: 'Procedure',
    confidentiality: 'INTERNAL',
    owner_role: 'Operations Manager',
    effective_date: '2024-03-01',
    keywords: 'operations, procedures, SOP, daily operations',
    tags: '["operations", "SOP"]',
    version_label: 'v3.0-draft',
    change_log: 'Major revision for new operational requirements',
    file_path: '/uploads/docs/luc-ops-003-v3.0-draft.pdf',
    created_at: '2024-02-01T11:15:00',
    updated_at: '2024-02-03T10:30:00',
    type_name: 'SOP Document',
  },
  {
    document_id: 4,
    doc_type_id: 4,
    doc_code: 'LUC-MAINT-004',
    title: 'Maintenance Schedule and Checklist',
    description: 'Scheduled maintenance procedures and inspection checklists for all drone models',
    status: 'APPROVED',
    area: 'MAINTENANCE',
    category: 'Checklist',
    confidentiality: 'INTERNAL',
    owner_role: 'Maintenance Chief',
    effective_date: '2024-01-15',
    expiry_date: '2024-12-31',
    keywords: 'maintenance, inspection, checklist, schedule',
    tags: '["maintenance", "inspection"]',
    version_label: 'v1.2',
    change_log: 'Updated checklist items for new drone models',
    file_path: '/uploads/docs/luc-maint-004-v1.2.pdf',
    created_at: '2024-01-05T08:45:00',
    updated_at: '2024-01-15T13:10:00',
    type_name: 'Maintenance Document',
  },
  {
    document_id: 5,
    doc_type_id: 5,
    doc_code: 'LUC-SEC-005',
    title: 'Data Security and Privacy Policy',
    description: 'Policies and procedures for data security and privacy protection',
    status: 'APPROVED',
    area: 'SECURITY',
    category: 'Policy',
    confidentiality: 'CONFIDENTIAL',
    owner_role: 'Security Officer',
    effective_date: '2024-01-01',
    expiry_date: '2025-01-01',
    keywords: 'security, privacy, data protection, GDPR',
    tags: '["security", "privacy", "GDPR"]',
    version_label: 'v2.0',
    change_log: 'Updated for GDPR compliance requirements',
    file_path: '/uploads/docs/luc-sec-005-v2.0.pdf',
    created_at: '2023-12-15T14:00:00',
    updated_at: '2024-01-01T09:00:00',
    type_name: 'Security Policy',
  },
  {
    document_id: 6,
    doc_type_id: 1,
    doc_code: 'LUC-SAFE-006',
    title: 'Emergency Response Procedures',
    description: 'Emergency response and incident management procedures',
    status: 'DRAFT',
    area: 'SAFETY',
    category: 'Procedure',
    confidentiality: 'INTERNAL',
    owner_role: 'Safety Manager',
    effective_date: '2024-03-15',
    keywords: 'emergency, response, incident, safety',
    tags: '["emergency", "safety", "incident"]',
    version_label: 'v1.0-draft',
    change_log: 'Initial draft for emergency procedures',
    file_path: '/uploads/docs/luc-safe-006-v1.0-draft.pdf',
    created_at: '2024-02-01T10:00:00',
    updated_at: '2024-02-03T15:30:00',
    type_name: 'Safety Manual',
  },
];

export const DUMMY_DOCUMENT_TYPES: DocumentType[] = [
  { doc_type_id: 1, type_name: 'Safety Manual', area: 'SAFETY', category: 'Manual' },
  { doc_type_id: 2, type_name: 'Training Document', area: 'TRAINING', category: 'Curriculum' },
  { doc_type_id: 3, type_name: 'SOP Document', area: 'OPERATION', category: 'Procedure' },
  { doc_type_id: 4, type_name: 'Maintenance Document', area: 'MAINTENANCE', category: 'Checklist' },
  { doc_type_id: 5, type_name: 'Security Policy', area: 'SECURITY', category: 'Policy' },
  { doc_type_id: 6, type_name: 'Compliance Document', area: 'COMPLIANCE', category: 'Manual' },
];

export const DUMMY_NOTIFICATIONS: Notifications[] = [
  {
    notification_id: 1,
    message: 'New document requires your review: Safety Management System Manual v2.1',
    procedure_name: 'document_review',
    is_read: 'N',
    created_at: '2024-02-03T10:30:00',
    sender_fullname: 'John Smith',
    sender_profile: 'Compliance Manager',
    sender_profile_code: 'COMP_MGR',
    communication_general_id: 101,
  },
  {
    notification_id: 2,
    message: 'Training curriculum has been updated and approved',
    procedure_name: 'training_update',
    is_read: 'Y',
    created_at: '2024-02-02T14:15:00',
    read_at: '2024-02-02T16:20:00',
    sender_fullname: 'Sarah Johnson',
    sender_profile: 'Training Manager',
    sender_profile_code: 'TRAIN_MGR',
    communication_general_id: 102,
  },
  {
    notification_id: 3,
    message: 'Maintenance checklist requires immediate attention',
    procedure_name: 'maintenance_alert',
    is_read: 'N',
    created_at: '2024-02-03T09:00:00',
    sender_fullname: 'Mike Davis',
    sender_profile: 'Maintenance Chief',
    sender_profile_code: 'MAINT_CHIEF',
    communication_general_id: 103,
  },
  {
    notification_id: 4,
    message: 'Your document submission has been approved',
    procedure_name: 'document_approval',
    is_read: 'Y',
    created_at: '2024-02-01T11:45:00',
    read_at: '2024-02-01T12:00:00',
    sender_fullname: 'Lisa Brown',
    sender_profile: 'Quality Assurance',
    sender_profile_code: 'QA_LEAD',
    communication_general_id: 104,
  },
];

export const DUMMY_SAFETY_INDICATORS: SafetyIndicator[] = [
  {
    id: 1,
    indicator_code: 'TRAIN_COMPLIANCE_RATE',
    indicator_type: 'KPI',
    indicator_area: 'TRAINING',
    indicator_name: 'Training Compliance Rate',
    indicator_desc: 'Percentage of required training completed on time',
    target_value: 95.00,
    unit: '%',
    frequency: 'MONTHLY',
    is_active: 1,
  },
  {
    id: 2,
    indicator_code: 'INCIDENT_RATE',
    indicator_type: 'SPI',
    indicator_area: 'OPERATIONS',
    indicator_name: 'Incident Rate',
    indicator_desc: 'Number of incidents per 1000 flight hours',
    target_value: 0.50,
    unit: 'n/1000h',
    frequency: 'MONTHLY',
    is_active: 1,
  },
  {
    id: 3,
    indicator_code: 'MAINT_ON_TIME',
    indicator_type: 'KPI',
    indicator_area: 'MAINTENANCE',
    indicator_name: 'On-Time Maintenance Completion',
    indicator_desc: 'Percentage of maintenance tasks completed within scheduled time',
    target_value: 98.00,
    unit: '%',
    frequency: 'MONTHLY',
    is_active: 1,
  },
  {
    id: 4,
    indicator_code: 'COMPLIANCE_AUDIT_SCORE',
    indicator_type: 'KPI',
    indicator_area: 'COMPLIANCE',
    indicator_name: 'Compliance Audit Score',
    indicator_desc: 'Average score from compliance audits',
    target_value: 90.00,
    unit: '%',
    frequency: 'QUARTERLY',
    is_active: 1,
  },
  {
    id: 5,
    indicator_code: 'SAFETY_REPORT_TIME',
    indicator_type: 'SPI',
    indicator_area: 'OPERATIONS',
    indicator_name: 'Safety Report Submission Time',
    indicator_desc: 'Average time to submit safety reports after incidents',
    target_value: 24.00,
    unit: 'h',
    frequency: 'MONTHLY',
    is_active: 1,
  },
  {
    id: 6,
    indicator_code: 'TRAINING_HOURS',
    indicator_type: 'KPI',
    indicator_area: 'TRAINING',
    indicator_name: 'Average Training Hours',
    indicator_desc: 'Average training hours per pilot per month',
    target_value: 8.00,
    unit: 'h',
    frequency: 'MONTHLY',
    is_active: 0,
  },
];



export const dummyLUCProcedures: LUCProcedure[] = [
  {
    id: '1',
    code: 'LUC-001',
    sector: 'EVALUATION',
    version: '1.0',
    active: 'Y',
    description: 'Pre-flight evaluation procedure for drone operations',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        weatherCheck: { type: 'boolean' },
        batteryLevel: { type: 'number', minimum: 80 },
        equipmentStatus: { type: 'string', enum: ['good', 'fair', 'poor'] }
      }
    }, null, 2),
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '2',
    code: 'LUC-002',
    sector: 'PLANNING',
    version: '2.1',
    active: 'Y',
    description: 'Mission route planning and airspace clearance',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        routeWaypoints: { type: 'array' },
        airspaceClearance: { type: 'boolean' },
        estimatedDuration: { type: 'number' }
      }
    }, null, 2),
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-10T11:45:00Z'
  },
  {
    id: '3',
    code: 'LUC-003',
    sector: 'MISSION',
    version: '1.5',
    active: 'N',
    description: 'In-flight mission execution protocol (deprecated)',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        missionStatus: { type: 'string' },
        telemetryData: { type: 'object' }
      }
    }, null, 2),
    createdAt: '2023-12-10T08:30:00Z',
    updatedAt: '2024-01-05T16:00:00Z'
  }
];

export const dummyChecklists: Checklist[] = [
  {
    id: '1',
    code: 'CHK-001',
    version: '1.0',
    active: 'Y',
    description: 'Pre-flight safety checklist',
    jsonSchema: JSON.stringify({
      title: 'Pre-flight Safety Checklist',
      pages: [
        {
          name: 'safety',
          elements: [
            { type: 'checkbox', name: 'batteryCheck', title: 'Battery charged above 80%' },
            { type: 'checkbox', name: 'propellerCheck', title: 'Propellers securely attached' },
            { type: 'checkbox', name: 'weatherCheck', title: 'Weather conditions acceptable' }
          ]
        }
      ]
    }, null, 2),
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T14:20:00Z'
  },
  {
    id: '2',
    code: 'CHK-002',
    version: '2.0',
    active: 'Y',
    description: 'Post-flight maintenance checklist',
    jsonSchema: JSON.stringify({
      title: 'Post-flight Maintenance',
      pages: [
        {
          name: 'maintenance',
          elements: [
            { type: 'checkbox', name: 'visualInspection', title: 'Visual damage inspection' },
            { type: 'checkbox', name: 'cleaningDone', title: 'Equipment cleaned' },
            { type: 'text', name: 'notes', title: 'Additional notes' }
          ]
        }
      ]
    }, null, 2),
    createdAt: '2024-02-05T11:30:00Z',
    updatedAt: '2024-02-12T09:15:00Z'
  },
  {
    id: '3',
    code: 'CHK-003',
    version: '1.2',
    active: 'N',
    description: 'Emergency landing procedure (outdated)',
    jsonSchema: JSON.stringify({
      title: 'Emergency Landing',
      pages: [
        {
          name: 'emergency',
          elements: [
            { type: 'checkbox', name: 'emergencySignal', title: 'Emergency signal activated' }
          ]
        }
      ]
    }, null, 2),
    createdAt: '2023-11-20T13:00:00Z',
    updatedAt: '2023-12-15T10:30:00Z'
  }
];

export const dummyAssignments: Assignment[] = [
  {
    id: '1',
    code: 'ASG-001',
    version: '1.0',
    active: 'Y',
    description: 'Pilot assignment for surveillance missions',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        pilotId: { type: 'string' },
        missionType: { type: 'string', enum: ['surveillance', 'delivery', 'inspection'] },
        certificationRequired: { type: 'array', items: { type: 'string' } }
      }
    }, null, 2),
    createdAt: '2024-01-20T08:00:00Z',
    updatedAt: '2024-01-25T16:45:00Z'
  },
  {
    id: '2',
    code: 'ASG-002',
    version: '1.1',
    active: 'Y',
    description: 'Ground crew assignment protocol',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        crewMembers: { type: 'array' },
        roles: { type: 'array' },
        shiftTiming: { type: 'string' }
      }
    }, null, 2),
    createdAt: '2024-02-08T10:30:00Z',
    updatedAt: '2024-02-15T12:00:00Z'
  }
];

export const dummyCommunications: Communication[] = [
  {
    id: '1',
    code: 'COM-001',
    version: '1.0',
    active: 'Y',
    description: 'Radio communication protocol for flight operations',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        frequency: { type: 'number' },
        callSign: { type: 'string' },
        emergencyChannel: { type: 'number' }
      }
    }, null, 2),
    createdAt: '2024-01-12T09:00:00Z',
    updatedAt: '2024-01-18T15:30:00Z'
  },
  {
    id: '2',
    code: 'COM-002',
    version: '2.0',
    active: 'Y',
    description: 'Ground-to-air communication standards',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        protocol: { type: 'string', enum: ['VHF', 'UHF', 'digital'] },
        encryption: { type: 'boolean' },
        backupChannel: { type: 'number' }
      }
    }, null, 2),
    createdAt: '2024-02-01T11:00:00Z',
    updatedAt: '2024-02-10T13:45:00Z'
  }
];

export const dummyOrganizationTree: OrganizationNode = {
  id: '1',
  name: 'Readi Drone Control Center',
  title: 'Headquarters',
  department: 'Executive',
  children: [
    {
      id: '2',
      name: 'Operations Division',
      title: 'Division Head',
      department: 'Operations',
      children: [
        {
          id: '3',
          name: 'Flight Operations',
          title: 'Manager',
          department: 'Flight Ops',
          children: [
            { id: '4', name: 'Pilot Team A', title: 'Team Lead', department: 'Flight Ops' },
            { id: '5', name: 'Pilot Team B', title: 'Team Lead', department: 'Flight Ops' }
          ]
        },
        {
          id: '6',
          name: 'Ground Support',
          title: 'Manager',
          department: 'Ground Ops',
          children: [
            { id: '7', name: 'Maintenance Crew', title: 'Supervisor', department: 'Maintenance' },
            { id: '8', name: 'Logistics Team', title: 'Coordinator', department: 'Logistics' }
          ]
        }
      ]
    },
    {
      id: '9',
      name: 'Planning Division',
      title: 'Division Head',
      department: 'Planning',
      children: [
        {
          id: '10',
          name: 'Mission Planning',
          title: 'Manager',
          department: 'Planning',
          children: [
            { id: '11', name: 'Route Planning', title: 'Specialist', department: 'Planning' },
            { id: '12', name: 'Risk Assessment', title: 'Analyst', department: 'Safety' }
          ]
        }
      ]
    },
    {
      id: '13',
      name: 'Technical Division',
      title: 'Division Head',
      department: 'Technical',
      children: [
        { id: '14', name: 'Software Development', title: 'Manager', department: 'IT' },
        { id: '15', name: 'Hardware Engineering', title: 'Manager', department: 'Engineering' }
      ]
    }
  ]
};