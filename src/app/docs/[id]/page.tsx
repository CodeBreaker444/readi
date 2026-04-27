import { getDocumentByKey } from '@/backend/services/docs/doc-service';
import { notFound } from 'next/navigation';
import DocViewerClient from '../../../components/docs/DocViewerClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function DocViewerPage({ params }: PageProps) {
    const { id } = await params;
    const doc = await getDocumentByKey(id);

    if (!doc) notFound();

    return <DocViewerClient doc={doc} />;
}
