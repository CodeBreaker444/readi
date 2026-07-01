import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { flexRender, type Table as ReactTable } from '@tanstack/react-table';
import { Eye, EyeOff, Loader2, Search } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Organization, UserWithAccess } from '../tables/ConfigColumns';

export interface DeleteAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDark: boolean;
}
 
export interface OrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: OrgForm) => Promise<void>;
  isDark: boolean;
}
 
export interface OrgForm {
  name: string;
  orgId: string;
  apiToken: string;
}
 
export interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: UserWithAccess | null;
  organizations: Organization[];
  onGrant: (userId: string, organizationId: string) => Promise<void>;
  onRevoke: (userId: string, organizationId: string) => Promise<void>;
  isDark: boolean;
}
 
export interface DataTableProps<TData> {
  table: ReactTable<TData>;
  loading: boolean;
  colSpan: number;
  emptyIcon: ReactNode;
  emptyText: string;
  isDark: boolean;
}
 
export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isDark: boolean;
}
    
export function DeleteAlertDialog({ open, onOpenChange, onConfirm, isDark }: DeleteAlertDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}>
        <AlertDialogHeader>
          <AlertDialogTitle className={isDark ? 'text-white' : 'text-slate-900'}>
            {t('flytbase.c2Config.organizations.deleteTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            {t('flytbase.c2Config.organizations.deleteConfirm')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            {t('flytbase.c2Config.organizations.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


export function OrgDialog({ open, onOpenChange, onSubmit, isDark }: OrgDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', orgId: '', apiToken: '' });
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const inputClass = isDark
    ? 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-violet-500/40 focus-visible:border-violet-500'
    : 'bg-white border-slate-200 text-slate-900 focus-visible:ring-violet-500/30 focus-visible:border-violet-500';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm({ name: '', orgId: '', apiToken: '' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) setForm({ name: '', orgId: '', apiToken: '' });
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('flytbase.c2Config.organizations.add')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="orgName" className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t('flytbase.c2Config.organizations.name')}
            </Label>
            <Input
              id="orgName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('flytbase.c2Config.organizations.namePlaceholder')}
              className={`h-9 text-sm ${inputClass}`}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="orgId" className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t('flytbase.c2Config.organizations.orgId')}
            </Label>
            <Input
              id="orgId"
              value={form.orgId}
              onChange={(e) => setForm({ ...form, orgId: e.target.value.trim() })}
              placeholder={t('flytbase.c2Config.organizations.orgIdPlaceholder')}
              className={`h-9 text-sm font-mono ${inputClass}`}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apiToken" className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t('flytbase.c2Config.organizations.apiToken')}
            </Label>
            <div className="relative">
              <Input
                id="apiToken"
                type={showToken ? 'text' : 'password'}
                value={form.apiToken}
                onChange={(e) => setForm({ ...form, apiToken: e.target.value.trim() })}
                placeholder={t('flytbase.c2Config.organizations.apiTokenPlaceholder')}
                className={`h-9 pr-10 text-sm font-mono ${inputClass}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className={isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {t('flytbase.c2Config.organizations.verifying')}
                </>
              ) : (
                t('flytbase.c2Config.organizations.create')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog({
  open,
  onOpenChange,
  selectedUser,
  organizations,
  onGrant,
  onRevoke,
  isDark,
}: EditUserDialogProps) {
  const { t } = useTranslation();

  const rowClass = isDark
    ? 'bg-slate-800 border border-slate-700'
    : 'bg-slate-50 border border-slate-200';

  const labelClass = `text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  const OrgAvatar = ({ name, assigned }: { name: string; assigned: boolean }) => (
    <div
      className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
        assigned
          ? isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600'
          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
      }`}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );

  const availableOrgs = organizations.filter(
    (org) => !selectedUser?.organizations.some((u) => u.id === org.id)
  );

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('flytbase.c2Config.permissions.modal.title')}
          </DialogTitle>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('flytbase.c2Config.permissions.modal.subtitle', { name: selectedUser?.fullname })}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div>
            <p className={labelClass}>{t('flytbase.c2Config.permissions.modal.availableOrgs')}</p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {availableOrgs.map((org) => (
                <div key={org.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${rowClass}`}>
                  <div className="flex items-center gap-2">
                    <OrgAvatar name={org.name} assigned={false} />
                    <span className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{org.name}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => selectedUser && onGrant(selectedUser.id, org.id)}
                    className="h-6 px-2.5 text-xs bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    {t('flytbase.c2Config.permissions.modal.assign')}
                  </Button>
                </div>
              ))}
              {availableOrgs.length === 0 && (
                <p className={`text-xs italic py-2 px-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  {t('flytbase.c2Config.organizations.noOrgs')}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className={labelClass}>{t('flytbase.c2Config.permissions.modal.assignedOrgs')}</p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {selectedUser?.organizations.map((org) => (
                <div key={org.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${rowClass}`}>
                  <div className="flex items-center gap-2">
                    <OrgAvatar name={org.name} assigned={true} />
                    <span className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{org.name}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => selectedUser && onRevoke(selectedUser.id, org.id)}
                    className={`h-6 px-2.5 text-xs ${
                      isDark
                        ? 'border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10'
                        : 'text-slate-500 hover:text-red-500 hover:border-red-300 hover:bg-red-50'
                    }`}
                  >
                    {t('flytbase.c2Config.permissions.modal.unassign')}
                  </Button>
                </div>
              ))}
              {selectedUser?.organizations.length === 0 && (
                <p className={`text-xs italic py-2 px-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  {t('flytbase.c2Config.permissions.noAssignedOrgs')}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClose}
              className={isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            >
              {t('flytbase.c2Config.permissions.modal.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export  function DataTable({ table, loading, colSpan, emptyIcon, emptyText, isDark }: DataTableProps<any>) {
  const tableWrap = isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200 shadow-sm';
  const theadClass = isDark ? 'bg-slate-800/60' : 'bg-slate-50';
  const theadTextClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50/80';
  const rowBorder = isDark ? 'border-slate-800' : 'border-slate-100';
  const skeletonClass = isDark ? 'bg-slate-800' : 'bg-slate-100';

  return (
    <div className={`rounded-xl overflow-hidden ${tableWrap}`}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className={`${rowBorder} border-b`}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={`${theadClass} ${theadTextClass} text-xs uppercase tracking-wide font-medium py-3 first:pl-4`}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {loading ? (
            [...Array(5)].map((_, i) => (
              <TableRow key={i} className={`${rowBorder} border-b`}>
                {[...Array(colSpan)].map((_, j) => (
                  <TableCell key={j} className="py-3 first:pl-4">
                    <Skeleton className={`h-5 rounded-md ${skeletonClass}`} style={{ width: `${60 + (j * 15) % 30}%` }} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan}>
                <div className={`flex flex-col items-center justify-center py-16 gap-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                  {emptyIcon}
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{emptyText}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={`${rowBorder} border-b last:border-0 transition-colors ${rowHover}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3 first:pl-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder, isDark }: SearchBarProps) {
  const inputClass = isDark
    ? 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-violet-500/40 focus-visible:border-violet-500'
    : 'bg-white border-slate-200 text-slate-900 focus-visible:ring-violet-500/30 focus-visible:border-violet-500';

  return (
    <div className="relative">
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`pl-8 h-8 text-sm rounded-lg ${inputClass}`}
      />
    </div>
  );
}