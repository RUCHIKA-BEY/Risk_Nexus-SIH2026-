import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Globe,
  FolderKanban,
  Sparkles,
  BarChart3,
  Settings,
  Sun,
  Moon,
  LineChart,
  Activity,
  Bell,
  ChevronDown,
  ChevronRight,
  Menu,
  LogIn,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'public', label: 'Public Dashboard', icon: Globe, path: '/public' },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    path: '/projects',
    subLinks: [
      { id: 'all-projects', label: 'All Projects', path: '/projects/all' },
      { id: 'my-projects', label: 'My Projects', path: '/projects/mine' },
      { id: 'milestones', label: 'Milestones', path: '/projects/milestones' },
      { id: 'map-view', label: 'Map View', path: '/projects/map' },
      { id: 'comparison', label: 'Comparison', path: '/projects/compare' },
    ],
  },
  { id: 'analytics', label: 'Analytics', icon: LineChart, path: '/analytics' },
  {
    id: 'ai',
    label: 'AI Intelligence',
    icon: Sparkles,
    path: '/ai',
    subLinks: [
      { id: 'insights', label: 'AI Insights', path: '/ai/insights' },
      { id: 'alerts', label: 'Risk Alerts', path: '/ai/alerts' },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    icon: Activity,
    path: '/actions',
  },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    subLinks: [
      { id: 'users', label: 'Users', path: '/settings/users' },
      { id: 'permissions', label: 'Permissions', path: '/settings/permissions' },
      { id: 'departments', label: 'Departments', path: '/settings/departments' },
    ],
  },
];

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const { theme, toggleTheme } = useTheme();
  const [expandedMenu, setExpandedMenu] = useState(null);

  useEffect(() => {
    if (isCollapsed) {
      setExpandedMenu(null);
    }
  }, [isCollapsed]);

  const toggleMenu = (menuId) => {
    if (isCollapsed) toggleSidebar();
    setExpandedMenu((prev) => (prev === menuId ? null : menuId));
  };

  const baseLinkClasses = `w-full flex items-center ${isCollapsed ? 'justify-center py-3' : 'justify-between gap-3 px-3 py-2.5'} rounded-lg text-sm transition-colors duration-150 cursor-pointer`;
  const activeLinkClasses = 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium';
  const inactiveLinkClasses = 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800';

  const subLinkBaseClasses = 'w-full flex items-center pl-10 pr-3 py-2 rounded-lg text-xs transition-colors duration-150';
  const subLinkActiveClasses = 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20';
  const subLinkInactiveClasses = 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70';

  return (
    <aside
      className={`h-full bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ease-in-out shrink-0 pt-[68px] ${isCollapsed ? 'w-[60px]' : 'w-64'}`}
    >
      {/* Sidebar Header with 2-way Hamburger Toggle */}
      <div
        className={`border-b border-slate-200 dark:border-slate-800 flex items-center h-14 shrink-0 px-3.5 ${
          isCollapsed ? 'justify-center' : 'justify-start'
        }`}
      >
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          title={isCollapsed ? 'Expand Sidebar (☰)' : 'Collapse Sidebar (☰)'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <Menu size={20} className="shrink-0" />
        </button>
      </div>

      {/* Navigation Links and Action Controls */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav className={`py-3 space-y-0.5 ${isCollapsed ? 'px-1.5' : 'px-2'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedMenu === item.id;

            return (
              <div key={item.id} className="space-y-0.5">
                {item.subLinks ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className={`${baseLinkClasses} ${isExpanded ? activeLinkClasses : inactiveLinkClasses}`}
                      title={isCollapsed ? item.label : undefined}
                      aria-label={item.label}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className="shrink-0" />
                        {!isCollapsed && (
                          <span className="whitespace-nowrap text-sm">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && (
                        <span className="shrink-0 text-slate-400">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                    </button>
                    {!isCollapsed && (
                      <div
                        className={`overflow-hidden transition-all duration-250 ease-in-out ${
                          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="space-y-0.5 pb-1">
                          {item.subLinks.map((sub) => (
                            <NavLink
                              key={sub.id}
                              to={sub.path}
                              className={({ isActive }) =>
                                `${subLinkBaseClasses} ${isActive ? subLinkActiveClasses : subLinkInactiveClasses}`
                              }
                            >
                              <span className="whitespace-nowrap">{sub.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                    }
                    title={isCollapsed ? item.label : undefined}
                    aria-label={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="shrink-0" />
                      {!isCollapsed && (
                        <span className="whitespace-nowrap text-sm">
                          {item.label}
                        </span>
                      )}
                    </div>
                  </NavLink>
                )}
              </div>
            );
          })}

          {/* Clean Separator for Reachable Actions */}
          <div className="pt-3 pb-2">
            <div className="border-t border-slate-200 dark:border-slate-800" />
          </div>

          {/* Reachable Theme Control (Directly below navigation) */}
          <div>
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'
              } rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
              title={isCollapsed ? (theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode') : undefined}
              aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <Moon size={18} className="shrink-0 text-slate-600 dark:text-slate-400" />
              ) : (
                <Sun size={18} className="shrink-0 text-amber-500" />
              )}
              {!isCollapsed && (
                <span className="whitespace-nowrap font-medium text-sm">
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </span>
              )}
            </button>
          </div>

          {/* Reachable Sign In Entry */}
          <div>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `w-full flex items-center ${
                  isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'
                } rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
              title={isCollapsed ? 'Sign In — Government Official Access' : undefined}
              aria-label="Sign In — Government Official Access"
            >
              <LogIn size={18} className="shrink-0 text-blue-600 dark:text-blue-400" />
              {!isCollapsed && (
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                    Sign In
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                    Govt Official Access
                  </span>
                </div>
              )}
            </NavLink>
          </div>
        </nav>
      </div>
    </aside>
  );
}
