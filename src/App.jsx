import { useState } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import RexAIFab from './components/shared/RexAIFab';

// Pages
import ExecutiveOverview from './pages/ExecutiveOverview';
import PublicDashboard from './pages/PublicDashboard';
import ChildProjectDashboard from './pages/ChildProjectDashboard';
import PendingIntegrationView from './components/shared/PendingIntegrationView';
import TopBanner from './components/layout/TopBanner';

function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <TopBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
            <Outlet />
          </main>
          <Footer />
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
          <Route path="analytics" element={<PendingIntegrationView />} />
          <Route path="notifications" element={<PendingIntegrationView />} />
          
          {/* Projects routes */}
          <Route path="projects">
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<PendingIntegrationView />} />
            <Route path="mine" element={<PendingIntegrationView />} />
            <Route path="milestones" element={<PendingIntegrationView />} />
            <Route path="map" element={<PendingIntegrationView />} />
            <Route path="compare" element={<PendingIntegrationView />} />
            
            {/* Child Project Dashboard (Drill-Down) */}
            <Route path=":id" element={<ChildProjectDashboard />}>
              <Route index element={<Navigate to="progress" replace />} />
              <Route path="progress" element={<PendingIntegrationView />} />
              <Route path="milestones" element={<PendingIntegrationView />} />
              <Route path="map" element={<PendingIntegrationView />} />
            </Route>
          </Route>
          
          {/* AI Intelligence routes */}
          <Route path="ai">
            <Route index element={<Navigate to="insights" replace />} />
            <Route path="insights" element={<PendingIntegrationView />} />
            <Route path="alerts" element={<PendingIntegrationView />} />
            <Route path="predictions" element={<PendingIntegrationView />} />
            <Route path="recommendations" element={<PendingIntegrationView />} />
          </Route>

          {/* Actions routes */}
          <Route path="actions">
            <Route index element={<Navigate to="my-actions" replace />} />
            <Route path="my-actions" element={<PendingIntegrationView />} />
            <Route path="pending" element={<PendingIntegrationView />} />
            <Route path="escalations" element={<PendingIntegrationView />} />
          </Route>

          {/* Reports routes */}
          <Route path="reports">
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<PendingIntegrationView />} />
            <Route path="auto" element={<PendingIntegrationView />} />
            <Route path="scheduled" element={<PendingIntegrationView />} />
          </Route>

          {/* Settings routes */}
          <Route path="settings">
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<PendingIntegrationView />} />
            <Route path="permissions" element={<PendingIntegrationView />} />
            <Route path="departments" element={<PendingIntegrationView />} />
          </Route>
          
          {/* Workflows placeholder */}
          <Route path="workflows" element={<PendingIntegrationView />} />

          {/* Catch-all route for unknown URLs */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
