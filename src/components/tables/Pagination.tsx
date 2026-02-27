import { Table } from '@tanstack/react-table';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { FC } from 'react';
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from 'react-icons/md';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useTheme } from '../useTheme';

interface Props {
  table: Table<any>;
}

export const TablePagination: FC<Props> = ({ table }) => {
  const { isDark } = useTheme();

  const textMuted   = isDark ? 'text-slate-500' : 'text-gray-400';
  const textLabel   = isDark ? 'text-slate-400' : 'text-gray-500';

  const btnCls = isDark
    ? 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 disabled:opacity-30'
    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30';

  const selectTriggerCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200'
    : 'bg-gray-50 border-gray-200 text-gray-700';

  const selectContentCls = isDark
    ? 'bg-slate-800 border-slate-700 text-slate-200'
    : 'bg-white border-gray-200 text-gray-700';

  return (
    <div className="my-5 flex flex-col-reverse items-start justify-between gap-2 px-2 md:flex-row md:items-center">

      <div className={`flex w-full flex-row justify-between gap-2 text-sm md:w-fit ${textMuted}`}>
        <span>
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getState().pagination.pageSize} row(s) selected.
        </span>
        <div className={`flex items-center justify-center text-sm font-medium md:hidden ${textMuted}`}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
      </div>

      <div className="flex w-full items-center justify-between space-x-6 md:w-fit lg:space-x-8">

        <div className="flex items-center space-x-2">
          <p className={`text-sm font-medium ${textLabel}`}>Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className={`h-8 w-[72px] text-xs ${selectTriggerCls}`}>
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top" className={selectContentCls}>
              {[8, 16, 24, 32, 48, 56].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={`hidden w-24 items-center justify-center text-sm font-medium md:flex ${textMuted}`}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className={`hidden h-8 w-8 p-0 lg:flex ${btnCls}`}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <MdKeyboardDoubleArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={`h-8 w-8 p-0 ${btnCls}`}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={`h-8 w-8 p-0 ${btnCls}`}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={`hidden h-8 w-8 p-0 lg:flex ${btnCls}`}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <MdKeyboardDoubleArrowRight className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </div>
  );
};