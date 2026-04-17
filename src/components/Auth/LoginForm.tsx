import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStaffStore } from '@/store/useStaffStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { MeshBackground } from '@/components/Guard/LicenseGuard/components/MeshBackground';
import { MorphingLogo } from '@/components/Common/MorphingLogo';

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const { staff } = useStaffStore();
  const { showToast } = useNotificationStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // RECHERCHE DYNAMIQUE DANS LA BASE DE DONNÉES
      let userToLogin = null;
      
      // Cas spécial : Administrateur Système (Toujours accessible via admin/admin au début)
      if (username === 'admin' && password === 'admin') {
         userToLogin = { id: 'admin-id', username: 'Administrateur', role: 'admin' as const };
      } else {
         // Recherche d'un membre du personnel correspondant (Vérification stricte du mot de passe)
         const member = staff.find(s => 
            s.name.toLowerCase() === username.toLowerCase() && 
            s.password === password
         );

         if (member) {
            if (member.isBlocked) {
               setError(`ACCÈS REFUSÉ : Votre compte est suspendu.`);
               return;
            }
            userToLogin = { 
               id: member.id, 
               username: member.name, 
               role: member.systemRole,
               staffId: member.id,
               avatar: member.avatar
            };
         }
      }

       if (userToLogin) {
          login(userToLogin);
          showToast(`Bienvenue, ${userToLogin.username}`, 'success');
       } else {
         setError('Identifiants incorrects. Pour le personnel, utilisez votre nom.');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white overflow-hidden">
      
      {/* Panneau Immersif (Gauche) - Morphing Animation */}
      <div className="relative hidden lg:flex lg:w-[55%] h-screen flex-col items-center justify-center p-12 lg:p-24 overflow-hidden border-r border-black/5 bg-background">
        <MeshBackground />
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full animate-fade-up translate-y-12">
           <MorphingLogo size="xl" className="drop-shadow-2xl" />
           <div className="mt-16 text-center max-w-lg">
              <h1 className="text-4xl lg:text-5xl font-serif italic text-black mb-8 leading-tight">L'Art de la Coupe, <br/>l'Élite du Style</h1>
              <div className="flex items-center justify-center gap-6 opacity-10">
                <div className="h-px bg-black w-20" />
                <div className="w-2 h-2 border border-black rotate-45" />
                <div className="h-px bg-black w-20" />
              </div>
           </div>
        </div>
      </div>

      {/* Panneau de Connexion (Droite) */}
      <div className="flex-1 lg:w-[45%] h-screen flex items-center justify-center p-8 md:p-16 lg:p-24 bg-white relative">
        <div className="w-full max-w-md animate-fade-up">
          
          {/* Version Mobile du Logo (Subtile) */}
          <div className="lg:hidden flex justify-center mb-12">
             <MorphingLogo size="sm" showOfficialFirst={false} speed={1500} />
          </div>

          <div className="mb-16">
            <p className="text-luxury mb-4 font-bold tracking-[0.3em] text-[10px]">ACCÈS SÉCURISÉ</p>
            <h2 className="text-5xl text-editorial-title mb-6 text-black">Connexion</h2>
            <p className="text-sm font-serif italic text-black/60">Identifiez-vous pour gérer votre salon.</p>
          </div>

          <form className="space-y-12" onSubmit={handleSubmit}>
            <div className="space-y-10">
              <div className="space-y-3 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 group-focus-within:text-black transition-colors">Nom d'Utilisateur</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border-b border-black/10 focus:border-black px-0 py-4 text-xl font-serif italic outline-none transition-all placeholder:opacity-20 translate-y-0 focus:-translate-y-1"
                  placeholder="admin, gerant..."
                />
              </div>
              <div className="space-y-3 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 group-focus-within:text-black transition-colors">Mot de Passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-black/10 focus:border-black px-0 py-4 text-xl font-serif italic outline-none transition-all placeholder:opacity-20 translate-y-0 focus:-translate-y-1"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-900 text-[10px] font-bold uppercase tracking-widest text-center animate-shake border border-red-200 py-4 px-2 bg-red-50/50">
                {error}
              </div>
            )}

            <div className="pt-8">
              <button
                type="submit"
                disabled={loading}
                className="btn-premium w-full py-6 flex items-center justify-center gap-4 group"
              >
                <span className="tracking-[0.2em]">{loading ? 'AUTHENTIFICATION...' : 'ACCÉDER AU SALON'}</span>
              </button>
            </div>
          </form>

          <footer className="mt-24 text-center">
              <p className="text-[9px] text-black/20 font-bold uppercase tracking-[0.3em] mb-4">
                 © 2026 BARBER SHOP — LUXURY MANAGEMENT
              </p>
             <div className="flex justify-center gap-6 opacity-10">
                <div className="w-1 h-1 bg-black rounded-full" />
                <div className="w-1 h-1 bg-black rounded-full" />
                <div className="w-1 h-1 bg-black rounded-full" />
             </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

