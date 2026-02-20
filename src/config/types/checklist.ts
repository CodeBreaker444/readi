export interface Checklist {
  checklist_id: number
  fk_user_id: number | null
  fk_owner_id: number | null
  checklist_code: string | null
  checklist_desc: string | null
  checklist_json: Record<string, unknown> | null
  checklist_ver: number | null
  checklist_active: 'Y' | 'N' | null
  created_at: string | null
  updated_at: string | null
}

export interface ChecklistCreatePayload {
  checklist_code: string
  checklist_desc: string
  checklist_ver: string
  checklist_active: 'Y' | 'N'
  checklist_json: string  
  fk_owner_id?: number
  fk_user_id?: number
}

export interface ChecklistUpdatePayload {
  checklist_id: number
  checklist_code: string
  checklist_desc: string
  checklist_ver: string
  checklist_active: 'Y' | 'N'
  checklist_json: string 
  fk_owner_id: number
  fk_user_id?: number
}

