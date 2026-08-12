export type IndicatorType = 'KPI' | 'SPI'
export type IndicatorArea = 'COMPLIANCE' | 'TRAINING' | 'OPERATIONS' | 'MAINTENANCE'
export type FrequencyType = 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY'
export type TargetDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER'

export interface SpiKpiDefinition {
  id: number
  indicator_code: string
  indicator_type: IndicatorType
  indicator_area: IndicatorArea
  indicator_name: string
  indicator_desc: string | null
  target_value: number
  target_direction: TargetDirection
  unit: string
  frequency: FrequencyType
  is_active: 0 | 1
  created_at?: string
  updated_at?: string
}

export interface SpiKpiFilters {
  q?: string
  area?: IndicatorArea | ''
  type?: IndicatorType | ''
  active?: '1' | '0' | ''
}

export interface ListResponse {
  code: 1 | 0
  data: SpiKpiDefinition[]
  error?: string
}

export interface MutationResponse {
  code: 1 | 0
  data?: SpiKpiDefinition
  error?: string
}

export type SpiKpiCreateInput = {
  indicator_code: string;
  indicator_type: 'KPI' | 'SPI';
  indicator_area: 'COMPLIANCE' | 'TRAINING' | 'OPERATIONS' | 'MAINTENANCE';
  indicator_name: string;
  indicator_desc?: string | null;
  target_value: number;
  target_direction?: TargetDirection;
  unit: string;
  frequency?: 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY';
  is_active?: number;
};

export type SpiKpiUpdateInput = {
  id: number;
  indicator_name: string;
  indicator_desc?: string | null;
  target_value: number;
  target_direction?: TargetDirection;
  unit: string;
  frequency?: 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY';
  is_active?: number;
};

export type SpiKpiToggleInput = {
  id: number;
  is_active: number;
};

export type SpiKpiListInput = {
  q?: string;
  area?: 'COMPLIANCE' | 'TRAINING' | 'OPERATIONS' | 'MAINTENANCE' | '';
  type?: 'KPI' | 'SPI' | '';
  active?: '1' | '0' | '';
};

export const AREAS = ['COMPLIANCE', 'TRAINING', 'OPERATIONS', 'MAINTENANCE'] as const
export const TYPES = ['KPI', 'SPI'] as const
export const FREQUENCIES = ['MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY'] as const
export const TARGET_DIRECTIONS = ['HIGHER_IS_BETTER', 'LOWER_IS_BETTER'] as const