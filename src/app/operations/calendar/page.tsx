'use client';
import { CalendarDashboard } from "@/components/operation/CalendarDashboard";
import { useTheme } from "@/components/useTheme";


export default function CalendarPage() {
    const { isDark } = useTheme();

    return (
        <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
            <div className="mb-6">
                <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    Crew Shift Calendar
                </h1>
                <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    View and manage crew shifts and schedules
                </p>
            </div>
            <CalendarDashboard isDark={isDark} />
        </div>
    );
}