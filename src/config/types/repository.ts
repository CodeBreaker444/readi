// =============================================
// REPOSITORY DOCUMENT TYPES
// =============================================

export type DocumentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "OBSOLETE";
export type DocumentConfidentiality = "INTERNAL" | "PUBLIC" | "CONFIDENTIAL" | "RESTRICTED";
export type DocumentArea =
  | "BOARD"
  | "COMPLIANCE"
  | "DATACONTROLLER"
  | "MAINTENANCE"
  | "OPERATION"
  | "SAFETY"
  | "SECURITY"
  | "TRAINING"
  | "VENDOR";

export interface DocType {
  doc_type_id: number;
  doc_type_code: string;
  doc_type_name: string;
  doc_type_description?: string;
  doc_type_category?: string;
  doc_area?: DocumentArea;
  doc_name?: string;
  retention_days?: number | null;    
  default_owner_role?: string | null;  
}

export interface DocumentRevision {
  rev_id: number;
  document_id: number;
  version_label: string;
  file_name: string;
  file_path: string;
  mime_type?: string | null;        
  file_size?: number;
  change_log?: string;
  uploaded_at: string;
  uploaded_by_user_id?: number | null; 
}

export interface RepositoryDocument {
  document_id: number;
  doc_type_id: number;
  type_name?: string | null;         
  doc_area?: DocumentArea | null;    
  doc_category?: string | null;      
  doc_code?: string | null;
  title: string;
  description?: string | null;
  status: DocumentStatus;
  confidentiality: DocumentConfidentiality;
  owner_role?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  keywords?: string | null;          
  tags?: string | null;              
  version_label?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  s3_url?: string | null;            
  rev_id?: number | null;
  default_owner_role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DocumentFilters {
  status: string[];
  doc_area: string[];
  doc_category: string[];
  doc_owner_role: string[];
}

export interface DocTypesListResponse {
  items: DocType[];
  filters: DocumentFilters;
}

export interface DocumentListResponse {
  items: RepositoryDocument[];
  filters: Pick<DocumentFilters, "status">;
}

export interface DocumentHistoryResponse {
  items: DocumentRevision[];
}

 export type DocumentListInput = {
  area?: "BOARD" | "COMPLIANCE" | "DATACONTROLLER" | "MAINTENANCE" | "OPERATION" | "SAFETY" | "SECURITY" | "TRAINING" | "VENDOR";
  category?: string;
  status?: "DRAFT" | "IN_REVIEW" | "APPROVED" | "OBSOLETE";
  owner_role?: string;
  search?: string;
};

export type DocumentCreateInput = {
  doc_type_id: number;
  doc_code?: string;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "OBSOLETE";
  title: string;
  confidentiality: "INTERNAL" | "PUBLIC" | "CONFIDENTIAL" | "RESTRICTED";
  owner_role?: string;
  effective_date?: string | null;
  expiry_date?: string | null;
  description?: string;
  keywords?: string;
  tags?: string;
  version_label?: string;
  change_log?: string;
};  

export type DocumentUpdateInput = {
  document_id: number;
  doc_type_id: number;
  doc_code?: string | null;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "OBSOLETE";
  title: string;
  confidentiality: "INTERNAL" | "PUBLIC" | "CONFIDENTIAL" | "RESTRICTED";
  owner_role?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  description?: string | null;
  keywords?: string | null;
  tags?: string | null;
};

export type DocumentDeleteInput = {
  document_id: number;
};

export type DocumentHistoryInput = {
  document_id: number;
};

export type DocumentUploadRevisionInput = {
  document_id: number;
  version_label?: string;
  change_log?: string;
};

export type PresignedDownloadInput = {
  rev_id: number;
};