export type ErpType = 'GENERAL' | 'MEDICAL' | 'FIRE' | 'SECURITY' | 'ENVIRONMENTAL'

export interface EmergencyResponsePlan {
  id: number
  description: string
  contact: string
  type: ErpType
  owner_id: number
  created_at?: string
  updated_at?: string
}

export interface ErpCreateInput {
  description: string
  contact: string
  type: ErpType
  owner_id: number
}

export interface ErpListInput {
  owner_id: number
}

export const ERP_TYPES = ['GENERAL', 'MEDICAL', 'FIRE', 'SECURITY', 'ENVIRONMENTAL'] as const
