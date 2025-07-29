import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './contexts/ThemeContext';
import DataFlowEditor from './pages/DataFlowEditor';
import TitleBar from './components/TitleBar';
import { isTauri } from './utils/platform';
import './styles/scrollbar.css';

// 動的インポートでSQLGeneratorを遅延読み込み
const SQLGenerator = lazy(() => import('./pages/SQLGenerator'));

const AppContent: React.FC = () => {
  const { isDark } = useTheme();
  
  React.useEffect(() => {
    // Apply scrollbar class to document body
    document.body.className = `custom-scrollbar ${isDark ? 'scrollbar-dark' : 'scrollbar-light'}`;
  }, [isDark]);

  return (
    <>
      <TitleBar />
      <div style={{ paddingTop: isTauri() ? '32px' : '0', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ReactFlowProvider>
          <Router>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
              <Routes>
                <Route path="/" element={<DataFlowEditor />} />
                <Route path="/sql-generator" element={<SQLGenerator />} />
              </Routes>
            </Suspense>
          </Router>
        </ReactFlowProvider>
      </div>
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}


export default App;