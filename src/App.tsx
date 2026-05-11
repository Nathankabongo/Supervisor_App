import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { useRealtimeSimulation } from './hooks/useRealtimeSimulation';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, checkAuth, logout } = useAuthStore();
  const { theme } = useSettingsStore();

  // Appliquer le thème
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Rediriger vers login si non authentifié
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/authentication/login');
    }
  }, [isAuthenticated, navigate]);

  // Initialize real-time simulation with backend WebSocket connection
  useRealtimeSimulation();

  // Sync current page with URL
  useEffect(() => {
    const path = location.pathname.replace('/', '') || 'dashboard';
    setCurrentPage(path);
  }, [location.pathname]);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    if (page === 'dashboard') {
      navigate('/');
    } else {
      navigate(`/${page}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/authentication/login');
  };

  if (!isAuthenticated) {
    return <></>;
  }

  return (
    <>
      <Layout currentPage={currentPage} onPageChange={handlePageChange} onLogout={handleLogout}>
        <Outlet />
      </Layout>
    </>
  );
}

export default App;
