import { getUserSession } from '@/lib/auth/server-session';
import { redirect } from 'next/navigation';

export default async function CompanyDetailLayout({ children }: { children: React.ReactNode }) {
    const session = await getUserSession();
    if (!session || session.user.role !== 'SUPERADMIN') {
        redirect('/unauthorized');
    }
    return <>{children}</>;
}
