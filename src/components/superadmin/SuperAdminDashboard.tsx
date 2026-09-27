'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import {
  AlertTriangle,
  Building2,
  Clock3,
  HardDrive,
  Mail,
  PlaneTakeoff,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import CompaniesTable from './CompaniesTable';
import CompanyMiniList, { type CompanyMiniItem } from './CompanyMiniList';
import FlightRequestsByCompanyTable from './FlightRequestsByCompanyTable';
import { fmtBytes, fmtCompact, fmtDate, fmtDayLabel, fmtRelativeTime } from './format';
import HorizontalProgressList from './HorizontalProgressList';
import RankedBarChart from './RankedBarChart';
import StatCard from './StatCard';
import TrendAreaChart from './TrendAreaChart';
import type { SuperAdminOverview } from './types';
import UsageProgressList from './UsageProgressList';

interface Props {
  initialData: SuperAdminOverview | null;
}

function TokenProgressBar({ percent }: { percent: number }) {
  const color = percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-violet-500';
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}

export default function SuperAdminDashboard({ initialData }: Props) {
  const [data, setData] = useState<SuperAdminOverview | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(false);
    try {
      const res = await axios.get('/api/superadmin/overview');
      if (res.data?.code === 1) {
        setData(res.data.data);
        setLastUpdated(new Date().toISOString());
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) load(false);
  }, [initialData, load]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto mt-16">
          <CardContent className="flex flex-col items-center text-center gap-3 pt-6">
            <AlertTriangle className="text-amber-500" size={28} />
            <p className="text-sm text-muted-foreground">Couldn&apos;t load platform data.</p>
            <Button size="sm" onClick={() => load(false)}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { companies, users, fleet, operations, aiUsage, storage, emailUsage, growth } = data;

  const usersByRoleData = users.byRole.map((r) => ({ name: r.role, value: r.count }));
  const flightStatusData = operations.flightRequestsByStatus.map((r) => ({ name: r.status, value: r.count }));
  const flightStatusColumns = operations.flightRequestsByStatus.map((r) => r.status);
  const topCompaniesUsageData = aiUsage.byCompanyToday.map((c) => ({ name: c.owner_name, value: c.tokens }));
  const storageByCompanyData = storage.byCompany.map((c) => ({ name: c.owner_name, value: c.bytes }));
  const emailUsageItems = emailUsage.byCompany.map((c) => ({
    id: c.owner_id,
    name: c.owner_name,
    used: c.used,
    limit: c.limit,
    percent: c.percent,
  }));

  const fleetUtilization = fleet.totalDrones > 0 ? Math.round((fleet.activeDrones / fleet.totalDrones) * 100) : 0;
  const activeUserRate = users.total > 0 ? Math.round((users.active / users.total) * 100) : 0;
  const maintenanceClosureRate = operations.totalMaintenanceTickets > 0
    ? Math.round(((operations.totalMaintenanceTickets - operations.openMaintenanceTickets) / operations.totalMaintenanceTickets) * 100)
    : 0;

  const newestCompanies: CompanyMiniItem[] = companies.list.slice(0, 5).map((c) => ({
    owner_id: c.owner_id,
    owner_name: c.owner_name,
    owner_code: c.owner_code,
    owner_active: c.owner_active,
    metric: fmtDate(c.created_at),
  }));
  const mostUsersCompanies: CompanyMiniItem[] = [...companies.list]
    .sort((a, b) => b.user_count - a.user_count)
    .slice(0, 5)
    .map((c) => ({
      owner_id: c.owner_id,
      owner_name: c.owner_name,
      owner_code: c.owner_code,
      owner_active: c.owner_active,
      metric: `${fmtCompact(c.user_count)} users`,
    }));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header — mirrors the main dashboard's accent-bar + eyebrow pattern */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-1 h-9 rounded-full bg-violet-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-0.5 text-muted-foreground">
              Platform overview
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Superadmin Dashboard
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Updated {fmtRelativeTime(lastUpdated)}
          </span>
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? <Spinner className="size-4" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Companies"
          value={fmtCompact(companies.total)}
          sublabel={`${companies.active} active · ${companies.inactive} inactive`}
          icon={Building2}
          tone="indigo"
        />
        <StatCard
          label="Users"
          value={fmtCompact(users.total)}
          sublabel={`${users.active} active across platform`}
          icon={Users}
          tone="emerald"
        />
        <StatCard
          label="AI tokens today"
          value={fmtCompact(aiUsage.today.used)}
          sublabel={`${aiUsage.today.percent}% of daily limit`}
          icon={Sparkles}
          tone="violet"
        />
        <StatCard
          label="Fleet size"
          value={fmtCompact(fleet.totalDrones)}
          sublabel={`${fleet.activeDrones} active drones`}
          icon={PlaneTakeoff}
          tone="cyan"
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform timeline</CardTitle>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Total companies</p>
                    <p className="text-sm font-semibold text-foreground">{fmtCompact(companies.total)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">New this month</p>
                    <p className="text-sm font-semibold text-foreground">{fmtCompact(companies.newThisMonth)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Active</p>
                    <p className="text-sm font-semibold text-foreground">{fmtCompact(companies.active)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Inactive</p>
                    <p className="text-sm font-semibold text-foreground">{fmtCompact(companies.inactive)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TrendAreaChart data={growth.companies} xKey="month" yKey="total" label="Companies" color="#8b5cf6" height={180} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlaneTakeoff size={16} className="text-violet-500" />
                  Requests by status
                </CardTitle>
                <CardDescription>All-time DCC request pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalProgressList
                  items={flightStatusData.slice(0, 6).map((s) => ({ id: s.name, label: s.name, value: s.value }))}
                  emptyLabel="No flight requests yet"
                  color="#8b5cf6"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={16} className="text-violet-500" />
                  Users by role
                </CardTitle>
                <CardDescription>Every role with at least one user</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalProgressList
                  items={usersByRoleData.map((r) => ({ id: r.name, label: r.name, value: r.value }))}
                  emptyLabel="No users yet"
                  color="#8b5cf6"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="New companies"
              value={fmtCompact(companies.newThisMonth)}
              sublabel="Onboarded this month"
              icon={Building2}
              tone="indigo"
            />
            <StatCard
              label="Fleet utilization"
              value={`${fleetUtilization}%`}
              sublabel={`${fleet.activeDrones} of ${fleet.totalDrones} drones active`}
              icon={PlaneTakeoff}
              tone="cyan"
            />
            <StatCard
              label="Active user rate"
              value={`${activeUserRate}%`}
              sublabel={`${users.active} of ${users.total} users active`}
              icon={Users}
              tone="emerald"
            />
            <StatCard
              label="Maintenance closure rate"
              value={`${maintenanceClosureRate}%`}
              sublabel={`${operations.totalMaintenanceTickets - operations.openMaintenanceTickets} of ${operations.totalMaintenanceTickets} tickets closed`}
              icon={Wrench}
              tone="amber"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 size={16} className="text-blue-500" />
                Flight requests by company
              </CardTitle>
              <CardDescription>Every company with flight requests, broken down by status</CardDescription>
            </CardHeader>
            <CardContent>
              <FlightRequestsByCompanyTable rows={operations.flightRequestsByCompany} statuses={flightStatusColumns} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-500" />
                  Newest companies
                </CardTitle>
                <CardDescription>Most recently onboarded organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <CompanyMiniList companies={newestCompanies} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={16} className="text-emerald-500" />
                  Companies with the most users
                </CardTitle>
                <CardDescription>Largest teams on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <CompanyMiniList companies={mostUsersCompanies} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Open maintenance tickets"
              value={fmtCompact(operations.openMaintenanceTickets)}
              sublabel={`${operations.totalMaintenanceTickets} total tickets`}
              icon={Wrench}
              tone="amber"
            />
            <StatCard
              label="Flight requests"
              value={fmtCompact(operations.totalFlightRequests)}
              sublabel="All-time, across every company"
              icon={PlaneTakeoff}
              tone="blue"
            />
            <StatCard
              label="Document storage"
              value={fmtBytes(storage.totalBytes)}
              sublabel={`${fmtCompact(storage.totalFiles)} files stored`}
              icon={HardDrive}
              tone="rose"
            />
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-500" />
                  Company growth
                </CardTitle>
                <CardDescription>Cumulative companies onboarded — last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendAreaChart data={growth.companies} xKey="month" yKey="total" label="Companies" color="var(--chart-1)" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" />
                  User growth
                </CardTitle>
                <CardDescription>Cumulative users onboarded — last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendAreaChart data={growth.users} xKey="month" yKey="total" label="Users" color="var(--chart-2)" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 size={16} className="text-cyan-500" />
                Last active — last 14 days
              </CardTitle>
              <CardDescription>
                Users whose most recent login falls on each day. Since only the latest login is stored per
                user, this reads as a last-seen distribution rather than a true repeat-visit count.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendAreaChart
                data={growth.lastActive}
                xKey="date"
                yKey="users"
                label="Users last seen"
                color="var(--chart-3)"
                xFormatter={fmtDayLabel}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-usage" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles size={16} className="text-violet-500" />
                Platform AI usage — last 14 days
              </CardTitle>
              <CardDescription>Groq free-tier tokens consumed across every company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Today&apos;s usage</span>
                  <span className="text-sm font-semibold text-foreground">
                    {fmtCompact(aiUsage.today.used)} / {fmtCompact(aiUsage.today.limit)} tokens
                  </span>
                </div>
                <TokenProgressBar percent={aiUsage.today.percent} />
                {aiUsage.today.percent >= 80 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle size={12} className="text-amber-500" />
                    <span className="text-xs text-amber-500 font-medium">
                      {aiUsage.today.remaining === 0 ? 'Daily limit reached' : `${fmtCompact(aiUsage.today.remaining)} tokens remaining today`}
                    </span>
                  </div>
                )}
              </div>

              <TrendAreaChart data={aiUsage.dailyTrend} xKey="date" yKey="tokens" label="Tokens used" color="var(--chart-1)" xFormatter={fmtDayLabel} />

              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">All-time tokens</p>
                  <p className="text-lg font-semibold text-foreground">{fmtCompact(aiUsage.allTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Companies using AI today</p>
                  <p className="text-lg font-semibold text-foreground">{aiUsage.byCompanyToday.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining today</p>
                  <p className={`text-lg font-semibold ${aiUsage.today.remaining === 0 ? 'text-red-500' : 'text-foreground'}`}>
                    {fmtCompact(aiUsage.today.remaining)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top companies by usage today</CardTitle>
              <CardDescription>Highest AI token consumers in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <RankedBarChart data={topCompaniesUsageData} valueLabel="Tokens" color="var(--chart-1)" emptyLabel="No AI usage recorded today" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              label="Total storage"
              value={fmtBytes(storage.totalBytes)}
              sublabel={`${fmtCompact(storage.totalFiles)} files across all companies`}
              icon={HardDrive}
              tone="rose"
            />
            <StatCard
              label="Companies near email limit"
              value={fmtCompact(emailUsage.companiesNearLimit)}
              sublabel="80%+ of their daily send quota used today"
              icon={Mail}
              tone="orange"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive size={16} className="text-rose-500" />
                  Storage by company
                </CardTitle>
                <CardDescription>Top storage consumers across documents, evaluations & attachments</CardDescription>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={storageByCompanyData}
                  valueLabel="Storage"
                  color="var(--chart-5)"
                  emptyLabel="No files stored yet"
                  formatValue={fmtBytes}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail size={16} className="text-orange-500" />
                  Email usage by company
                </CardTitle>
                <CardDescription>Today&apos;s notification sends against each company&apos;s daily limit</CardDescription>
              </CardHeader>
              <CardContent>
                <UsageProgressList items={emailUsageItems} emptyLabel="No companies with an email limit configured" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" />
                  All companies
                </span>
                <Badge variant="outline">{companies.total} total · {companies.newThisMonth} new this month</Badge>
              </CardTitle>
              <CardDescription>Every organization provisioned on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <CompaniesTable companies={companies.list} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
