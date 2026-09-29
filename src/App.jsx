import { useState, useRef, useEffect } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import RexAIFab from './components/shared/RexAIFab';
import TopBanner from './components/layout/TopBanner';

// Dynamic Full-Stack Pages
import ExecutiveOverview from './pages/ExecutiveOverview';
import PublicDashboard from './pages/PublicDashboard';
import MLProjectsList from './pages/MLProjectsList';
import SavedProjects from './pages/SavedProjects';
import Milestones from './pages/Milestones';
import ProjectMapView from './pages/ProjectMapView';
import ProjectComparison from './pages/ProjectComparison';
import Analytics from './pages/Analytics';
import AIIntelligence from './pages/AIIntelligence';
import Actions from './pages/Actions';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ChildProjectDashboard from './pages/ChildProjectDashboard';
import RiskAssessment from './pages/RiskAssessment';
import RiskTrajectory from './pages/RiskTrajectory';
import Login from './pages/Login';

function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const isHeaderVisibleRef = useRef(true);
  const mainRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const rafIdRef = useRef(null);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const onScroll = () => {
      if (rafIdRef.current) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const currentScrollTop = mainEl.scrollTop;
        const lastScrollTop = lastScrollTopRef.current;
        const delta = currentScrollTop - lastScrollTop;

        // Rule 1: Always visible at/near the top of the page
        if (currentScrollTop <= 20) {
          if (!isHeaderVisibleRef.current) {
            isHeaderVisibleRef.current = true;
            setIsHeaderVisible(true);
          }
          lastScrollTopRef.current = currentScrollTop;
          return;
        }

        // Rule 2: Accessibility - don't hide if header contains active focus
        const headerEl = document.querySelector('header');
        if (headerEl && headerEl.contains(document.activeElement)) {
          if (!isHeaderVisibleRef.current) {
            isHeaderVisibleRef.current = true;
            setIsHeaderVisible(true);
          }
          lastScrollTopRef.current = currentScrollTop;
          return;
        }

        // Rule 3: Meaningful scroll down (> 15px delta and scrolled past 50px)
        if (delta > 15 && currentScrollTop > 50) {
          if (isHeaderVisibleRef.current) {
            isHeaderVisibleRef.current = false;
            setIsHeaderVisible(false);
          }
          lastScrollTopRef.current = currentScrollTop;
        }
        // Rule 4: Meaningful scroll up (< -15px delta)
        else if (delta < -15) {
          if (!isHeaderVisibleRef.current) {
            isHeaderVisibleRef.current = true;
            setIsHeaderVisible(true);
          }
          lastScrollTopRef.current = currentScrollTop;
        }
      });
    };

    mainEl.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mainEl.removeEventListener('scroll', onScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <TopBanner isVisible={isHeaderVisible} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 outline-none flex flex-col justify-between"
          >
            <div className="flex-1 pt-[68px]">
              <Outlet />
            </div>
            <Footer />
          </main>
        </div>
      </div>
      <RexAIFab />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Top-level routes */}
          <Route index element={<ExecutiveOverview />} />
          <Route path="public" element={<PublicDashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="login" element={<Login />} />
          <Route path="sign-in" element={<Navigate to="/login" replace />} />

          {/* Projects routes */}
          <Route path="projects">
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<MLProjectsList />} />
            <Route path="mine" element={<SavedProjects />} />
            <Route path="milestones" element={<Milestones />} />
            <Route path="map" element={<ProjectMapView />} />
            <Route path="compare" element={<ProjectComparison />} />

            {/* Child Project Dashboard (Drill-Down) */}
            <Route path=":id" element={<ChildProjectDashboard />}>
              <Route index element={<Navigate to="risk" replace />} />
              <Route path="risk" element={<RiskAssessment />} />
              <Route path="trajectory" element={<RiskTrajectory />} />
              <Route path="milestones" element={<RiskTrajectory />} />
              <Route path="map" element={<ProjectMapView />} />
            </Route>

            {/* Support /projects/all/:id alias */}
            <Route path="all/:id" element={<ChildProjectDashboard />}>
              <Route index element={<Navigate to="risk" replace />} />
              <Route path="risk" element={<RiskAssessment />} />
              <Route path="trajectory" element={<RiskTrajectory />} />
              <Route path="milestones" element={<RiskTrajectory />} />
              <Route path="map" element={<ProjectMapView />} />
            </Route>
          </Route>

          {/* AI Intelligence routes */}
          <Route path="ai">
            <Route index element={<Navigate to="insights" replace />} />
            <Route path="insights" element={<AIIntelligence />} />
            <Route path="alerts" element={<Notifications />} />
            <Route path="predictions" element={<AIIntelligence />} />
            <Route path="recommendations" element={<AIIntelligence />} />
          </Route>

          {/* Actions routes */}
          <Route path="actions">
            <Route index element={<Navigate to="my-actions" replace />} />
            <Route path="my-actions" element={<Actions />} />
            <Route path="pending" element={<Actions />} />
            <Route path="escalations" element={<Actions />} />
          </Route>

          {/* Reports routes */}
          <Route path="reports">
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<Reports />} />
            <Route path="auto" element={<Reports />} />
            <Route path="scheduled" element={<Reports />} />
          </Route>

          {/* Settings routes */}
          <Route path="settings">
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<Settings />} />
            <Route path="permissions" element={<Settings />} />
            <Route path="departments" element={<Settings />} />
          </Route>

          {/* Workflows */}
          <Route path="workflows" element={<Actions />} />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
