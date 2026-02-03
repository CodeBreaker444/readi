export interface Document {
  document_id: number;
  doc_type_id: number;
  doc_code: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'OBSOLETE';
  area: string;
  category: string;
  confidentiality: 'INTERNAL' | 'PUBLIC' | 'CONFIDENTIAL' | 'RESTRICTED';
  owner_role: string;
  effective_date?: string;
  expiry_date?: string;
  keywords?: string;
  tags?: string;
  version_label: string;
  change_log?: string;
  file_path?: string;
  created_at: string;
  updated_at: string;
  type_name?: string;
}

export interface FilterState {
  search: string;
  area: string;
  category: string;
  status: string;
  owner: string;
}

export interface DocumentType {
  doc_type_id: number;
  type_name: string;
  area: string;
  category: string;
}

export interface HistoryItem {
  version_label: string;
  change_log: string;
  created_at: string;
  created_by: string;
}

export interface Notifications {
  notification_id: number;
  message: string;
  procedure_name: string;
  is_read: 'Y' | 'N';
  created_at: string;
  read_at?: string;
  sender_fullname?: string;
  sender_profile?: string;
  sender_profile_code?: string;
  communication_general_id?: number;
}

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

// Shared types for organization modules

export interface LUCProcedure {
  id: string;
  code: string;
  sector: 'EVALUATION' | 'PLANNING' | 'MISSION';
  version: string;
  active: 'Y' | 'N';
  description: string;
  jsonSchema: string;
  createdAt: string;
  updatedAt: string;
}

export interface Checklist {
  id: string;
  code: string;
  version: string;
  active: 'Y' | 'N';
  description: string;
  jsonSchema: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  code: string;
  version: string;
  active: 'Y' | 'N';
  description: string;
  jsonSchema: string;
  createdAt: string;
  updatedAt: string;
}

export interface Communication {
  id: string;
  code: string;
  version: string;
  active: 'Y' | 'N';
  description: string;
  jsonSchema: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationNode {
  id: string;
  name: string;
  title?: string;
  department?: string;
  children?: OrganizationNode[];
}

export type ActiveStatus = 'Y' | 'N';
export type SectorType = 'EVALUATION' | 'PLANNING' | 'MISSION';