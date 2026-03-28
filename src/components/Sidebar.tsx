'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { GrSystem } from "react-icons/gr";
import {
  HiChevronDown,
  HiChevronRight,
  HiOutlineBell,
  HiOutlineBookOpen,
  HiOutlineBriefcase,
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlinePaperAirplane,
  HiOutlineTemplate,
  HiOutlineUsers
} from 'react-icons/hi';
import { TbLayoutSidebarFilled } from "react-icons/tb";
import { Permission, Role, roleHasPermission, ROUTE_PERMISSIONS, RoutePermissionEntry } from '../lib/auth/roles';

interface SubNavItem {
  name: string;
  href: string;
  icon?: React.ElementType;
  subItems?: SubNavItem[];
  soon?: boolean;
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
      { name: 'P02 – Planning Dashboard', href: '/planning/planning-dashboard' },
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
    href: '/logbooks/mission-planning-logbook',
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
  {
    name: 'FlytBase',
    href: '/flytbase',
    icon: HiOutlinePaperAirplane,
    subItems: [
      { name: 'Settings', href: '/flytbase' },
      { name: 'Recent Flights', href: '/flytbase/flights' },
    ],
  },
  { name: 'Notifications', href: '/notifications', icon: HiOutlineBell },
  { name: 'Document Repository', href: '/document-repository', icon: HiOutlineDocumentText },
  { name: 'Audit Logs', href: '/audit-logs', icon: HiOutlineClipboardList },
];

const configurationItems: SubNavItem[] = [
  {
    name: 'Organization',
    href: '/organization/chart',
    icon: HiOutlineOfficeBuilding,
    subItems: [
      { name: 'Chart', href: '/organization/chart' },
      // { name: 'Board', href: '/organization/board' },
      { name: 'Procedures', href: '/organization/luc-procedures' },
      // { name: 'LUC Documents', href: '/organization/luc-docs' }
      { name: 'Checklist', href: '/organization/checklist' },
      { name: 'Assignments', href: '/organization/assignments' },
      { name: 'Communication', href: '/organization/communication' },
    ],
  },
  {
    name: 'Mission',
    href: '/mission/type',
    icon: HiOutlineTemplate,
    subItems: [
      { name: 'Mission Type', href: '/mission/type' },
      { name: 'Mission Category', href: '/mission/category' },
      { name: 'Mission Status', href: '/mission/status' },
      { name: 'Mission Result', href: '/mission/result' },
    ],
  },
  {
    name: 'Systems',
    href: '/systems/manage',
    icon: GrSystem,
    subItems: [
      { name: 'Manage Systems', href: '/systems/manage' },
      { name: 'Map', href: '/systems/map' },
      { name: 'Maintenance Dashboard', href: '/systems/maintenance-dashboard' },
      { name: 'Maintenance Tickets', href: '/systems/maintenance-tickets' },
    ],
  },
  {
    name: 'Team',
    href: '/team/personnel',
    icon: HiOutlineUsers,
    subItems: [
      { name: 'Personnel', href: '/team/personnel' },
      { name: 'Crew Shift', href: '/team/crew-shift' },
      { name: 'Client', href: '/team/client' },
    ],
  },
  {
    name: 'Company',
    href: '/company',
    icon: HiOutlineBriefcase,
    subItems: [{ name: 'Company Directory', href: '/company' }],
  },
];

interface SidebarProps {
  isDark: boolean;
  role: Role | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isDark, role, isCollapsed, onToggleCollapse }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState('/dashboard');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipItem, setTooltipItem] = useState<string | null>(null);

  useEffect(() => {
    setActiveItem(pathname);
  }, [pathname]);

  useEffect(() => {
    if (isCollapsed) {
      setExpandedItems([]);
    }
  }, [isCollapsed]);

  const getRequiredPermissionForRoute = (href: string): RoutePermissionEntry | null => {
    return ROUTE_PERMISSIONS[href] ?? null;
  };

  const canAccessWithRole = (entry: RoutePermissionEntry | null): boolean => {
    if (!entry) return true;
    const perms: Permission[] = Array.isArray(entry) ? entry : [entry];
    return perms.some((p) => roleHasPermission(role, p));
  };

  const isRouteActive = (href: string, subItems?: SubNavItem[]): boolean => {
    if (activeItem === href) return true;
    if (subItems) {
      return subItems.some(
        (sub) => activeItem === sub.href || (sub.subItems && isRouteActive(sub.href, sub.subItems))
      );
    }
    return false;
  };

  const filteredNavigationItems = navigationItems
    .map((item) => {
      const visibleSubItems =
        item.subItems?.filter((sub) => {
          const perm = getRequiredPermissionForRoute(sub.href);
          return canAccessWithRole(perm);
        }) ?? [];

      const ownPerm = getRequiredPermissionForRoute(item.href);
      const canSeeOwn = canAccessWithRole(ownPerm);
      const hasVisibleSub = visibleSubItems.length > 0;

      if (!canSeeOwn && !hasVisibleSub) return null;
      return { ...item, subItems: visibleSubItems };
    })
    .filter(Boolean) as typeof navigationItems;

  const filteredConfigurationItems = configurationItems
    .map((configItem) => {
      if (configItem.name === 'Company' && role !== 'SUPERADMIN') {
        return null;
      }

      const visibleSubItems =
        configItem.subItems?.filter((sub) => {
          const perm = getRequiredPermissionForRoute(sub.href);
          return canAccessWithRole(perm);
        }) ?? [];

      const ownPerm = getRequiredPermissionForRoute(configItem.href);
      const canSeeOwn = canAccessWithRole(ownPerm);
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
    if (isCollapsed) {
      if (hasSubItems) {
        const navItem = [...filteredNavigationItems, ...filteredConfigurationItems].find(
          (item) => item.href === href
        );
        if (navItem?.subItems?.[0]) {
          setActiveItem(navItem.subItems[0].href);
          router.push(navItem.subItems[0].href);
        }
      } else {
        setActiveItem(href);
        router.push(href);
      }
      return;
    }

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
        ? 'bg-violet-600/20 text-violet-400 border-l-2 border-violet-500'
        : 'bg-violet-600 text-white border-l-2 border-violet-800';
    }
    if (isHovered) {
      return isDark
        ? 'bg-slate-800/70 text-violet-400 border-l-2 border-violet-500/40'
        : 'bg-violet-500/10 text-violet-700 border-l-2 border-violet-300';
    }
    return isDark
      ? 'text-slate-400 border-l-2 border-transparent'
      : 'text-slate-500 border-l-2 border-transparent';
  };

  const getCollapsedItemClass = (href: string, isActive: boolean) => {
    const isHovered = hoveredItem === href;

    if (isActive) {
      return isDark
        ? 'bg-violet-600/20 text-violet-400'
        : 'bg-violet-600 text-white';
    }
    if (isHovered) {
      return isDark
        ? 'bg-slate-800/70 text-violet-400'
        : 'bg-violet-500/10 text-violet-700';
    }
    return isDark ? 'text-slate-400' : 'text-slate-500';
  };

  const getIconClass = (href: string, isActive: boolean) => {
    const isHovered = hoveredItem === href;
    if (isActive) return isDark ? 'text-violet-400' : 'text-white';
    if (isHovered) return isDark ? 'text-violet-400' : 'text-violet-600';
    return isDark ? 'text-slate-500' : 'text-slate-400';
  };

  const renderSubItems = (subItems: SubNavItem[], level: number = 1) => {
    if (isCollapsed) return null;
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
                          ? isDark
                            ? '#a78bfa'
                            : '#ffffff'
                          : isHovered
                            ? '#8b5cf6'
                            : isDark
                              ? '#475569'
                              : '#cbd5e1',
                      }}
                    >
                      ●
                    </span>
                  )}
                  {subItem.name}
                </span>
                {subItem.subItems &&
                  (isExpanded ? (
                    <HiChevronDown size={13} className="shrink-0 opacity-60" />
                  ) : (
                    <HiChevronRight size={13} className="shrink-0 opacity-60" />
                  ))}
              </a>
              {subItem.subItems && isExpanded && renderSubItems(subItem.subItems, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCollapsedIcon = (
    icon: React.ElementType,
    href: string,
    name: string,
    subItems?: SubNavItem[]
  ) => {
    const Icon = icon;
    const isActive = isRouteActive(href, subItems);
    return (
      <div
        key={href}
        className="relative flex justify-center"
        onMouseEnter={() => {
          setHoveredItem(href);
          setTooltipItem(href);
        }}
        onMouseLeave={() => {
          setHoveredItem(null);
          setTooltipItem(null);
        }}
      >
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            handleNavigation(href, !!subItems && subItems.length > 0);
          }}
          className={`
            flex items-center justify-center w-9 h-9 rounded-lg
            transition-all duration-150 cursor-pointer
            ${getCollapsedItemClass(href, isActive)}
          `}
        >
          <Icon size={18} className={`shrink-0 transition-colors duration-150`} />
        </a>
        {tooltipItem === href && (
          <div
            className={`
              absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
              px-2.5 py-1.5 rounded-md whitespace-nowrap pointer-events-none
              ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-white'}
            `}
            style={{
              fontSize: '0.72rem',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {name}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`
        flex flex-col h-screen overflow-hidden shrink-0
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'}
        ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200'}
      `}
    >
      <div
        className={`shrink-0 ${isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'} ${isCollapsed ? 'px-2 py-5' : 'px-5 py-5'
          }`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center ${isCollapsed ? '' : 'gap-2.5'}`}>
            <div className="w-8 h-8 rounded-xl overflow-hidden text-white flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
              <img src="/logo-sm.png" alt="ReADI Logo" className="w-full h-full object-contain brightness-0 invert" />
            </div>
            {!isCollapsed && (
              <div>
                <p
                  className={`font-bold leading-none tracking-tight ${isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  style={{ fontSize: '0.9rem', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  ReADI
                </p>
                <p
                  className={`leading-none mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                  style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  Drone Control
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className={`cursor-pointer
                p-1 rounded-md transition-all duration-150
                ${isDark
                  ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                }
              `}
              title="Collapse sidebar"
            >
              <TbLayoutSidebarFilled size={20} />
            </button>
          )}
        </div>
      </div>

      {isCollapsed && (
        <div className="flex justify-center pt-2 pb-1">
          <button
            onClick={onToggleCollapse}
            className={`cursor-pointer
              p-1 rounded-md transition-all duration-150
              ${isDark
                ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              }
            `}
            title="Expand sidebar"
          >
            <TbLayoutSidebarFilled size={20} />
          </button>
        </div>
      )}

      <nav
        className={`flex-1 overflow-y-auto py-3 sidebar-scroll ${isCollapsed ? 'px-1.5 space-y-1' : 'px-3 space-y-0.5'
          }`}
      >
        {isCollapsed ? (
          <>
            {filteredNavigationItems.map((item) =>
              renderCollapsedIcon(item.icon, item.href, item.name, item.subItems)
            )}

            {filteredConfigurationItems.length > 0 && (
              <>
                <div
                  className={`my-2 mx-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                />
                {filteredConfigurationItems.map((configItem) =>
                  renderCollapsedIcon(
                    configItem.icon || HiOutlineCog,
                    configItem.href,
                    configItem.name,
                    configItem.subItems
                  )
                )}
              </>
            )}
          </>
        ) : (
          <>
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
                        className={`shrink-0 transition-colors duration-150 ${getIconClass(
                          item.href,
                          isActive
                        )}`}
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
                    {hasSubItems &&
                      (isExpanded ? (
                        <HiChevronDown size={14} className="shrink-0 opacity-50" />
                      ) : (
                        <HiChevronRight size={14} className="shrink-0 opacity-40" />
                      ))}
                  </a>
                  {hasSubItems && isExpanded && renderSubItems(item.subItems!)}
                </div>
              );
            })}

            {filteredConfigurationItems.length > 0 && (
              <div className="pt-4">
                <p
                  className={`px-3 pb-1.5 uppercase ${isDark ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  style={{ fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 600 }}
                >
                  Configuration
                </p>
                <div className="space-y-0.5">
                  {filteredConfigurationItems.map((configItem) => {
                    const isExpanded = expandedItems.includes(configItem.href);
                    const isActive = activeItem === configItem.href;
                    const isParentActive = isRouteActive(configItem.href, configItem.subItems);
                    const ConfigIcon = configItem.icon || HiOutlineCog;

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
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                          }}
                        >
                          <span className="flex items-center gap-2.5">
                            <ConfigIcon
                              size={16}
                              className={`shrink-0 transition-colors duration-150 ${getIconClass(
                                configItem.href,
                                isActive || isParentActive
                              )}`}
                            />
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: isActive || isParentActive ? 600 : 500,
                                letterSpacing: '0.01em',
                              }}
                            >
                              {configItem.name}
                            </span>
                          </span>
                          {configItem.subItems &&
                            (isExpanded ? (
                              <HiChevronDown size={13} className="shrink-0 opacity-50" />
                            ) : (
                              <HiChevronRight size={13} className="shrink-0 opacity-40" />
                            ))}
                        </a>
                        {configItem.subItems &&
                          isExpanded &&
                          renderSubItems(configItem.subItems, 2)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
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