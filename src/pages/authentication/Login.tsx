import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Wifi, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    clearError();
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await signup(username, password, name);
      }
      navigate('/');
    } catch (err) {
      // Error is in the store
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#0b1a2a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={`/LOGO.png`} alt="SupervisorApp" className="h-16 w-auto mx-auto" />
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-8 shadow-xl">
          {/* Mode Toggle */}
          <div className="flex mb-6 bg-[#0b1a2a] rounded-lg p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User size={16} />
              Connexion
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus size={16} />
              Inscription
            </button>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Connexion Superviseur</h2>
              <p className="text-sm text-gray-400 mb-6">
                Connectez-vous pour accéder au système de surveillance
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Créer un compte</h2>
              <p className="text-sm text-gray-400 mb-6">
                Inscrivez-vous pour accéder au système de surveillance
              </p>
            </>
          )}

          {displayError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field - signup only */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">Nom complet</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Nom d'utilisateur</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="supervisor"
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Mot de passe</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password - signup only */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'login' ? 'Connexion...' : 'Inscription...'}
                </>
              ) : (
                mode === 'login' ? 'Se connecter' : 'Créer un compte'
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 p-3 bg-[#0b1a2a] rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 text-center">
                Identifiants par défaut: <span className="text-green-400">supervisor</span> / <span className="text-green-400">admin123</span>
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-2">
            <Wifi size={14} />
            <span>LoRa Network: Actif</span>
          </div>
          <p className="text-xs text-gray-600">
            © 2026 SupervisorApp - Mine Security Watch
          </p>
        </div>
      </div>
    </div>
  );
}
