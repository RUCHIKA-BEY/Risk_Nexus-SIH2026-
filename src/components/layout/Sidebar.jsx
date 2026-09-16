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
  ChevronLeft
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
      { id: 'predictions', label: 'Predictions', path: '/ai/predictions' },
      { id: 'recommendations', label: 'Recommendations', path: '/ai/recommendations' },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    icon: Activity,
    path: '/actions',
    subLinks: [
      { id: 'my-actions', label: 'My Actions', path: '/actions/my-actions' },
      { id: 'pending', label: 'Pending Actions', path: '/actions/pending' },
      { id: 'escalations', label: 'Escalations', path: '/actions/escalations' },
    ],
  },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
    subLinks: [
      { id: 'all-reports', label: 'Reports', path: '/reports/all' },
      { id: 'auto-reports', label: 'Auto Reports', path: '/reports/auto' },
      { id: 'scheduled', label: 'Scheduled Reports', path: '/reports/scheduled' },
    ],
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

  const baseLinkClasses = `w-full flex items-center ${isCollapsed ? 'justify-center py-3' : 'justify-between gap-3 px-3 py-2.5'} rounded text-sm transition-colors cursor-pointer`;
  const activeLinkClasses = "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium";
  const inactiveLinkClasses = "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";

  const subLinkBaseClasses = "w-full flex items-center pl-10 pr-3 py-2 rounded text-xs transition-colors";
  const subLinkActiveClasses = "text-blue-600 dark:text-blue-400 font-medium bg-slate-50 dark:bg-slate-800/50";
  const subLinkInactiveClasses = "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50";

  return (
    <aside className={`min-h-screen bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-200 ease-in-out shrink-0 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      
      {/* Top Section (Toggle) */}
      <div className={`px-4 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Middle Section (Navigation Links) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav className={`py-4 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedMenu === item.id;

            return (
              <div key={item.id} className="space-y-1">
                {item.subLinks ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className={`${baseLinkClasses} ${isExpanded ? activeLinkClasses : inactiveLinkClasses}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className="shrink-0" />
                        {!isCollapsed && (
                          <span className="whitespace-nowrap">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && (
                        <span className="shrink-0">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                      )}
                    </button>
                    {!isCollapsed && (
                      <div
                        className={`space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out ${
                          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
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
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="shrink-0" />
                      {!isCollapsed && (
                        <span className="whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </div>
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section (CRITICAL RESTORATION) */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col gap-4 mt-auto shrink-0">
        
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'} w-full py-2 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none`}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={18} className="shrink-0" /> : <Sun size={18} className="shrink-0" />}
          {!isCollapsed && (
            <span className="text-sm font-medium whitespace-nowrap">
              Dark Mode
            </span>
          )}
        </button>

      </div>
    </aside>
  );
}
