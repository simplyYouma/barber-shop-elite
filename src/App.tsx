import { LicenseGuard, MaintenancePage } from '@/components/Guard';
import { LoginForm } from '@/components/Auth/LoginForm';
import { useAuthStore } from '@/store/useAuthStore';
import { POSModule } from '@/components/POS/POSModule';
import { ClientsModule } from '@/components/Clients/ClientsModule';
import { DashboardModule } from '@/components/Dashboard/DashboardModule';
import { SettingsModule } from '@/components/Settings/SettingsModule';
import { AgendaModule } from '@/components/Agenda/AgendaModule';
import { useQueueStore } from '@/store/useQueueStore';
import { useStaffStore } from '@/store/useStaffStore';
import { useClientStore } from '@/store/useClientStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useArchiveStore } from '@/store/useArchiveStore';
import { useAppointmentStore } from '@/store/useAppointmentStore';
import { LayoutDashboard, Users, Scissors, LogOut, Settings, Plus, Calendar, Clock } from 'lucide-react';
import { QuickCommand } from '@/components/Common/QuickCommand';
import { NotificationCenter } from '@/components/Common/NotificationCenter';
import { EliteAlert } from '@/components/Common/EliteAlert';
import { LiveQueueWidget } from '@/components/Common/LiveQueueWidget';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { isAfter, format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Tab = 'pos' | 'clients' | 'dashboard' | 'agenda' | 'settings';

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden xl:flex flex-col items-end border-r border-steel pr-8 animate-fade-in">
       <div className="flex items-center gap-2 text-black">
          <Clock size={12} className="opacity-20" />
          <p className="text-xl font-serif italic text-black leading-none">{format(time, 'HH:mm:ss')}</p>
       </div>
       <p className="text-[8px] text-luxury font-bold uppercase tracking-[0.2em] mt-1">{format(time, 'EEEE dd MMMM', { locale: fr })}</p>
    </div>
  );
};

function App() {
  const { user, isAuthenticated, logout, permissions } = useAuthStore();
  const { fetchStaff } = useStaffStore();
  const { fetchClients, setSelectedClientForPOS, setIsQuickAddMode } = useClientStore();
  const { fetchServices } = useServiceStore();
  const { fetchQueue, checkAndArchive } = useQueueStore();
  const { fetchArchives } = useArchiveStore();
  const { appointments } = useAppointmentStore();
  const { salon_name, salon_logo, salon_logo_theme } = useSettingsStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('pos');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { session_timeout, maintenance_mode } = useSettingsStore();
  const inactivityTimerRef = useRef<any>(null);

  const handleQuickClientSelect = (client: any) => {
    setSelectedClientForPOS(client);
    setActiveTab('pos');
  };

  useEffect(() => {
    checkAndArchive();
  }, [checkAndArchive]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchStaff();
      fetchClients();
      fetchServices();
      fetchQueue().then(() => {
         useQueueStore.getState().syncAllAppointments(appointments);
      });
      fetchArchives();

       // Sécurité : S'assurer que les permissions incluent l'agenda si manquant
       if (permissions[user.role] && permissions[user.role].agenda === undefined) {
          (permissions[user.role] as any).agenda = true;
       }
    }
  }, [isAuthenticated, user, fetchStaff, fetchClients, fetchServices, fetchQueue, fetchArchives, permissions]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    
    if (isAuthenticated) {
       inactivityTimerRef.current = setTimeout(() => {
          logout();
       }, session_timeout * 60 * 1000);
    }
  }, [isAuthenticated, logout, session_timeout]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, resetInactivityTimer));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isAuthenticated, resetInactivityTimer]);

  const isUnderMaintenance = maintenance_mode && user?.role !== 'admin';

  const nextAppointment = useMemo(() => {
     if (!appointments || appointments.length === 0) return null;
     const now = new Date();
     const upcoming = appointments
        .filter(appt => {
           // On ne prend que les RDV confirmés (pas annulés ni terminés)
           if (appt.status !== 'confirmed') return false;
           
           const apptDate = new Date(appt.day);
           apptDate.setHours(appt.hour, 0, 0, 0);
           
           // Le RDV doit être strictement dans le futur par rapport à maintenant
           return isAfter(apptDate, now);
        })
        .sort((a, b) => {
           const dateA = new Date(a.day); dateA.setHours(a.hour, 0, 0, 0);
           const dateB = new Date(b.day); dateB.setHours(b.hour, 0, 0, 0);
           return dateA.getTime() - dateB.getTime();
        });
     return upcoming[0] || null;
  }, [appointments]);

  const userPermissions = user ? permissions[user.role] : null;

  useEffect(() => {
    if (isAuthenticated && userPermissions && !isUnderMaintenance) {
      if (!userPermissions[activeTab as keyof typeof userPermissions]) {
        const availableTabs = (['pos', 'agenda', 'clients', 'dashboard', 'settings'] as Tab[]).filter(t => userPermissions[t as keyof typeof userPermissions]);
        if (availableTabs.length > 0) {
          setActiveTab(availableTabs[0]);
        }
      }
    }
  }, [activeTab, userPermissions, isAuthenticated, isUnderMaintenance]);

  return (
    <LicenseGuard>
      <NotificationCenter />
      <EliteAlert />
      {!isAuthenticated ? (
        <LoginForm />
      ) : isUnderMaintenance ? (
        <MaintenancePage />
      ) : (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden relative">
            
            <aside className={`border-r border-steel flex flex-col bg-white sidebar-transition relative z-30 ${isCollapsed ? 'w-16 lg:w-20' : 'w-64 lg:w-72'}`}>
                <div className={`p-4 lg:px-6 lg:py-8 flex flex-col items-center transition-all duration-300 gap-4 overflow-hidden border-b border-steel/50`}>
                  <div className="relative group/logo w-full flex flex-col items-center">
                    <div className={`flex items-center justify-center transition-all duration-500 ${salon_logo_theme === 'dark' ? 'bg-black p-3 rounded-md' : 'bg-transparent'}`}>
                      <img 
                        src={salon_logo || (salon_logo_theme === 'dark' ? "/Coupes_BarberShop_PNG/coupe_1_WhiteTrait.png" : "/Coupes_BarberShop_PNG/coupe_1.png")} 
                        className={`${isCollapsed ? 'w-12 h-12' : 'w-24 h-24'} object-contain transition-all duration-500`} 
                        alt="Logo"
                      />
                    </div>
                    {!isCollapsed && (
                      <span className="font-serif font-black text-[14px] uppercase tracking-[0.4em] text-center mt-4 animate-fade-up line-clamp-2 px-2 text-black">
                        {salon_name}
                      </span>
                    )}
                    {!isCollapsed && (
                      <button 
                        onClick={() => setIsCollapsed(true)}
                        className="absolute -top-4 -right-2 p-1 hover:bg-background-soft transition-colors animate-fade-up opacity-20 hover:opacity-100 text-black outline-none"
                      >
                        <Plus size={18} className="rotate-45" />
                      </button>
                    )}
                  </div>
                </div>

               {isCollapsed && (
                  <button 
                    onClick={() => setIsCollapsed(false)}
                    className="mx-auto mt-8 p-3 bg-background-soft hover:bg-black hover:text-white text-black transition-all rounded-full animate-fade-up outline-none"
                   >
                    <Plus size={16} />
                  </button>
               )}
               
                <nav className={`flex-1 flex flex-col px-2 lg:px-6 py-2 gap-2 hide-scrollbar ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
                   <div className="flex flex-col gap-10 mt-10">
                  {[
                    { id: 'pos', icon: Scissors, label: 'Caisse', key: 'pos' },
                    { id: 'agenda', icon: Calendar, label: 'Agenda', key: 'agenda' },
                    { id: 'clients', icon: Users, label: 'Clientèle', key: 'clients' },
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Analyses', key: 'dashboard' },
                  ].filter(item => userPermissions?.[item.key as keyof typeof userPermissions]).map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id as Tab); if(window.innerWidth < 1024) setIsCollapsed(true); }}
                        title={item.label}
                        className={`flex items-center gap-6 transition-all duration-500 group relative outline-none ${isCollapsed ? 'justify-center p-0' : 'px-0'} ${
                          isActive ? 'text-black' : 'text-luxury hover:text-black'
                        }`}
                      >
                         <Icon size={18} className={isActive ? 'scale-110' : 'group-hover:scale-110 transition-transform opacity-40 group-hover:opacity-100'} />
                         {!isCollapsed && <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-nowrap animate-fade-up">{item.label}</span>}
                         {isActive && (
                           <div className="absolute -left-6 md:-left-8 w-1 h-8 bg-black animate-slide-right" />
                         )}
                      </button>
                    );
                  })}
               </div>
                </nav>

               <div className={`mt-auto p-4 border-t border-steel flex flex-col gap-6 ${isCollapsed ? 'items-center' : ''}`}>
                  {!isCollapsed && (
                     <div className="bg-background-soft/50 p-4 border border-black/[0.03] animate-fade-up">
                        <div className="flex items-center gap-2 mb-2">
                           <Calendar size={10} className="text-luxury" />
                           <p className="text-[7px] font-bold uppercase tracking-widest text-luxury">À Venir</p>
                        </div>
                        {nextAppointment ? (
                           <div className="flex items-center gap-3 animate-fade-up">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-black/5 bg-white flex items-center justify-center shrink-0">
                                 <img 
                                   src="/Coupes_BarberShop_PNG/coupe_1.png" 
                                   className="w-5 h-5 object-contain grayscale opacity-20" 
                                   alt="Default"
                                 />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                 <p className="text-[10px] font-serif italic truncate text-black leading-tight">{nextAppointment.clientName}</p>
                                 <div className="flex items-center gap-2 text-[8px] font-bold uppercase text-black/40">
                                    <Clock size={8} />
                                    <span>{nextAppointment.hour}:00</span>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <p className="text-[8px] italic opacity-30">Aucun RdV prévu</p>
                        )}
                     </div>
                  )}

                  <div className="flex flex-col gap-4">
                    {user && userPermissions?.settings && (
                      <button 
                        onClick={() => { setActiveTab('settings'); if(window.innerWidth < 1024) setIsCollapsed(true); }}
                        title="Réglages"
                        className={`flex items-center gap-6 transition-all duration-300 group relative outline-none ${isCollapsed ? 'justify-center p-0' : 'px-0'} ${
                          activeTab === 'settings' ? 'text-black' : 'text-luxury hover:text-black'
                        }`}
                      >
                         <Settings size={18} className={`transition-all duration-700 ${activeTab === 'settings' ? 'rotate-90 opacity-100' : 'group-hover:rotate-90 opacity-40 group-hover:opacity-100'}`} />
                         {!isCollapsed && <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-nowrap animate-fade-up">Réglages</span>}
                      </button>
                    )}

                    <button 
                      onClick={logout}
                      title="Déconnexion"
                      className={`flex items-center gap-6 transition-all duration-300 group relative outline-none ${isCollapsed ? 'justify-center p-0' : 'px-0'} text-red-500/40 hover:text-red-600`}
                    >
                       <LogOut size={18} />
                       {!isCollapsed && <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-nowrap animate-fade-up">Déconnexion</span>}
                    </button>
                  </div>
               </div>
            </aside>

            <div className="flex-1 flex flex-col bg-background min-w-0">
               <header className="px-6 lg:px-12 py-4 lg:py-6 flex justify-between items-center border-b border-steel bg-white/80 backdrop-blur-md sticky top-0 z-20">
                  <div className="flex items-center gap-4 lg:gap-0">
                     <div className="space-y-0.5 lg:space-y-1">
                        <p className="text-[8px] lg:text-[9px] text-luxury font-bold tracking-[0.2em] uppercase">{salon_name}</p>
                        <h1 className="text-xl lg:text-3xl text-editorial-title truncate max-w-[150px] sm:max-w-none">
                          {activeTab === 'pos' && 'Point de Vente'}
                          {activeTab === 'clients' && 'Clientèle'}
                          {activeTab === 'dashboard' && 'Analyses'}
                          {activeTab === 'agenda' && 'Agenda Elite'}
                          {activeTab === 'settings' && 'Configuration'}
                        </h1>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-4 md:gap-8">
                     <DigitalClock />
                     <QuickCommand 
                        onSelectClient={handleQuickClientSelect}
                        onOpenNewClient={() => {
                           setSelectedClientForPOS(null);
                           setIsQuickAddMode(true);
                           setActiveTab('pos');
                        }}
                     />
                     <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-right border-r border-steel pr-4 md:pr-6 hidden sm:block">
                           <p className="text-[8px] lg:text-[9px] text-luxury font-bold uppercase tracking-widest">
                              {user?.role === 'admin' ? 'ADMINISTRATEUR' : user?.role === 'gerant' ? 'GÉRANT SALON' : 'COLLABORATEUR'}
                           </p>
                           <p className="font-serif text-sm lg:text-base italic leading-tight">{user?.name || 'Utilisateur'}</p>
                        </div>
                        <div className="w-8 h-8 lg:w-12 lg:h-12 bg-black flex items-center justify-center text-white border border-black transition-all overflow-hidden group/user-avatar">
                            {user?.avatar ? (
                               <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                               <img 
                                 src="/Coupes_BarberShop_PNG/coupe_1.png" 
                                 className="w-5 h-5 lg:w-7 lg:h-7 object-contain grayscale invert opacity-40 group-hover/user-avatar:opacity-100 transition-all" 
                                 alt="User"
                               />
                            )}
                         </div>
                     </div>
                  </div>
               </header>
               
               <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-12 pb-16 lg:pb-20 bg-background-soft custom-scrollbar">
                  {activeTab === 'pos' && userPermissions?.pos && <POSModule />}
                  {activeTab === 'clients' && userPermissions?.clients && <ClientsModule />}
                  {activeTab === 'dashboard' && userPermissions?.dashboard && <DashboardModule />}
                  {activeTab === 'agenda' && userPermissions?.agenda && <AgendaModule />}
                  {activeTab === 'settings' && userPermissions?.settings && <SettingsModule onCollapseSidebar={setIsCollapsed} />}
               </main>
            </div>

            <LiveQueueWidget />
        </div>
      )}
    </LicenseGuard>
  );
}

export default App;
