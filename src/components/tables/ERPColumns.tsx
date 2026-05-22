import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmergencyResponsePlan, ErpType } from '@/config/types/erp'
import { createColumnHelper } from '@tanstack/react-table'
import { formatDateInTz } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'

const columnHelper = createColumnHelper<EmergencyResponsePlan>()

const TYPE_COLORS: Record<ErpType, string> = {
  GENERAL: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  MEDICAL: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  FIRE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  SECURITY: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ENVIRONMENTAL: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
}

interface ErpColumnActions {
  onEdit: (row: EmergencyResponsePlan) => void
  onDelete: (row: EmergencyResponsePlan) => void
}

export const getErpColumns = (
  isDark: boolean,
  t: (key: string) => string,
  timezone?: string,
  actions?: ErpColumnActions,
) => [
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
  columnHelper.display({
    id: 'actions',
    header: () => <span className="text-xs font-semibold text-slate-400">{t('erp.table.actions')}</span>,
    cell: (info) => {
      const row = info.row.original
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={t('common.edit')}
            onClick={() => actions?.onEdit(row)}
            className={`h-7 w-7 ${isDark ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={t('common.delete')}
            onClick={() => actions?.onDelete(row)}
            className={`h-7 w-7 ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    },
  }),
]
