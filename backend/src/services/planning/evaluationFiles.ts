import { supabase } from '@/backend/database/database';
import { existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
 

export async function uploadEvaluationFile(
  ownerId: number,
  clientId: number,
  evaluationId: number,
  file: File,
  description: string,
  version: string
) {
  try {
    // Create directory structure
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'evaluations', String(ownerId), String(evaluationId));
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const filename = `${timestamp}_${originalName}`;
    const filePath = join(uploadDir, filename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Database entry
    const fileFolder = `/uploads/evaluations/${ownerId}/${evaluationId}/${filename}`;

    const { data, error } = await supabase
      .from('evaluation_file')
      .insert({
        fk_owner_id: ownerId,
        fk_client_id: clientId,
        fk_evaluation_id: evaluationId,
        evaluation_file_filename: originalName,
        evaluation_file_desc: description,
        evaluation_file_ver: version,
        evaluation_file_folder: fileFolder,
        last_update: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      file: {
        id: data.evaluation_file_id,
        filename: data.evaluation_file_filename,
        description: data.evaluation_file_desc,
        version: data.evaluation_file_ver,
        upload_date: data.last_update,
        folder: data.evaluation_file_folder
      }
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

export async function deleteEvaluationFile(fileId: number, ownerId: number) {
  try {
    const { data: fileData, error: fetchError } = await supabase
      .from('evaluation_file')
      .select('evaluation_file_folder')
      .eq('evaluation_file_id', fileId)
      .eq('fk_owner_id', ownerId)
      .single();

    if (fetchError) throw fetchError;

    // Delete physical file
    const filePath = join(process.cwd(), 'public', fileData.evaluation_file_folder);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    const { error: deleteError } = await supabase
      .from('evaluation_file')
      .delete()
      .eq('evaluation_file_id', fileId)
      .eq('fk_owner_id', ownerId);

    if (deleteError) throw deleteError;

    return {
      success: true,
      message: 'File deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}