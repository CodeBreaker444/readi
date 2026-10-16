import type { EventAttachmentInput } from '@/config/types/event-logbook';
import axios from 'axios';

/** Uploads files straight to storage through presigned URLs and returns the references the API stores. */
export async function uploadEventFiles(files: File[]): Promise<EventAttachmentInput[]> {
  const uploaded: EventAttachmentInput[] = [];
  for (const file of files) {
    const presign = await axios.post('/api/logbooks/event/presign', {
      file_name: file.name,
      content_type: file.type,
      file_size: file.size,
    });
    await axios.put(presign.data.upload_url, file, { headers: { 'Content-Type': file.type } });
    uploaded.push({ file_name: file.name, file_key: presign.data.file_key, file_type: file.type, file_size: file.size });
  }
  return uploaded;
}
