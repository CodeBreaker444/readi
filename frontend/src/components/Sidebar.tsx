'use client';
import { BarChart3, Bell, BookOpen, ChevronDown, ChevronRight, FileText, Home, Settings, Sliders, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

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
    icon: Home,
    subItems: [
      { name: 'Analytics', href: '/dashboard' },
      { name: 'SHI Index & KPIs', href: '/dashboard/safety-health' }
    ]
  },

  {
    name: 'CO-00 – Planning',
    href: '/planning/new-evaluation',
    icon: BarChart3,
    subItems: [
      { name: 'P00 – New Evaluation Request', href: '/planning/new-evaluation' },
      { name: 'P01 – Evaluation', href: '/planning/evaluation' },
      { name: 'P02 – Planning Mission', href: '/planning/planning-mission' },
      { name: 'P03 – Test Mission', href: '/planning/test-mission' },
      { name: 'P04 – Mission Templates', href: '/planning/mission-template' }
    ]
  },

  {
    name: 'Operations',
    href: '/operations/table',
    icon: Settings,
    subItems: [
      { name: 'Operations Table', href: '/operations/table' },
      { name: 'Daily Board', href: '/operations/daily-board' },
      { name: 'Calendar', href: '/operations/calendar' }
    ]
  },

  {
    name: 'Logbooks',
    href: '/logbooks/operation-requests',
    icon: BookOpen,
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
    icon: Bell,
    subItems: [
      { name: 'SPI & KPI Definitions', href: '/safety/spi-kpi-definitions' },
      // { name: 'Document Repository', href: '/safety/documents' }
    ]
  },

  {
    name: 'Emergency Contact List',
    href: '/emergency',
    icon: Users
  },

  {
    name: 'Notifications',
    href: '/notifications',
    icon: Bell
  },

  {
    name: 'Document Repository',
    href: '/document-repository',
    icon: FileText
  }
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
    href: '/systems-manage',
    subItems: [
      { name: 'Manage Systems', href: '/systems-manage' },
      { name: 'Map', href: '/systems/map' },
      { name: 'Maintenance Dashboard', href: '/systems/maintenance-dashboard' },
      { name: 'Maintenance Tickets', href: '/systems/maintenance-tickets' }
    ]
  },
  {
    name: 'Team',
    href: '/team-personnel',
    subItems: [
      { name: 'Personnel', href: '/team-personnel' },
      { name: 'Crew Shift', href: '/team/crew-shift' }
    ]
  }
];

interface SidebarProps {
  isDark: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isDark }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState('/dashboard');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    setActiveItem(pathname);
  }, [pathname]);

  const toggleExpand = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href) ? prev.filter(item => item !== href) : [...prev, href]
    );
  };

  const handleNavigation = (href: string, hasSubItems?: boolean) => {
    setActiveItem(href);
    if (hasSubItems) {
      toggleExpand(href);
    } else {
      router.push(href);
    }
  };

  const renderSubItems = (subItems: SubNavItem[], level: number = 1) => {
    return (
      <ul className={`space-y-0.5 ${level === 1 ? 'mt-1 ml-4' : 'ml-4'}`}>
        {subItems.map((subItem) => {
          const isExpanded = expandedItems.includes(subItem.href);
          const isActive = activeItem === subItem.href;
          
          return (
            <li key={subItem.href}>
              <a
                href={subItem.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation(subItem.href, !!subItem.subItems);
                }}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-md
                  transition-all duration-150 cursor-pointer text-xs
                  ${isActive
                    ? `${isDark ? 'bg-slate-700 text-white' : 'bg-[#3d566e] text-white'} font-medium`
                    : `${isDark ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-200 hover:bg-[#34495e]'} hover:text-white`
                  }
                `}
              >
                <span className={`flex items-center ${level > 1 ? 'pl-2' : ''}`}>
                  {level > 1 && <span className="mr-2 text-gray-500">•</span>}
                  {subItem.name}
                </span>
                {subItem.subItems && (
                  <ChevronRight
                    size={12}
                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                )}
              </a>
              
              {/* Nested Sub Items */}
              {subItem.subItems && isExpanded && renderSubItems(subItem.subItems, level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className={`w-64 ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-[#2c3e50]'} text-white flex flex-col h-screen`}>
      {/* Logo/Brand */}
      <div className={`p-5 flex items-center space-x-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-700'}`}>
        <div className="w-10 h-10 bg-linear-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-lg">R</span>
        </div>
        <div>
          <span className="text-lg font-bold tracking-wide">ReADI</span>
          <p className="text-xs text-gray-400">Drone Control</p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-0.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.href;
            const isExpanded = expandedItems.includes(item.href);
            
            return (
              <li key={item.href}>
                <div>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(item.href, !!item.subItems);
                    }}
                    className={`
                      flex items-center justify-between px-3 py-2.5 rounded-md
                      transition-all duration-150 cursor-pointer group
                      ${isActive 
                        ? `${isDark ? 'bg-slate-700 text-white' : 'bg-[#3d566e] text-white'} font-medium` 
                        : `${isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-200 hover:bg-[#34495e]'} hover:text-white`
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={18} className={isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'} />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    {item.subItems && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 opacity-60 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </a>
                  
                  {/* Sub Items */}
                  {item.subItems && isExpanded && renderSubItems(item.subItems)}
                </div>
              </li>
            );
          })}
          
          {/* Configuration Section Label */}
          <li className="pt-4 mt-4 border-t border-slate-700">
            <div className="px-3 py-2 flex items-center space-x-2">
              <Sliders size={16} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configuration</span>
            </div>
            
            {/* Configuration Items */}
            <ul className="space-y-0.5 mt-2">
              {configurationItems.map((configItem) => {
                const isExpanded = expandedItems.includes(configItem.href);
                const isActive = activeItem === configItem.href;
                
                return (
                  <li key={configItem.href}>
                    <a
                      href={configItem.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigation(configItem.href, !!configItem.subItems);
                      }}
                      className={`
                        flex items-center justify-between px-3 py-2 rounded-md
                        transition-all duration-150 cursor-pointer text-xs
                        ${isActive
                          ? `${isDark ? 'bg-slate-700 text-white' : 'bg-[#3d566e] text-white'} font-medium`
                          : `${isDark ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-200 hover:bg-[#34495e]'} hover:text-white`
                        }
                      `}
                    >
                      <span>{configItem.name}</span>
                      {configItem.subItems && (
                        <ChevronRight
                          size={12}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      )}
                    </a>
                    
                    {/* Configuration Sub Items */}
                    {configItem.subItems && isExpanded && renderSubItems(configItem.subItems, 2)}
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </nav>


      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDark ? '#1e293b' : '#2c3e50'};
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? '#475569' : '#34495e'};
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? '#64748b' : '#4a5f7f'};
        }
      `}</style>
    </div>
  );
};

export default Sidebar;