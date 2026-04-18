import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStaffStore } from '@/store/useStaffStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { MeshBackground } from '@/components/Guard/LicenseGuard/components/MeshBackground';
import { MorphingLogo } from '@/components/Common/MorphingLogo';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const { staff, fetchStaff } = useStaffStore();
  const { showToast } = useNotificationStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     fetchStaff();
  }, [fetchStaff]);

  const scroll = (direction: 'left' | 'right') => {
     if (scrollRef.current) {
        const { current } = scrollRef;
        const scrollAmount = 200;
        current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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
         const userToLogin = { 
            id: member.id, 
            name: member.name, 
            role: member.systemRole,
            avatar: member.avatar
         };
         login(userToLogin as any);
         showToast(`Bienvenue, ${userToLogin.name}`, 'success');
      } else {
         setError('Identifiants incorrects. Veuillez vérifier votre mot de passe.');
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

          <div className="mb-10">
            <p className="text-luxury mb-4 font-bold tracking-[0.3em] text-[10px]">ACCÈS SÉCURISÉ</p>
            <h2 className="text-5xl text-editorial-title mb-6 text-black">Connexion</h2>
            <p className="text-sm font-serif italic text-black/60">Choisissez votre profil pour continuer.</p>
          </div>

          <div className="mb-12 relative group/nav">
             <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-6 block">Sélection Directe</label>
             
             <div className="relative">
                {/* Flèche Gauche */}
                <button 
                   type="button"
                   onClick={() => scroll('left')}
                   className="absolute left-[-10px] top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 backdrop-blur-md border border-black/5 text-black/40 hover:text-black hover:border-black transition-all shadow-lg opacity-0 group-hover/nav:opacity-100 -translate-x-4 group-hover/nav:translate-x-0"
                >
                   <ChevronLeft size={16} />
                </button>

                {/* Flèche Droite */}
                <button 
                   type="button"
                   onClick={() => scroll('right')}
                   className="absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 backdrop-blur-md border border-black/5 text-black/40 hover:text-black hover:border-black transition-all shadow-lg opacity-0 group-hover/nav:opacity-100 translate-x-4 group-hover/nav:translate-x-0"
                >
                   <ChevronRight size={16} />
                </button>

                <div 
                   ref={scrollRef}
                   className="flex gap-4 overflow-x-auto pt-4 pb-10 hide-scrollbar -mx-4 px-4 scroll-smooth"
                >
                   {/* Staff members - Inclut l'admin car il est dans la DB désormais */}
                   {staff.filter(s => !s.isBlocked).map(member => (
                      <button 
                         key={member.id}
                         type="button"
                         onClick={() => setUsername(member.name)}
                         className={`shrink-0 w-24 flex flex-col items-center gap-3 transition-all duration-500 group ${username === member.name ? 'scale-110 active' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                      >
                         <div className={`w-16 h-16 rounded-full border-2 overflow-hidden transition-all ${username === member.name ? 'border-black shadow-xl ring-4 ring-black/5' : 'border-black/5 group-hover:border-black'}`}>
                            {member.systemRole === 'admin' && !member.avatar ? (
                               <div className={`w-full h-full flex items-center justify-center transition-all ${username === member.name ? 'bg-black' : 'bg-background-soft'}`}>
                                  <Shield size={24} className={username === member.name ? 'text-white' : 'text-black/20'} />
                               </div>
                            ) : member.avatar ? (
                               <img src={member.avatar} className="w-full h-full object-cover" alt={member.name} />
                            ) : (
                               <div className="w-full h-full bg-background-soft flex items-center justify-center p-3">
                                  <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-full h-full object-contain opacity-20 grayscale" alt="Logo" />
                               </div>
                            )}
                         </div>
                         <span className="text-[9px] font-bold uppercase tracking-widest text-center truncate w-full">{member.name.split(' ')[0]}</span>
                      </button>
                   ))}
                </div>
             </div>
          </div>

          <form className="space-y-12" onSubmit={handleSubmit}>
            <div className="space-y-10">

              <div className={`space-y-3 group transition-all duration-500 ${!username ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 group-focus-within:text-black transition-colors">Mot de Passe</label>
                <input
                  type="password"
                  required
                  disabled={!username}
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

