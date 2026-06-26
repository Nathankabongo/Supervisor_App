import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function Logout() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  useEffect(() => {
    const doLogout = async () => {
      await logout();
      setTimeout(() => {
        navigate('/authentication/login');
      }, 2000);
    };
    doLogout();
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-[#0b1a2a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <LogOut size={40} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Déconnexion...</h1>
        <p className="text-gray-400">Vous allez être redirigé vers la page de connexion</p>
      </div>
    </div>
  );
}
