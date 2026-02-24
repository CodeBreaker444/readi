'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  HiChevronDown,
  HiChevronRight,
  HiOutlineBell,
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineDocumentText,
  HiOutlineHome,
} from 'react-icons/hi';
import { Permission, Role, roleHasPermission, ROUTE_PERMISSIONS } from '../lib/auth/roles';

interface SubNavItem {
  name: string;
  href: string;
  subItems?: SubNavItem[];
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  subItems?: SubNavItem[];
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HiOutlineHome,
    subItems: [
      { name: 'Analytics', href: '/dashboard' },
      { name: 'SHI Index & KPIs', href: '/dashboard/safety-health' }
    ]
  },
  {
    name: 'CO-00 – Planning',
    href: '/planning/new-evaluation',
    icon: HiOutlineChartBar,
    subItems: [
      { name: 'P00 – New Evaluation Request', href: '/planning/new-evaluation' },
      { name: 'P01 – Evaluation', href: '/planning/evaluation' },
      { name: 'P02 – Planning Mission', href: '/planning/planning-mission' },
      // { name: 'P03 – Test Mission', href: '/planning/test-mission' },
      { name: 'P04 – Mission Templates', href: '/planning/mission-template' }
    ]
  },
  {
    name: 'Operations',
    href: '/operations/table',
    icon: HiOutlineCog,
    subItems: [
      { name: 'Operations Table', href: '/operations/table' },
      { name: 'Daily Board', href: '/operations/daily-board' },
      { name: 'Calendar', href: '/operations/calendar' }
    ]
  },
  {
    name: 'Logbooks',
    href: '/logbooks/operation-requests',
    icon: HiOutlineBookOpen,
    subItems: [
       // { name: 'Operation Request Logbook', href: '/logbooks/operation-requests' },
      { name: 'Planned Mission Logbook', href: '/logbooks/mission-planning-logbook' },
      { name: 'Flight Logbook', href: '/logbooks/operation-logbook' },
      // { name: 'Battery Logbook', href: '/logbooks/battery' },
      // { name: 'Maintenance Logbook', href: '/logbooks/maintenance' }
    ]
  },
  {
    name: 'Safety Management',
    href: '/safety/spi-kpi-definitions',
    icon: HiOutlineBell,
    subItems: [
      { name: 'SPI & KPI Definitions', href: '/safety/spi-kpi-definitions' },
       // { name: 'Document Repository', href: '/safety/documents' }
    ]
  },
    // {
  //   name: 'Emergency Contact List',
  //   href: '/emergency',
  //   icon: Users
  // },
  { name: 'Notifications', href: '/notifications', icon: HiOutlineBell },
  { name: 'Document Repository', href: '/document-repository', icon: HiOutlineDocumentText }
];

const configurationItems: SubNavItem[] = [
  {
    name: 'Organization',
    href: '/organization/chart',
    subItems: [
       { name: 'Chart', href: '/organization/chart' },
      // { name: 'Board', href: '/organization/board' },
      { name: 'LUC Procedures', href: '/organization/luc-procedures' },
      { name: 'Checklist', href: '/organization/checklist' },
      { name: 'Assignments', href: '/organization/assignments' },
      { name: 'Communication', href: '/organization/communication' },
      // { name: 'LUC Documents', href: '/organization/luc-docs' }
    ]
  },
  {
    name: 'Mission',
    href: '/mission/type',
    subItems: [
      { name: 'Mission Type', href: '/mission/type' },
      { name: 'Mission Category', href: '/mission/category' },
      { name: 'Mission Status', href: '/mission/status' },
      { name: 'Mission Result', href: '/mission/result' }
    ]
  },
  {
    name: 'Systems',
    href: '/systems/manage',
    subItems: [
      { name: 'Manage Systems', href: '/systems/manage' },
      { name: 'Map', href: '/systems/map' },
      { name: 'Maintenance Dashboard', href: '/systems/maintenance-dashboard' },
      { name: 'Maintenance Tickets', href: '/systems/maintenance-tickets' }
    ]
  },
  {
    name: 'Team',
    href: '/team/personnel',
    subItems: [
      { name: 'Personnel', href: '/team/personnel' },
      { name: 'Crew Shift', href: '/team/crew-shift' }
    ]
  },
  {
    name: 'Company',
    href: '/company',
    subItems: [{ name: 'Company List', href: '/company' }]
  }
];

interface SidebarProps {
  isDark: boolean;
  role: Role | null;
}

const Sidebar: React.FC<SidebarProps> = ({ isDark, role }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState('/dashboard');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    setActiveItem(pathname);
  }, [pathname]);

  const getRequiredPermissionForRoute = (href: string): Permission | null => {
    return ROUTE_PERMISSIONS[href] ?? null;
  };

  const filteredNavigationItems = navigationItems
    .map((item) => {
      const visibleSubItems =
        item.subItems?.filter((sub) => {
          const perm = getRequiredPermissionForRoute(sub.href);
          if (!perm) return true;
          return roleHasPermission(role, perm);
        }) ?? [];

      const ownPerm = getRequiredPermissionForRoute(item.href);
      const canSeeOwn = ownPerm ? roleHasPermission(role, ownPerm) : false;
      const hasVisibleSub = visibleSubItems.length > 0;

      if (!canSeeOwn && !hasVisibleSub) return null;
      return { ...item, subItems: visibleSubItems };
    })
    .filter(Boolean) as typeof navigationItems;

  const filteredConfigurationItems = configurationItems
    .map((configItem) => {
      if (configItem.name === 'Superadmin') {
        if (!roleHasPermission(role, 'manage_users')) return null;
      }

      const visibleSubItems =
        configItem.subItems?.filter((sub) => {
          const perm = getRequiredPermissionForRoute(sub.href);
          if (!perm) return true;
          return roleHasPermission(role, perm);
        }) ?? [];

      const ownPerm = getRequiredPermissionForRoute(configItem.href);
      const canSeeOwn = ownPerm ? roleHasPermission(role, ownPerm) : false;
      const hasVisibleSub = visibleSubItems.length > 0;

      if (!canSeeOwn && !hasVisibleSub) return null;
      return { ...configItem, subItems: visibleSubItems };
    })
    .filter(Boolean) as typeof configurationItems;

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  };

  const handleNavigation = (href: string, hasSubItems?: boolean) => {
    if (hasSubItems) {
      toggleExpand(href);
    } else {
      setActiveItem(href);
      router.push(href);
    }
  };

  const getItemClass = (href: string, isActive: boolean) => {
    const isHovered = hoveredItem === href;

    if (isActive) {
      return isDark
        ? 'bg-amber-500/15 text-amber-400 border-l-2 border-amber-400'
        : 'bg-amber-50 text-amber-700 border-l-2 border-amber-500';
    }
    if (isHovered) {
      return isDark
        ? 'bg-slate-800/70 text-amber-400 border-l-2 border-amber-500/40'
        : 'bg-amber-50/70 text-amber-600 border-l-2 border-amber-300';
    }
    return isDark
      ? 'text-slate-400 border-l-2 border-transparent'
      : 'text-slate-500 border-l-2 border-transparent';
  };

  const getIconClass = (href: string, isActive: boolean) => {
    const isHovered = hoveredItem === href;
    if (isActive) return isDark ? 'text-amber-400' : 'text-amber-600';
    if (isHovered) return isDark ? 'text-amber-400' : 'text-amber-500';
    return isDark ? 'text-slate-500' : 'text-slate-400';
  };

  const renderSubItems = (subItems: SubNavItem[], level: number = 1) => {
    const indent = level === 1 ? 'pl-9' : 'pl-12';

    return (
      <div className="mt-0.5 space-y-0.5">
        {subItems.map((subItem) => {
          const isExpanded = expandedItems.includes(subItem.href);
          const isActive = activeItem === subItem.href;
          const isHovered = hoveredItem === subItem.href;

          return (
            <div key={subItem.href}>
              <a
                href={subItem.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation(subItem.href, !!subItem.subItems);
                }}
                onMouseEnter={() => setHoveredItem(subItem.href)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  flex items-center justify-between py-1.5 pr-3 rounded-r-md
                  transition-all duration-150 cursor-pointer
                  ${indent}
                  ${getItemClass(subItem.href, isActive)}
                `}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.02em',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                <span className="flex items-center gap-1.5">
                  {level > 1 && (
                    <span
                      className="text-[0.45rem] transition-colors duration-150"
                      style={{
                        color: isActive
                          ? isDark ? '#fbbf24' : '#d97706'
                          : isHovered
                          ? '#f59e0b'
                          : isDark ? '#475569' : '#cbd5e1',
                      }}
                    >
                      ●
                    </span>
                  )}
                  {subItem.name}
                </span>
                {subItem.subItems && (
                  isExpanded
                    ? <HiChevronDown size={13} className="shrink-0 opacity-60" />
                    : <HiChevronRight size={13} className="shrink-0 opacity-60" />
                )}
              </a>
              {subItem.subItems && isExpanded && renderSubItems(subItem.subItems, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside
      className={`
        flex flex-col w-60 h-screen overflow-hidden shrink-0
        ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200'}
      `}
    >
      <div className={`px-5 py-5 shrink-0 ${isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center">
            <img
              src="/logo-sm.png"
              alt="ReADI Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p
              className={`font-bold leading-none tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
              style={{ fontSize: '0.9rem', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              ReADI
            </p>
            <p
              className={`leading-none mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              Drone Control
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 sidebar-scroll">

        {filteredNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.href;
          const isExpanded = expandedItems.includes(item.href);
          const hasSubItems = !!item.subItems && item.subItems.length > 0;

          return (
            <div key={item.href}>
              <a
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation(item.href, hasSubItems);
                }}
                onMouseEnter={() => setHoveredItem(item.href)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-r-md
                  transition-all duration-150 cursor-pointer
                  ${getItemClass(item.href, isActive)}
                `}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    size={17}
                    className={`shrink-0 transition-colors duration-150 ${getIconClass(item.href, isActive)}`}
                  />
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 600 : 500,
                      letterSpacing: '0.01em',
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                    }}
                  >
                    {item.name}
                  </span>
                </span>
                {hasSubItems && (
                  isExpanded
                    ? <HiChevronDown size={14} className="shrink-0 opacity-50" />
                    : <HiChevronRight size={14} className="shrink-0 opacity-40" />
                )}
              </a>
              {hasSubItems && isExpanded && renderSubItems(item.subItems!)}
            </div>
          );
        })}

        {filteredConfigurationItems.length > 0 && (
          <div className="pt-4">
            <p
              className={`px-3 pb-1.5 uppercase ${isDark ? 'text-slate-600' : 'text-slate-400'}`}
              style={{ fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 600 }}
            >
              Configuration
            </p>
            <div className="space-y-0.5">
              {filteredConfigurationItems.map((configItem) => {
                const isExpanded = expandedItems.includes(configItem.href);
                const isActive = activeItem === configItem.href;

                return (
                  <div key={configItem.href}>
                    <a
                      href={configItem.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigation(configItem.href, !!configItem.subItems);
                      }}
                      onMouseEnter={() => setHoveredItem(configItem.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`
                        flex items-center justify-between px-3 py-1.5 rounded-r-md
                        transition-all duration-150 cursor-pointer
                        ${getItemClass(configItem.href, isActive)}
                      `}
                      style={{
                        fontSize: '0.73rem',
                        fontWeight: isActive ? 600 : 500,
                        letterSpacing: '0.01em',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}
                    >
                      {configItem.name}
                      {configItem.subItems && (
                        isExpanded
                          ? <HiChevronDown size={13} className="shrink-0 opacity-50" />
                          : <HiChevronRight size={13} className="shrink-0 opacity-40" />
                      )}
                    </a>
                    {configItem.subItems && isExpanded && renderSubItems(configItem.subItems, 2)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: ${isDark ? '#334155' : '#e2e8f0'};
          border-radius: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? '#f59e0b66' : '#f59e0b88'};
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;