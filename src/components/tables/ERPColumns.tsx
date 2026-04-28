import { Badge } from '@/components/ui/badge'
import { EmergencyResponsePlan, ErpType } from '@/config/types/erp'
import { createColumnHelper } from '@tanstack/react-table'
import { formatDateInTz } from '@/lib/utils'

const columnHelper = createColumnHelper<EmergencyResponsePlan>()

const TYPE_COLORS: Record<ErpType, string> = {
  GENERAL: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  MEDICAL: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  FIRE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  SECURITY: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ENVIRONMENTAL: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
}

export const getErpColumns = (isDark: boolean, t: (key: string) => string, timezone?: string) => [
  columnHelper.accessor('type', {
    header: t('erp.table.type'),
    cell: (info) => (
      <Badge
        variant="outline"
        className={`text-[10px] font-bold py-0 ${TYPE_COLORS[info.getValue()]}`}
      >
        {t(`erp.types.${info.getValue()}`)}
      </Badge>
    ),
  }),
  columnHelper.accessor('contact', {
    header: t('erp.table.contact'),
    cell: (info) => (
      <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('description', {
    header: t('erp.table.description'),
    cell: (info) => (
      <p className={`text-sm max-w-md truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {info.getValue()}
      </p>
    ),
  }),
  columnHelper.accessor('created_at', {
    header: t('erp.table.createdAt'),
    cell: (info) => {
      const val = info.getValue()
      if (!val) return <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>—</span>
      return (
        <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {formatDateInTz(val, timezone)}
        </span>
      )
    },
  }),
]
