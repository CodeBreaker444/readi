'use client';

import DailyBoard from "@/src/components/operation/DailyBoard";
import { useTheme } from "@/src/components/useTheme";

export default function DailyBoardPage() {
    const { isDark } = useTheme();

    return (
        <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
            <div className="mb-6">
                <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    Operation Board
                </h1>
                <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Daily mission board with drag and drop functionality
                </p>
                <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {new Date().toLocaleString()}
                </p>
            </div>
            <DailyBoard isDark={isDark} />
        </div>
    );
}