import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Wifi, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulation d'envoi d'email
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0b1a2a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-16 w-auto mx-auto" />
          </div>

          {/* Success Card */}
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-8 shadow-xl text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>

            <h2 className="text-xl font-semibold text-white mb-2">Email envoyé !</h2>
            <p className="text-sm text-gray-400 mb-6">
              Nous avons envoyé un lien de réinitialisation à votre adresse email. Vérifiez votre
              boîte de réception.
            </p>

            <button
              onClick={() => navigate('/authentication/login')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Retour à la connexion
            </button>
          </div>

          {/* Footer Info */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-2">
              <Wifi size={14} />
              <span>LoRa Network: Actif</span>
            </div>
            <p className="text-xs text-gray-600">© 2026 SupervisorApp - Mine Security Watch</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1a2a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-16 w-auto mx-auto" />
        </div>

        {/* Forgot Password Card */}
        <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-8 shadow-xl">
          <button
            onClick={() => navigate('/authentication/login')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Retour</span>
          </button>

          <h2 className="text-xl font-semibold text-white mb-2">Mot de passe oublié ?</h2>
          <p className="text-sm text-gray-400 mb-6">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot
            de passe.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Envoyer le lien'
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Vous vous souvenez de votre mot de passe ?{' '}
            <button
              onClick={() => navigate('/authentication/login')}
              className="text-green-500 hover:text-green-400 font-medium transition-colors"
            >
              Se connecter
            </button>
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-2">
            <Wifi size={14} />
            <span>LoRa Network: Actif</span>
          </div>
          <p className="text-xs text-gray-600">© 2026 SupervisorApp - Mine Security Watch</p>
        </div>
      </div>
    </div>
  );
}
