import { prisma } from '@/lib/prisma';

export async function getLUCProceduresList(ownerId: number, sector?: string) {
  try {
    const procedures = await prisma.luc_procedure.findMany({
      where: {
        fk_owner_id: ownerId,
        procedure_active: 'Y',
        ...(sector && { procedure_status: sector }),
      },
      orderBy: { procedure_name: 'asc' },
      select: {
        procedure_id: true,
        procedure_code: true,
        procedure_name: true,
        procedure_description: true,
        procedure_version: true,
        procedure_status: true,
        procedure_steps: true,
        effective_date: true,
        procedure_active: true,
      },
    });

    return {
      success: true,
      procedures: procedures.map(proc => ({
        id: proc.procedure_id,
        name: proc.procedure_name,
        code: proc.procedure_code,
        description: proc.procedure_description,
        version: proc.procedure_version,
        status: proc.procedure_status,
        steps: proc.procedure_steps,
      })),
    };
  } catch (error) {
    console.error('Error fetching procedures:', error);
    throw new Error('Failed to fetch procedures');
  }
}

export async function getLUCProcedureById(procedureId: number) {
  try {
    const data = await prisma.luc_procedure.findUnique({
      where: { procedure_id: procedureId },
    });

    if (!data) throw new Error('Procedure not found');

    return {
      success: true,
      procedure: {
        id: data.procedure_id,
        name: data.procedure_name,
        code: data.procedure_code,
        description: data.procedure_description,
        version: data.procedure_version,
        status: data.procedure_status,
        steps: data.procedure_steps,
        effectiveDate: data.effective_date,
        reviewDate: data.review_date,
        active: data.procedure_active,
      },
    };
  } catch (error) {
    console.error('Error fetching Procedure:', error);
    throw new Error('Failed to fetch Procedure');
  }
}
