import { supabase } from '@/backend/database/database';
import { existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

export async function uploadEvaluationFile(
    ownerId: number,
    clientId: number,
    evaluationId: number,
    userId:number,
    file: File,
    description: string,
    version: number
) {
    try {
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'evaluations', String(ownerId), String(evaluationId));

        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const originalName = file.name;
        const extension = originalName.substring(originalName.lastIndexOf('.'));
        const filename = `${timestamp}_${originalName}`;
        const filePath = join(uploadDir, filename);

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        const fileFolder = `/uploads/evaluations/${ownerId}/${evaluationId}/${filename}`;
        const { data, error } = await supabase
            .from('evaluation_file')
            .insert({
                fk_evaluation_id: evaluationId,
                file_name: originalName,
                file_path: fileFolder,
                file_type: file.type,
                file_category: 'Upload',
                file_size: file.size.toString(),
                file_description: description,
                uploaded_by_user_id: userId,
                file_version: version,
                is_latest: 'true'
            })
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            file: {
                id: data.file_id,
                filename: data.file_name,
                description: data.file_description,
                version: data.file_version,
                upload_date: data.uploaded_at,
                folder: data.file_path
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
            .select('file_path')   
            .eq('file_id', fileId)   
            .single();

        if (fetchError) throw fetchError;

        const filePath = join(process.cwd(), 'public', fileData.file_path);
        if (existsSync(filePath)) {
            await unlink(filePath);
        }

        const { error: deleteError } = await supabase
            .from('evaluation_file')
            .delete()
            .eq('file_id', fileId);   

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