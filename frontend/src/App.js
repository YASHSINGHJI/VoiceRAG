import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './ThemeContext';
import FloatingHeader from './components/FloatingHeader';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import KnowledgeBase from './pages/KnowledgeBase';
import SearchExplorer from './pages/SearchExplorer';
import Analytics from './pages/Analytics';

/* Shell wraps every page with theme class + floating header */
const Shell = ({ children }) => {
  const { darkMode } = useTheme();
  return (
    <div className={`app-shell ${darkMode ? 'dark' : 'light'}`}>
      <FloatingHeader />
      {children}
    </div>
  );
};

/* Pages that need padding below the floating header */
const PageLayout = ({ children }) => (
  <main className="page-content">{children}</main>
);

const AppRoutes = () => (
  <Shell>
    <Routes>
      <Route path="/"          element={<Landing />} />
      <Route path="/chat"      element={<PageLayout><Chat /></PageLayout>} />
      <Route path="/knowledge" element={<PageLayout><KnowledgeBase /></PageLayout>} />
      <Route path="/search"    element={<PageLayout><SearchExplorer /></PageLayout>} />
      <Route path="/analytics" element={<PageLayout><Analytics /></PageLayout>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  </Shell>
);

const App = () => (
  <ThemeProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
