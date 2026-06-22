import { prisma } from '@/lib/prisma';
import { buildS3Url, deleteFileFromS3, uploadFileToS3 } from '@/lib/s3Client';

function buildEvaluationS3Key(ownerId: number, evaluationId: number, originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `evaluations/${ownerId}/${evaluationId}/${Date.now()}_${safe}`;
}

export async function uploadEvaluationFile(
  ownerId: number,
  clientId: number,
  evaluationId: number,
  userId: number,
  file: File,
  description: string,
  version: number
) {
  try {
    const originalName = file.name;
    const s3Key = buildEvaluationS3Key(ownerId, evaluationId, originalName);

    await uploadFileToS3(s3Key, file);

    const s3Url = buildS3Url(s3Key);

    const data = await prisma.evaluation_file.create({
      data: {
        fk_evaluation_id: evaluationId,
        file_name: originalName,
        file_path: s3Key,
        file_type: file.type,
        file_url: s3Url,
        file_category: 'Upload',
        file_size: BigInt(file.size),
        file_description: description,
        uploaded_by_user_id: userId,
        file_version: version,
        is_latest: true,
      },
    });

    return {
      success: true,
      file: {
        id: data.file_id,
        filename: data.file_name,
        description: data.file_description,
        version: data.file_version,
        upload_date: data.uploaded_at,
        folder: data.file_path,
      },
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

export async function deleteEvaluationFile(fileId: number, ownerId: number) {
  try {
    const fileData = await prisma.evaluation_file.findUnique({
      where: { file_id: fileId },
      select: { file_path: true },
    });

    if (!fileData) throw new Error('File not found');

    if (fileData.file_path) {
      await deleteFileFromS3(fileData.file_path);
    }

    await prisma.evaluation_file.delete({ where: { file_id: fileId } });

    return {
      success: true,
      message: 'File deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}
