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

export interface LocationGroupLocation {
  location_id?: number
  name: string
  lat?: number | null
  lng?: number | null
}

export interface LocationGroupContact {
  id: number
  contact: string
  type: ErpType
  description: string
}

export interface LocationGroup {
  group_id: number
  name: string
  notes?: string | null
  is_active: boolean
  owner_id: number
  locations: LocationGroupLocation[]
  contacts: LocationGroupContact[]
  created_at?: string
  updated_at?: string
}

export interface LocationGroupCreateInput {
  name: string
  notes?: string | null
  is_active: boolean
  locations: LocationGroupLocation[]
  existing_contact_ids: number[]
  new_contacts: { type: ErpType; contact: string; description: string }[]
}
