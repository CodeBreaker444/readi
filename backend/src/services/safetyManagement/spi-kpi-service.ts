import { supabase } from "@/backend/database/database"
import { SpiKpiCreateInput, SpiKpiDefinition, SpiKpiListInput, SpiKpiToggleInput, SpiKpiUpdateInput } from "@/config/types/safetyMng"


function mapRow(row: Record<string, unknown>): SpiKpiDefinition {
  return {
    id: row.definition_id as number,
    indicator_code: row.kpi_code as string,
    indicator_type: row.kpi_type as SpiKpiDefinition['indicator_type'],
    indicator_area: row.kpi_category as SpiKpiDefinition['indicator_area'],
    indicator_name: row.kpi_name as string,
    indicator_desc: (row.kpi_description as string) ?? null,
    target_value: row.target_value as number,
    unit: row.measurement_unit as string,
    frequency: (row.frequency as SpiKpiDefinition['frequency']) ?? 'MONTHLY',
    is_active: row.is_active ? 1 : 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function listSpiKpiDefinitions(
  filters: SpiKpiListInput
): Promise<SpiKpiDefinition[]> {
  let query = supabase
    .from('spi_kpi_definition')
    .select('*')
    .order('kpi_category', { ascending: true })
    .order('kpi_type', { ascending: true })
    .order('kpi_code', { ascending: true })

  if (filters.q) {
    query = query.or(
      `kpi_code.ilike.%${filters.q}%,kpi_name.ilike.%${filters.q}%,kpi_description.ilike.%${filters.q}%`
    )
  }

  if (filters.area) {
    query = query.eq('kpi_category', filters.area)
  }

  if (filters.type) {
    query = query.eq('kpi_type', filters.type)
  }

  if (filters.active !== '') {
    query = query.eq('is_active', filters.active === '1')
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return (data ?? []).map(mapRow)
}

export async function createSpiKpiDefinition(
  input: SpiKpiCreateInput
): Promise<SpiKpiDefinition> {
  const { data: existing } = await supabase
    .from('spi_kpi_definition')
    .select('kpi_code')
    .eq('kpi_code', input.indicator_code)
    .single()

  if (existing) throw new Error(`Code "${input.indicator_code}" already exists`)

  const { data, error } = await supabase
    .from('spi_kpi_definition')
    .insert({
      kpi_code: input.indicator_code,
      kpi_type: input.indicator_type,
      kpi_category: input.indicator_area,
      kpi_name: input.indicator_name,
      kpi_description: input.indicator_desc ?? null,
      target_value: input.target_value,
      measurement_unit: input.unit,
      frequency: input.frequency,
      is_active: input.is_active === 1,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return mapRow(data)
}

export async function updateSpiKpiDefinition(
  input: SpiKpiUpdateInput
): Promise<SpiKpiDefinition> {
  const { data, error } = await supabase
    .from('spi_kpi_definition')
    .update({
      kpi_name: input.indicator_name,
      kpi_description: input.indicator_desc ?? null,
      target_value: input.target_value,
      measurement_unit: input.unit,
      frequency: input.frequency,
      is_active: input.is_active === 1,
    })
    .eq('definition_id', input.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Record not found')

  return mapRow(data)
}

export async function toggleSpiKpiDefinition(
  input: SpiKpiToggleInput
): Promise<SpiKpiDefinition> {
  const { data, error } = await supabase
    .from('spi_kpi_definition')
    .update({ is_active: input.is_active === 1 })
    .eq('definition_id', input.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Record not found')

  return mapRow(data)
}