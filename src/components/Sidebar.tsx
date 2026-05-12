'use client';

import { SessionUser } from '@/lib/auth/server-session';
import { ChevronsUpDown, LogOut, User, UserCircle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GrSystem } from "react-icons/gr";
import {
  HiChevronDown,
  HiChevronRight,
  HiOutlineAcademicCap,
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
  HiOutlinePhone,
  HiOutlineShieldCheck,
  HiOutlineTemplate,
  HiOutlineUsers
} from 'react-icons/hi';
import { TbLayoutSidebarFilled, TbRadar } from "react-icons/tb";
import { Permission, Role, roleHasPermission, ROUTE_PERMISSIONS, RoutePermissionEntry } from '../lib/auth/roles';
import { supabase } from '../lib/supabase/client';

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

interface SidebarProps {
  isDark: boolean;
  role: Role | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userData?: SessionUser | null;
}

const Sidebar: React.FC<SidebarProps> = ({ isDark, role, isCollapsed, onToggleCollapse, userData }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState('/dashboard');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipItem, setTooltipItem] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [menuPos, setMenuPos] = useState<{ bottom: number; left: number } | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuPopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const inTrigger = userMenuRef.current?.contains(e.target as Node);
      const inPopup = userMenuPopupRef.current?.contains(e.target as Node);
      if (!inTrigger && !inPopup) setShowUserMenu(false);
    };
    if (showUserMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  const handleOpenUserMenu = () => {
    if (!showUserMenu && userMenuRef.current) {
      const rect = userMenuRef.current.getBoundingClientRect();
      const popupWidth = 256;
      const idealLeft = rect.right + 8;
      const left = Math.min(idealLeft, window.innerWidth - popupWidth - 8);
      setMenuPos({ bottom: window.innerHeight - rect.bottom, left: Math.max(left, 8) });
    }
    setShowUserMenu((v) => !v);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      setShowUserMenu(false);
      window.location.href = '/auth/login';
    } catch {
      // ignore
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navigationItems: NavItem[] = [
    {
      name: t('sidebar.dashboard'),
      href: '/dashboard',
      icon: HiOutlineHome,
      subItems: [
        { name: t('sidebar.analytics'), href: '/dashboard' },
        { name: t('sidebar.shiKpis'), href: '/dashboard/safety-health' }
      ]
    },
    {
      name: t('sidebar.planning'),
      href: '/planning/new-evaluation',
      icon: HiOutlineChartBar,
      subItems: [
        { name: t('sidebar.newEvaluationRequest'), href: '/planning/new-evaluation' },
        { name: t('sidebar.evaluation'), href: '/planning/evaluation' },
        { name: t('sidebar.planningDashboard'), href: '/planning/planning-dashboard' },
        { name: t('sidebar.missionTemplates'), href: '/planning/mission-template' },
      ]
    },
    {
      name: t('sidebar.operations'),
      href: '/operations/table',
      icon: HiOutlineCog,
      subItems: [
        { name: t('sidebar.operationsTable'), href: '/operations/table' },
        { name: t('sidebar.dailyBoard'), href: '/operations/daily-board' },
        { name: t('sidebar.flightRequests'), href: '/operations/flight-requests' },
        { name: t('sidebar.calendar'), href: '/operations/calendar' }
      ]
    },
    {
      name: t('sidebar.logbooks'),
      href: '/logbooks/mission-planning-logbook',
      icon: HiOutlineBookOpen,
      subItems: [
        { name: t('sidebar.plannedMissionLogbook'), href: '/logbooks/mission-planning-logbook' },
        { name: t('sidebar.flightLogbook'), href: '/logbooks/operation-logbook' },
      ]
    },
    {
      name: t('sidebar.safetyManagement'),
      href: '/safety/spi-kpi-definitions',
      icon: HiOutlineBell,
      subItems: [
        { name: t('sidebar.spiKpiDefinitions'), href: '/safety/spi-kpi-definitions' },
      ]
    },
    {
      name: t('sidebar.emergencyContactList'),
      href: '/emergency-contact',
      icon: HiOutlinePhone,
    },
    {
      name: t('sidebar.compliance'),
      href: '/compliance/general-audit-plan',
      icon: HiOutlineShieldCheck,
      subItems: [
        { name: t('sidebar.generalAuditPlan'), href: '/compliance/general-audit-plan' },
        { name: t('sidebar.safetyTargetReview'), href: '/compliance/safety-target-review' },
        { name: t('sidebar.requirementsEvidence'), href: '/compliance/requirements-evidences' },
        { name: t('sidebar.calendar'), href: '/compliance/calendar' },
      ]
    },
    {
      name: t('sidebar.flytbase'),
      href: '/control-center',
      icon: HiOutlinePaperAirplane,
      subItems: [
        { name: t('sidebar.settings'), href: '/control-center' },
        { name: t('sidebar.recentFlights'), href: '/control-center/flights' },
      ],
    },
    {
      name: t('sidebar.droneAtc'),
      href: '/drone-atc',
      icon: TbRadar,
    },
    {
      name: t('sidebar.training'),
      href: '/training/courses',
      icon: HiOutlineAcademicCap,
      subItems: [
        { name: t('sidebar.courses'), href: '/training/courses' },
        { name: t('sidebar.calendar'), href: '/training/calendar' },
      ],
    },
    { name: t('sidebar.notifications'), href: '/notifications', icon: HiOutlineBell },
    { name: t('sidebar.documentRepository'), href: '/document-repository', icon: HiOutlineDocumentText },
    { name: t('sidebar.auditLogs'), href: '/audit-logs', icon: HiOutlineClipboardList },
  ];

  const configurationItems: SubNavItem[] = [
    {
      name: t('sidebar.organization'),
      href: '/organization/chart',
      icon: HiOutlineOfficeBuilding,
      subItems: [
        { name: t('sidebar.chart'), href: '/organization/chart' },
        { name: t('sidebar.procedures'), href: '/organization/luc-procedures' },
        { name: t('sidebar.checklist'), href: '/organization/checklist' },
        { name: t('sidebar.assignments'), href: '/organization/assignments' },
        { name: t('sidebar.communication'), href: '/organization/communication' },
      ],
    },
    {
      name: t('sidebar.mission'),
      href: '/mission/type',
      icon: HiOutlineTemplate,
      subItems: [
        { name: t('sidebar.missionType'), href: '/mission/type' },
        { name: t('sidebar.missionCategory'), href: '/mission/category' },
        { name: t('sidebar.missionStatus'), href: '/mission/status' },
        { name: t('sidebar.missionResult'), href: '/mission/result' },
      ],
    },
    {
      name: t('sidebar.systems'),
      href: '/systems/manage',
      icon: GrSystem,
      subItems: [
        { name: t('sidebar.manageSystems'), href: '/systems/manage' },
        { name: t('sidebar.map'), href: '/systems/map' },
        { name: t('sidebar.maintenanceDashboard'), href: '/systems/maintenance-dashboard' },
        { name: t('sidebar.maintenanceTickets'), href: '/systems/maintenance-tickets' },
      ],
    },
    {
      name: t('sidebar.team'),
      href: '/team/personnel',
      icon: HiOutlineUsers,
      subItems: [
        { name: t('sidebar.personnel'), href: '/team/personnel' },
        { name: t('sidebar.crewShift'), href: '/team/crew-shift' },
        { name: t('sidebar.client'), href: '/team/client' },
      ],
    },
    {
      name: t('sidebar.company'),
      href: '/company',
      icon: HiOutlineBriefcase,
      subItems: [{ name: t('sidebar.companyDirectory'), href: '/company' }],
    },
    {
      name: t('sidebar.settings'),
      href: '/settings/security',
      icon: HiOutlineShieldCheck,
      subItems: [
        { name: t('sidebar.securityApiKeys'), href: '/settings/security' },
        { name: t('sidebar.integrations'), href: '/settings/integrations' },
      ],
    },
  ];

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
      // Hide Company section for non-superadmins (use stable href, not translated name)
      if (configItem.href === '/company' && role !== 'SUPERADMIN') {
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
                          ? isDark ? '#a78bfa' : '#ffffff'
                          : isHovered ? '#8b5cf6'
                            : isDark ? '#475569' : '#cbd5e1',
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
          <Icon size={18} className="shrink-0 transition-colors duration-150" />
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
            <div
              className="w-8 h-8 rounded-xl overflow-hidden text-white flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
              }}
            >
              <img
                src="/logo-sm.png"
                alt="ReADI Logo"
                className="w-full h-full object-contain brightness-0 invert"
              />
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
                  style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}
                >
                  {t('sidebar.appSubtitle')}
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className={`cursor-pointer p-1 rounded-md transition-all duration-150 ${isDark
                  ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
              title={t('sidebar.collapse')}
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
            className={`cursor-pointer p-1 rounded-md transition-all duration-150 ${isDark
                ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              }`}
            title={t('sidebar.expand')}
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
              const isActive = isRouteActive(item.href, item.subItems);
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
                  className={`px-3 pb-1.5 uppercase ${isDark ? 'text-slate-600' : 'text-slate-400'}`}
                  style={{ fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 600 }}
                >
                  {t('sidebar.configuration')}
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
                            ${getItemClass(configItem.href, isParentActive)}
                          `}
                          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
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
                        {configItem.subItems && isExpanded && renderSubItems(configItem.subItems, 2)}
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

      {/* User section at bottom */}
      <div
        ref={userMenuRef}
        className={`shrink-0 ${isDark ? 'border-t border-slate-800' : 'border-t border-slate-100'} ${isCollapsed ? 'px-2 py-3' : 'px-3 py-3'}`}
      >
        {isCollapsed ? (
          <div className="flex justify-center">
            <button
              onClick={handleOpenUserMenu}
              className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border-2 transition-all duration-150 ${
                showUserMenu
                  ? isDark ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-violet-400 ring-2 ring-violet-400/20'
                  : isDark ? 'border-slate-700 hover:border-violet-500/60' : 'border-slate-200 hover:border-violet-400/60'
              } bg-linear-to-br ${isDark ? 'from-violet-600 to-indigo-600' : 'from-violet-500 to-indigo-500'}`}
            >
              {userData?.avatar ? (
                <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <User size={15} className="text-white" />
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleOpenUserMenu}
            className={`w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg transition-all duration-150 ${
              showUserMenu
                ? isDark ? 'bg-slate-800' : 'bg-slate-100'
                : isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50'
            }`}
          >
            <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 border bg-linear-to-br ${
              isDark ? 'border-slate-700 from-violet-600 to-indigo-600' : 'border-slate-200 from-violet-500 to-indigo-500'
            }`}>
              {userData?.avatar ? (
                <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <User size={18} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`} style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {userData?.username || 'User'}
              </p>
              <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`} style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {userData?.email || ''}
              </p>
              <p className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`} style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {userData?.role || ''}
              </p>
            </div>
            <ChevronsUpDown size={14} className={`shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          </button>
        )}
      </div>

      {/* User popup — fixed to viewport right of sidebar */}
      {showUserMenu && menuPos && (
        <div
          ref={userMenuPopupRef}
          className={`fixed z-[200] w-64 rounded-xl border overflow-hidden ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
          style={{
            bottom: menuPos.bottom,
            left: menuPos.left,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          }}
        >
          {/* User info header */}
          <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 border bg-linear-to-br ${
              isDark ? 'border-slate-600 from-violet-600 to-indigo-600' : 'border-slate-200 from-violet-500 to-indigo-500'
            }`}>
              {userData?.avatar ? (
                <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <User size={14} className="text-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {userData?.username || 'User'}
              </p>
              <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {userData?.email || ''}
              </p>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => { setShowUserMenu(false); router.push('/profile'); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                isDark ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              style={{ fontSize: '0.78rem', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              <UserCircle size={15} />
              {t('topbar.profile')}
            </button>
          </div>

          <div className={`px-1.5 pb-1.5 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors mt-1.5 ${
                isDark ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-red-500 hover:bg-red-50 hover:text-red-600'
              } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ fontSize: '0.78rem', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              <LogOut size={15} />
              {isLoggingOut ? t('topbar.loggingOut') : t('topbar.logout')}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;