import { prisma } from '@/lib/prisma';
import { SpiKpiCreateInput, SpiKpiDefinition, SpiKpiListInput, SpiKpiToggleInput, SpiKpiUpdateInput } from "@/config/types/safetyMng";

export interface SpiKpiMeasurementInput {
  definition_id: number;
  owner_id: number;
  measurement_date: string;
  actual_value: number;
  target_value: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
}

export async function logSpiKpiMeasurement(input: SpiKpiMeasurementInput): Promise<{ kpi_id: number }> {
  const row = await prisma.spi_kpi.upsert({
    where: {
      fk_definition_id_measurement_date: {
        fk_definition_id: input.definition_id,
        measurement_date: new Date(input.measurement_date),
      },
    },
    update: {
      fk_owner_id: input.owner_id,
      actual_value: input.actual_value,
      target_value: input.target_value,
      status: input.status,
    },
    create: {
      fk_definition_id: input.definition_id,
      fk_owner_id: input.owner_id,
      measurement_date: new Date(input.measurement_date),
      actual_value: input.actual_value,
      target_value: input.target_value,
      status: input.status,
    },
    select: { kpi_id: true },
  });
  return { kpi_id: row.kpi_id };
}

function mapRow(row: any): SpiKpiDefinition {
  return {
    id: row.definition_id as number,
    indicator_code: row.kpi_code as string,
    indicator_type: row.kpi_type as SpiKpiDefinition['indicator_type'],
    indicator_area: row.kpi_category as SpiKpiDefinition['indicator_area'],
    indicator_name: row.kpi_name as string,
    indicator_desc: row.kpi_description ?? null,
    target_value: row.target_value != null ? Number(row.target_value) : 0,
    unit: row.measurement_unit as string,
    frequency: (row.frequency as SpiKpiDefinition['frequency']) ?? 'MONTHLY',
    is_active: row.is_active ? 1 : 0,
    created_at: row.created_at?.toISOString() ?? '',
    updated_at: row.updated_at?.toISOString() ?? '',
  };
}

export async function listSpiKpiDefinitions(filters: SpiKpiListInput): Promise<SpiKpiDefinition[]> {
  const rows = await prisma.spi_kpi_definition.findMany({
    where: {
      ...(filters.q && {
        OR: [
          { kpi_code: { contains: filters.q, mode: 'insensitive' } },
          { kpi_name: { contains: filters.q, mode: 'insensitive' } },
          { kpi_description: { contains: filters.q, mode: 'insensitive' } },
        ],
      }),
      ...(filters.area && { kpi_category: filters.area }),
      ...(filters.type && { kpi_type: filters.type }),
      ...(filters.active !== '' && { is_active: filters.active === '1' }),
    },
    orderBy: [
      { kpi_category: 'asc' },
      { kpi_type: 'asc' },
      { kpi_code: 'asc' },
    ],
  });

  return rows.map(mapRow);
}

export async function createSpiKpiDefinition(input: SpiKpiCreateInput): Promise<SpiKpiDefinition> {
  const existing = await prisma.spi_kpi_definition.findUnique({
    where: { kpi_code: input.indicator_code },
    select: { kpi_code: true },
  });
  if (existing) throw new Error(`Code "${input.indicator_code}" already exists`);

  const row = await prisma.spi_kpi_definition.create({
    data: {
      kpi_code: input.indicator_code,
      kpi_type: input.indicator_type,
      kpi_category: input.indicator_area,
      kpi_name: input.indicator_name,
      kpi_description: input.indicator_desc ?? null,
      target_value: input.target_value,
      measurement_unit: input.unit,
      frequency: input.frequency,
      is_active: input.is_active === 1,
    },
  });

  return mapRow(row);
}

export async function updateSpiKpiDefinition(input: SpiKpiUpdateInput): Promise<SpiKpiDefinition> {
  const row = await prisma.spi_kpi_definition.update({
    where: { definition_id: input.id },
    data: {
      kpi_name: input.indicator_name,
      kpi_description: input.indicator_desc ?? null,
      target_value: input.target_value,
      measurement_unit: input.unit,
      frequency: input.frequency,
      is_active: input.is_active === 1,
      updated_at: new Date(),
    },
  });

  return mapRow(row);
}

export async function toggleSpiKpiDefinition(input: SpiKpiToggleInput): Promise<SpiKpiDefinition> {
  const row = await prisma.spi_kpi_definition.update({
    where: { definition_id: input.id },
    data: { is_active: input.is_active === 1, updated_at: new Date() },
  });

  return mapRow(row);
}