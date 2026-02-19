// Matches actual luc_procedure table columns from the database
export type LucProcedureStatus = 'EVALUATION' | 'PLANNING' | 'MISSION';
export type ActiveStatus = 'Y' | 'N';

export interface ProcedureStepItem {
  checklist_id?: number;
  checklist_code?: string;
  checklist_name?: string;
  checklist_completed?: 'Y' | 'N';
  assignment_id?: number;
  assignment_code?: string;
  assignment_name?: string;
  assignment_completed?: 'Y' | 'N';
  communication_id?: number;
  communication_code?: string;
  communication_name?: string;
  communication_completed?: 'Y' | 'N';
}

export interface ProcedureSteps {
  tasks: {
    checklist: ProcedureStepItem[];
    assignment: ProcedureStepItem[];
    communication: ProcedureStepItem[];
  };
}

export interface LucProcedure {
  procedure_id: number;
  fk_owner_id: number;
  fk_document_id: number | null;
  procedure_code: string;
  procedure_name: string;
  procedure_description: string | null;
  procedure_steps: ProcedureSteps | null;
  procedure_version: string;
  procedure_status: LucProcedureStatus;
  procedure_sector: string | null;
  effective_date: string | null;
  review_date: string | null;
  created_by_user_id: number | null;
  approved_by_user_id: number | null;
  procedure_active: ActiveStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateLucProcedurePayload {
  fk_owner_id: number;
  procedure_code: string;
  procedure_name: string;
  procedure_description?: string;
  procedure_steps?: ProcedureSteps;
  procedure_version?: string;
  procedure_status: LucProcedureStatus;
  procedure_sector?: string;
  effective_date?: string;
  review_date?: string;
  procedure_active?: ActiveStatus;
}

export interface UpdateLucProcedurePayload extends Partial<CreateLucProcedurePayload> {
  procedure_id: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  code: number;
  dataRows: number;
}

export type LucProcedureSector = LucProcedureStatus;