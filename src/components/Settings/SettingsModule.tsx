import React, { useState, useRef } from 'react';
import { Store, Scissors, Users, Globe, ShieldCheck, Save, Plus, Trash2, Image as ImageIcon, Phone, Mail, Check, Key, User as UserIcon, ShieldOff, Lock, Pencil, Eye, EyeOff, RefreshCcw, Link as LinkIcon, ScrollText, Clock } from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useStaffStore } from '@/store/useStaffStore';
import { useAuthStore, type RolePermissions } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getLogs, clearAuditLogs, type AuditLog } from '@/lib/auditService';
import type { JobSkill, SystemRole } from '@/types';
// Nouvelles Sections Modulaires
import { SessionSection } from './sections/SessionSection';
import { LicenseSection } from './sections/LicenseSection';
import { MaintenanceSection } from './sections/MaintenanceSection';
import { AuditSection } from './sections/AuditSection';

// Importation des visuels par défaut (Presets)
import haircutImg from '@/assets/services/haircut.png';
import beardImg from '@/assets/services/beard.png';
import facialImg from '@/assets/services/facial.png';
import shampooImg from '@/assets/services/shampoo.png';

export const SettingsModule: React.FC = () => {
   const [activeSection, setActiveSection] = useState<'general' | 'services' | 'staff' | 'security' | 'audit' | 'session' | 'license' | 'maintenance'>('general');
   const { services, addService, removeService, updateService } = useServiceStore();
   const { staff, addStaff, removeStaff, updateStaff, toggleBlock } = useStaffStore();
   const { showAlert, showToast } = useNotificationStore();
   const { user, permissions, updatePermissions } = useAuthStore();
   const settings = useSettingsStore();
   const updateSalonSettings = useSettingsStore((s) => s.updateSettings);
   const resetSalonSettings = useSettingsStore((s) => s.resetSettings);

   // États pour le formulaire Prestations
   const [showAddModal, setShowAddModal] = useState(false);
   const [newName, setNewName] = useState('');
   const [newPrice, setNewPrice] = useState('');
   const [selectedImage, setSelectedImage] = useState<string>(haircutImg);
   const [customImage, setCustomImage] = useState<string | null>(null);
   const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

   // États pour le formulaire Équipe
   const [showStaffModal, setShowStaffModal] = useState(false);
   const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
   const [staffName, setStaffName] = useState('');
   const [staffPhone, setStaffPhone] = useState('');
   const [staffEmail, setStaffEmail] = useState('');
   const [staffSkills, setStaffSkills] = useState<JobSkill[]>([]);
   const [staffSystemRole, setStaffSystemRole] = useState<SystemRole>('employe');
   const [staffGender, setStaffGender] = useState<'homme' | 'femme'>('homme');
   const [staffAvatar, setStaffAvatar] = useState<string | null>(null);
   const [staffIsBlocked, setStaffIsBlocked] = useState(false);
   const [staffBlockingReason, setStaffBlockingReason] = useState('');
   const [staffError, setStaffError] = useState<string | null>(null);
   const [staffPassword, setStaffPassword] = useState('');
   
   // États pour la visibilité des mots de passe
   const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
   const [showModalPassword, setShowModalPassword] = useState(false);

   // Audit Logs
   const [logs, setLogs] = useState<AuditLog[]>([]);
   const [isLogsLoading, setIsLogsLoading] = useState(false);

   const fileInputRef = useRef<HTMLInputElement>(null);
   const staffFileInputRef = useRef<HTMLInputElement>(null);
   const logoInputRef = useRef<HTMLInputElement>(null);

   const JOB_SKILLS: { key: JobSkill; label: string }[] = [
      { key: 'barbier', label: 'Maître Barbier' },
      { key: 'coiffeur', label: 'Coiffeur-Visagiste' },
      { key: 'masseur', label: 'Praticien Bien-être' },
      { key: 'facialiste', label: 'Soins Esthétiques' },
      { key: 'onglerie', label: 'Expert Onglerie' },
   ];

   const SYSTEM_ROLES: { key: SystemRole; label: string; desc: string }[] = [
      { key: 'admin', label: 'Administrateur', desc: 'Accès total au système et réglages' },
      { key: 'gerant', label: 'Gérant', desc: 'Gestion opérationnelle, stock et équipe' },
      { key: 'employe', label: 'Employé', desc: 'Accès limité au POS et file d\'attente' },
   ];

   const PRESETS = [
      { name: 'Coupe', url: haircutImg },
      { name: 'Barbe', url: beardImg },
      { name: 'Soin', url: facialImg },
      { name: 'Shampooing', url: shampooImg },
   ];

   const handleAddService = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newName && newPrice) {
         const serviceData = {
            name: newName,
            price: parseInt(newPrice),
            image: customImage || selectedImage
         };

         try {
            if (editingServiceId) {
               await updateService(editingServiceId, serviceData);
               showToast('Prestation mise à jour', 'success');
            } else {
               await addService(serviceData);
               showToast('Nouvelle prestation ajoutée', 'success');
            }

            resetServiceForm();
            setShowAddModal(false);
         } catch (err) {
            showToast('Erreur lors de l\'enregistrement', 'error');
         }
      }
   };

   const resetServiceForm = () => {
      setNewName('');
      setNewPrice('');
      setSelectedImage(haircutImg);
      setCustomImage(null);
      setEditingServiceId(null);
   };

   const handleEditService = (service: any) => {
      setEditingServiceId(service.id);
      setNewName(service.name);
      setNewPrice(service.price.toString());
      if (PRESETS.find(p => p.url === service.image)) {
         setSelectedImage(service.image);
         setCustomImage(null);
      } else {
         setCustomImage(service.image);
      }
      setShowAddModal(true);
   };

   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'service' | 'staff' | 'logo') => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = () => {
            if (target === 'service') {
               setCustomImage(reader.result as string);
            } else if (target === 'staff') {
               setStaffAvatar(reader.result as string);
            } else if (target === 'logo') {
               updateSalonSettings({ salon_logo: reader.result as string });
               showToast('Logo du salon mis à jour', 'success');
            }
         };
         reader.readAsDataURL(file);
      }
   };

   const handleStaffSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setStaffError(null);

      if (staffName && (staffSkills.length > 0 || staffSystemRole === 'gerant')) {
         let formattedPhone = staffPhone.trim();
         if (formattedPhone && !formattedPhone.startsWith('+')) {
            formattedPhone = '+223' + formattedPhone;
         }

          const staffData: any = {
            name: staffName,
            phone: formattedPhone,
            email: staffEmail,
            skills: staffSkills,
            systemRole: staffSystemRole,
            gender: staffGender,
            isAvailable: true,
            password: staffPassword
         };

         if (staffAvatar) {
            staffData.avatar = staffAvatar;
         }

         try {
            if (editingStaffId) {
               await updateStaff(editingStaffId, staffData);
               showToast('Collaborateur mis à jour', 'success');
            } else {
               await addStaff(staffData);
               showToast('Nouveau membre ajouté', 'success');
            }

            resetStaffForm();
            setShowStaffModal(false);
         } catch (err: any) {
            setStaffError(err.message || 'Une erreur est survenue lors de l\'enregistrement');
         }
      } else {
         showToast(
            !staffName 
               ? 'Veuillez remplir le nom' 
               : 'Veuillez sélectionner au moins une compétence pour ce rôle', 
            'info'
         );
      }
   };

   const resetStaffForm = () => {
      setStaffName('');
      setStaffPhone('');
      setStaffEmail('');
      setStaffSkills([]);
      setStaffSystemRole('employe');
      setStaffGender('homme');
      setStaffAvatar(null);
      setStaffIsBlocked(false);
      setStaffBlockingReason('');
      setStaffError(null);
      setStaffPassword('');
      setEditingStaffId(null);
      setShowModalPassword(false);
   };

   const handleEditStaff = (member: any) => {
      setEditingStaffId(member.id);
      setStaffName(member.name);
      setStaffPhone(member.phone || '');
      setStaffEmail(member.email || '');
      setStaffSkills(member.skills);
      setStaffSystemRole(member.systemRole);
      setStaffGender(member.gender || 'homme');
      setStaffAvatar(member.avatar || null);
      setStaffIsBlocked(member.isBlocked || false);
      setStaffBlockingReason(member.blockingReason || '');
      setStaffPassword(member.password || '');
      setShowModalPassword(false);
      setShowStaffModal(true);
   };

   const confirmDeleteStaff = (id: string, name: string) => {
      showAlert({
         title: 'Retrait du personnel',
         message: `Voulez-vous vraiment retirer ${name} de l'équipe Barber Shop ?`,
         confirmLabel: 'RETIRER',
         cancelLabel: 'ANNULER',
         isConfirm: true,
         onConfirm: () => {
            removeStaff(id);
            showToast('Membre retiré avec succès', 'info');
         }
      });
   };

   const confirmBlockStaff = (member: any) => {
      if (member.isBlocked) {
         toggleBlock(member.id);
         showToast(`${member.name} a été débloqué`, 'success');
      } else {
         showAlert({
            title: 'Bloquer le compte',
            message: `Voulez-vous suspendre l'accès de ${member.name} ? L'employé ne pourra plus se connecter.`,
            confirmLabel: 'BLOQUER L\'ACCÈS',
            cancelLabel: 'ANNULER',
            isConfirm: true,
            onConfirm: () => {
               toggleBlock(member.id, 'Accès suspendu par la direction');
               showToast('Compte bloqué avec succès', 'info');
            }
         });
      }
   };

   const confirmDelete = (serviceId: string) => {
      showAlert({
         title: 'Confirmation',
         message: 'Cette action est irréversible et retirera la prestation du catalogue.',
         confirmLabel: 'SUPPRIMER DÉFINITIVEMENT',
         cancelLabel: 'ANNULER',
         isConfirm: true,
         onConfirm: () => {
            removeService(serviceId);
            showToast('Prestation supprimée avec succès', 'info');
         }
      });
   };

   const fetchAuditLogs = async () => {
      setIsLogsLoading(true);
      const data = await getLogs(200);
      setLogs(data);
      setIsLogsLoading(false);
   };
 
   React.useEffect(() => {
      if (activeSection === 'audit') {
         fetchAuditLogs();
      }
   }, [activeSection]);

   return (
      <>
         <div className="flex flex-col lg:flex-row h-full gap-8 lg:gap-16 animate-fade-up">
            <aside className="w-full lg:w-56 flex flex-row lg:flex-col gap-2 lg:gap-1 lg:border-r border-steel lg:pr-6 overflow-x-auto pb-4 lg:pb-0 hide-scrollbar">
               <p className="hidden lg:block text-black/20 text-[10px] font-bold tracking-[0.2em] mb-4 shrink-0 px-4">CONFIGURATION</p>
               
               {/* GROUPE SALON */}
               {[
                  { id: 'general', label: 'Établissement', icon: Store },
                  { id: 'services', label: 'Prestations', icon: Scissors },
                  { id: 'staff', label: 'Équipe Elite', icon: Users },
               ].map((tab) => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveSection(tab.id as any)}
                     className={`flex items-center gap-3 lg:gap-4 px-4 py-3 lg:py-3.5 transition-all shrink-0 whitespace-nowrap ${activeSection === tab.id
                           ? 'bg-black text-white'
                           : 'hover:bg-background-soft text-black/60'
                        }`}
                  >
                     <tab.icon size={16} />
                     <span className="text-[9px] lg:text-[9px] uppercase font-bold tracking-widest">{tab.label}</span>
                  </button>
               ))}

               <div className="hidden lg:block h-px bg-steel my-4 mx-4 opacity-50" />
               <p className="hidden lg:block text-black/20 text-[10px] font-bold tracking-[0.2em] mb-4 shrink-0 px-4">UTILISATEUR</p>

               {[
                  { id: 'session', label: 'Sécurité Session', icon: Clock },
                  { id: 'security', label: 'Habilitations', icon: ShieldCheck, adminOnly: true },
               ].filter(tab => !tab.adminOnly || (user?.role === 'admin' || user?.role === 'gerant')).map((tab) => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveSection(tab.id as any)}
                     className={`flex items-center gap-3 lg:gap-4 px-4 py-3 lg:py-3.5 transition-all shrink-0 whitespace-nowrap ${activeSection === tab.id
                           ? 'bg-black text-white'
                           : 'hover:bg-background-soft text-black/60'
                        }`}
                  >
                     <tab.icon size={16} />
                     <span className="text-[9px] lg:text-[9px] uppercase font-bold tracking-widest">{tab.label}</span>
                  </button>
               ))}

               <div className="hidden lg:block h-px bg-steel my-4 mx-4 opacity-50" />
               <p className="hidden lg:block text-black/20 text-[10px] font-bold tracking-[0.2em] mb-4 shrink-0 px-4">ADMINISTRATION</p>

               {[
                  { id: 'audit', label: 'Journal Logs', icon: ScrollText, adminOnly: true },
                  { id: 'license', label: 'Contrat Licence', icon: ShieldCheck, adminOnly: true },
                  { id: 'maintenance', label: 'Maintenance Système', icon: RefreshCcw, adminOnly: true },
               ].filter(tab => !tab.adminOnly || (user?.role === 'admin' || user?.role === 'gerant')).map((tab) => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveSection(tab.id as any)}
                     className={`flex items-center gap-3 lg:gap-4 px-4 py-3 lg:py-3.5 transition-all shrink-0 whitespace-nowrap ${activeSection === tab.id
                           ? 'bg-black text-white'
                           : 'hover:bg-background-soft text-black/60'
                        }`}
                  >
                     <tab.icon size={16} />
                     <span className="text-[9px] lg:text-[9px] uppercase font-bold tracking-widest">{tab.label}</span>
                  </button>
               ))}
            </aside>

            <main className="flex-1 overflow-y-auto pr-0 lg:pr-4 custom-scrollbar">
                {activeSection === 'general' && (
                  <div className="space-y-10 lg:space-y-16 animate-fade-up">
                     <section className="space-y-10 text-black">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-black pb-8 gap-4">
                           <div className="space-y-1">
                              <p className="text-[9px] text-luxury font-bold tracking-[0.2em] uppercase">Configuration</p>
                              <h3 className="text-3xl lg:text-4xl text-editorial-title">Identité Du Salon</h3>
                           </div>
                           <div className="flex flex-col sm:flex-row items-end gap-3">
                              <button 
                                 onClick={() => {
                                    showAlert({
                                       title: 'Réinitialisation',
                                       message: 'Voulez-vous restaurer l\'identité visuelle et les informations d\'origine de l\'application ?',
                                       confirmLabel: 'RÉINITIALISER TOUT',
                                       cancelLabel: 'ANNULER',
                                       isConfirm: true,
                                       onConfirm: () => {
                                          resetSalonSettings();
                                          showToast('Identité réinitialisée', 'info');
                                       }
                                    });
                                 }}
                                 className="flex items-center gap-2 px-6 py-3 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest w-full sm:w-auto justify-center"
                              >
                                 <RefreshCcw size={14} /> <span>Réinitialiser</span>
                              </button>
                              <button 
                                 onClick={() => showToast('Modifications enregistrées automatiquement', 'success')}
                                 className="btn-premium py-3 px-8 w-full sm:w-auto flex items-center justify-center gap-3"
                              >
                                 <Save size={16} /> <span>ENREGISTRER</span>
                              </button>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                           {/* LOGO MANAGEMENT */}
                           <div className="space-y-6">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-luxury">Logo Officiel</label>
                              <div 
                                 className={`aspect-square border border-dashed border-black/20 flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden ${settings.salon_logo_theme === 'dark' ? 'bg-black' : 'bg-background-soft'}`}
                                 onClick={() => logoInputRef.current?.click()}
                              >
                                 {settings.salon_logo ? (
                                    <img src={settings.salon_logo} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" alt="Logo" />
                                 ) : (
                                    <div className={`flex flex-col items-center gap-3 ${settings.salon_logo_theme === 'dark' ? 'text-white/40' : 'text-black/20'}`}>
                                       <ImageIcon size={40} strokeWidth={1} />
                                       <span className="text-[8px] font-bold uppercase tracking-widest">Importer le logo</span>
                                    </div>
                                 )}
                                 <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Pencil className="text-white" size={24} />
                                 </div>
                              </div>
                              <div className="flex gap-2">
                                 <button 
                                    onClick={() => updateSalonSettings({ salon_logo_theme: 'light' })}
                                    className={`flex-1 py-2 text-[8px] font-bold uppercase border transition-all ${settings.salon_logo_theme === 'light' ? 'bg-black text-white border-black' : 'border-black/5 hover:border-black'}`}
                                 >
                                    Fond Clair
                                 </button>
                                 <button 
                                    onClick={() => updateSalonSettings({ salon_logo_theme: 'dark' })}
                                    className={`flex-1 py-2 text-[8px] font-bold uppercase border transition-all ${settings.salon_logo_theme === 'dark' ? 'bg-white text-black border-white ring-1 ring-black' : 'border-black/5 hover:border-black'}`}
                                 >
                                    Fond Noir
                                 </button>
                              </div>
                           </div>

                           {/* TEXT INFO */}
                           <div className="lg:col-span-2 space-y-10">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-luxury">NOM COMMERCIAL</label>
                                    <input 
                                       className="w-full bg-transparent border-b border-black/20 focus:border-black py-3 text-xl font-serif italic outline-none transition-all" 
                                       value={settings.salon_name}
                                       onChange={(e) => updateSalonSettings({ salon_name: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-luxury">DEVISE SYSTÈME</label>
                                    <select 
                                       className="w-full bg-transparent border-b border-black/20 focus:border-black py-3 text-xl font-serif italic outline-none flex appearance-none"
                                       value={settings.currency}
                                       onChange={(e) => updateSalonSettings({ currency: e.target.value })}
                                    >
                                       <option value="FCFA">FCFA (Franc CFA)</option>
                                       <option value="€">EURO (€)</option>
                                       <option value="$">DOLLAR ($)</option>
                                    </select>
                                 </div>
                                 <div className="space-y-3 md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-luxury">SLOGAN / TAGLINE</label>
                                    <input 
                                       className="w-full bg-transparent border-b border-black/20 focus:border-black py-3 text-lg font-serif italic outline-none transition-all" 
                                       value={settings.salon_slogan}
                                       onChange={(e) => updateSalonSettings({ salon_slogan: e.target.value })}
                                       placeholder="L'excellence au naturel..."
                                    />
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6">
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-luxury">CONTACT TÉLÉPHONE</label>
                                    <div className="relative">
                                       <Phone size={14} className="absolute left-0 bottom-4 opacity-40" />
                                       <input 
                                          className="w-full bg-transparent border-b border-black/20 focus:border-black py-3 pl-8 text-lg font-serif italic outline-none" 
                                          value={settings.phone}
                                          onChange={(e) => updateSalonSettings({ phone: e.target.value })}
                                       />
                                    </div>
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-luxury">ADRESSE PHYSIQUE</label>
                                    <div className="relative">
                                       <Store size={14} className="absolute left-0 bottom-4 opacity-40" />
                                       <input 
                                          className="w-full bg-transparent border-b border-black/20 focus:border-black py-3 pl-8 text-lg font-serif italic outline-none" 
                                          value={settings.address}
                                          onChange={(e) => updateSalonSettings({ address: e.target.value })}
                                       />
                                    </div>
                                 </div>
                                 <div className="space-y-3 md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-luxury">SITE WEB / PLATEFORME</label>
                                    <div className="relative">
                                       <LinkIcon size={14} className="absolute left-0 bottom-4 opacity-40" />
                                       <input 
                                          className="w-full bg-transparent border-b border-black/20 focus:border-black py-3 pl-8 text-lg font-serif italic outline-none" 
                                          value={settings.website}
                                          onChange={(e) => updateSalonSettings({ website: e.target.value })}
                                          placeholder="Ex: www.votre-salon.com"
                                       />
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </section>

                     <section className="space-y-6 lg:space-y-8 p-10 bg-black text-white border border-black group">
                        <div className="flex justify-between items-center">
                           <p className="text-luxury text-white/40">SYNCHRONISATION GÉOGRAPHIQUE</p>
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-8">
                           <Globe size={48} strokeWidth={1} className="shrink-0 group-hover:rotate-12 transition-transform duration-1000" />
                           <div>
                              <p className="text-xl lg:text-2xl font-serif italic">Fuseau Horaire : Bamako (GMT)</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Horodatage automatique des prestations activé</p>
                           </div>
                        </div>
                     </section>
                  </div>
               )}

               {activeSection === 'services' && (
                  <div className="space-y-8">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-steel pb-6 text-black gap-4">
                        <div className="space-y-1">
                           <p className="text-[9px] text-luxury font-bold tracking-[0.2em] uppercase">CATALOGUE</p>
                           <h3 className="text-2xl lg:text-3xl text-editorial-title">Gestion des Prestations</h3>
                        </div>
                        <button
                           onClick={() => setShowAddModal(true)}
                           className="flex items-center gap-2 px-6 py-2 border border-black hover:bg-black hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest bg-white w-full sm:w-auto justify-center"
                        >
                           <Plus size={14} /> AJOUTER UNE PRESTATION
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                        {services.map((service, i) => (
                           <div key={service.id} className="flex flex-col sm:flex-row justify-between items-center p-6 bg-white border border-black/10 hover:border-black transition-all group overflow-hidden gap-6">
                              <div className="flex items-center gap-6 lg:gap-8 w-full">
                                 <div className="w-16 h-16 lg:w-20 lg:h-20 bg-background-soft overflow-hidden shrink-0 border border-steel relative">
                                    {service.image ? (
                                       <img src={service.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={service.name} />
                                    ) : (
                                       <div className="w-full h-full flex items-center justify-center bg-background-soft">
                                          <Scissors size={24} className="opacity-20" />
                                       </div>
                                    )}
                                 </div>
                                 <div className="space-y-1 overflow-hidden">
                                    <span className="text-[9px] text-luxury font-bold">PRESTATION #{String(i + 1).padStart(2, '0')}</span>
                                    <p className="text-lg lg:text-xl font-serif italic truncate text-black">{service.name}</p>
                                 </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-3 lg:gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0">
                                 <p className="text-lg lg:text-xl font-bold whitespace-nowrap text-black mr-4">{service.price.toLocaleString()} FCFA</p>
                                 <div className="flex gap-2">
                                    <button onClick={() => handleEditService(service)} className="p-2 border border-black/10 hover:border-black transition-all text-black">
                                       <Pencil size={16} />
                                    </button>
                                    <button onClick={() => confirmDelete(service.id)} className="p-2 border border-black/10 hover:border-red-500 hover:text-red-500 transition-all text-black">
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {activeSection === 'staff' && (
                  <div className="space-y-8">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-steel pb-6 text-black gap-4">
                        <div className="space-y-1">
                           <p className="text-[9px] text-luxury font-bold tracking-[0.2em] uppercase">RESSOURCES HUMAINES</p>
                           <h3 className="text-2xl lg:text-3xl text-editorial-title">L'Équipe Elite</h3>
                        </div>
                        <button
                           onClick={() => setShowStaffModal(true)}
                           className="flex items-center gap-2 px-6 py-2 border border-black hover:bg-black hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest bg-white w-full sm:w-auto justify-center"
                        >
                           <Plus size={14} /> AJOUTER UN COLLABORATEUR
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {staff.map((member) => (
                           <div key={member.id} className={`bg-white border p-8 relative group hover:shadow-xl transition-all overflow-hidden ${member.isBlocked ? 'border-red-500/50 bg-red-50/10' : 'border-black'}`}>
                              {member.isBlocked && (
                                 <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 flex items-center gap-2 z-10">
                                    <ShieldOff size={10} />
                                    <span className="text-[8px] font-bold uppercase tracking-widest">Compte Bloqué</span>
                                 </div>
                              )}
                              
                              <div className="flex justify-between items-start mb-8 text-black">
                                 <div className="flex gap-4 items-center">
                                    <div className={`w-16 h-16 bg-background-soft overflow-hidden flex items-center justify-center text-2xl font-serif italic border relative ${member.isBlocked ? 'border-red-500/20' : 'border-black'}`}>
                                       {member.avatar ? (
                                          <img src={member.avatar} className={`w-full h-full object-cover ${member.isBlocked ? 'grayscale opacity-40' : ''}`} alt={member.name} />
                                       ) : (
                                          <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-8 h-8 object-contain grayscale opacity-20" />
                                       )}
                                    </div>
                                    <div className="space-y-1">
                                       <h4 className={`text-xl lg:text-2xl font-serif italic ${member.isBlocked ? 'text-black/40' : ''}`}>{member.name}</h4>
                                       <div className="flex items-center gap-2">
                                          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
                                             member.isBlocked ? 'border-red-500/30 text-red-500/50' :
                                             member.systemRole === 'admin' ? 'border-red-500 text-red-500' :
                                             member.systemRole === 'gerant' ? 'border-luxury text-luxury' :
                                             'border-black/20 text-black/40'
                                          }`}>
                                             {member.isBlocked ? 'Suspendu' : member.systemRole}
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex gap-2">
                                    <button 
                                        onClick={() => setVisiblePasswords(prev => ({ ...prev, [member.id]: !prev[member.id] }))}
                                        title={visiblePasswords[member.id] ? "Masquer le mot de passe" : "Voir le mot de passe"}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-black/20 hover:text-black transition-all"
                                     >
                                        {visiblePasswords[member.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                     </button>
                                    <button 
                                      onClick={() => confirmBlockStaff(member)} 
                                      title={member.isBlocked ? 'Débloquer' : 'Bloquer'}
                                      className={`opacity-0 group-hover:opacity-100 p-2 transition-all ${member.isBlocked ? 'text-red-500 hover:scale-110' : 'text-black/20 hover:text-red-500'}`}
                                    >
                                       {member.isBlocked ? <Lock size={16} /> : <ShieldOff size={16} />}
                                    </button>
                                    <button onClick={() => handleEditStaff(member)} className="opacity-0 group-hover:opacity-100 p-2 text-black/20 hover:text-black transition-all" title="Modifier le profil">
                                       <Pencil size={16} />
                                    </button>
                                    
                                    {/* SEUL L'ADMIN PEUT SUPPRIMER (Y COMPRIS UN AUTRE ADMIN) */}
                                    {user?.role === 'admin' && member.id !== user.id && (
                                       <button 
                                          onClick={() => confirmDeleteStaff(member.id, member.name)} 
                                          className="opacity-0 group-hover:opacity-100 p-2 text-black/20 hover:text-red-500 transition-all"
                                          title="Supprimer définitivement"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    )}
                                 </div>
                              </div>

                              {member.isBlocked && member.blockingReason && (
                                 <div className="mb-4 p-3 bg-red-100/50 border-l-2 border-red-500">
                                    <p className="text-[9px] font-bold text-red-800 uppercase tracking-widest mb-1">Raison du blocage</p>
                                    <p className="text-[10px] italic text-red-700/80">{member.blockingReason}</p>
                                 </div>
                              )}

                              <div className={`space-y-6 ${member.isBlocked ? 'opacity-30' : ''}`}>
                                 <div className="space-y-2">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-black/40">COMPÉTENCES MÉTIERS</p>
                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                       {member.skills.map((skill: any) => (
                                          <span key={skill} className="px-3 py-1 bg-background-soft border border-black/5 font-bold uppercase tracking-tighter text-black">
                                             {JOB_SKILLS.find(ks => ks.key === skill)?.label}
                                          </span>
                                       ))}
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-steel pt-6 text-black/60 font-serif italic text-xs">
                                    <div className="flex items-center gap-3 text-black/60"><Phone size={14} strokeWidth={1.5} /> {member.phone || 'N/A'}</div>
                                    <div className="flex items-center gap-3 text-black/60"><Mail size={14} strokeWidth={1.5} /> <span className="truncate">{member.email || 'N/A'}</span></div>
                                    
                                    {/* AFFICHAGE DU MOT DE PASSE (ACCÈS ADMIN) */}
                                    {user?.role === 'admin' && (
                                       <div className="flex items-center gap-3 text-black/60 col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-steel/10">
                                          <Key size={14} strokeWidth={1.5} className="text-luxury" />
                                          <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Accès :</span>
                                          <span className="font-sans font-bold text-black tracking-wider text-[10px]">
                                             {visiblePasswords[member.id] ? member.password : '••••••••'}
                                          </span>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {activeSection === 'security' && (user?.role === 'admin' || user?.role === 'gerant') && (
                  <div className="space-y-12">
                     <div className="border-b border-steel pb-6 text-black">
                        <p className="text-[9px] text-luxury font-bold tracking-[0.2em] uppercase mb-1">ACCÈS ET PERMISSIONS</p>
                        <h3 className="text-2xl lg:text-3xl text-editorial-title">Habilitations & Modules</h3>
                     </div>

                     {/* Tableau de Gestion des Droits */}
                     <section className="space-y-6">
                        <div className="bg-black text-white p-6 flex justify-between items-center">
                           <div className="flex items-center gap-4">
                              <ShieldCheck size={24} className="text-luxury" />
                              <h4 className="text-sm font-bold uppercase tracking-widest text-nowrap">Matrice des Droits d'Accès</h4>
                           </div>
                           <p className="text-[10px] italic opacity-40 hidden sm:block">Configuration des rôles système</p>
                        </div>

                        <div className="overflow-x-auto">
                           <table className="w-full border-collapse text-black">
                              <thead>
                                 <tr className="border-b border-steel text-[10px] font-bold uppercase tracking-widest bg-background-soft">
                                    <th className="p-4 text-left">Modules Globaux</th>
                                    <th className="p-4 text-center">Admin</th>
                                    <th className="p-4 text-center">Gérant</th>
                                    <th className="p-4 text-center">Employé</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {[
                                    { id: 'pos', label: 'Caisse (Point de Vente)' },
                                    { id: 'agenda', label: 'Agenda & Rendez-vous' },
                                    { id: 'clients', label: 'Gestion Clientèle' },
                                    { id: 'dashboard', label: 'Analyses & Stats' },
                                    { id: 'settings', label: 'Réglages Système' },
                                 ].map((module) => (
                                    <tr key={module.id} className="border-b border-steel/50 hover:bg-background-soft/30 transition-colors">
                                       <td className="p-4">
                                          <p className="font-serif italic text-lg">{module.label}</p>
                                          <p className="text-[8px] font-bold uppercase tracking-widest text-luxury/50">{module.id}</p>
                                       </td>
                                       {['admin', 'gerant', 'employe'].map((role) => {
                                          const moduleKey = module.id as keyof RolePermissions;
                                          const isChecked = permissions[role as SystemRole][moduleKey];
                                          
                                          // SECURITÉ : On empêche de modifier l'admin
                                          // SECURITÉ : Un gérant ne peut pas se retirer ses propres droits de réglages
                                          const isDisabled = role === 'admin' || (role === 'gerant' && moduleKey === 'settings' && user?.role === 'gerant');

                                          return (
                                             <td key={role} className="p-4 text-center">
                                                <button 
                                                   disabled={isDisabled}
                                                   onClick={() => {
                                                      const currentPerms = permissions[role as SystemRole];
                                                      updatePermissions(role as SystemRole, {
                                                         ...currentPerms,
                                                         [moduleKey]: !isChecked
                                                      });
                                                      showToast(`Permission mise à jour pour ${role}`, 'success');
                                                   }}
                                                   className={`w-6 h-6 border ${isChecked ? 'bg-black border-black text-white' : 'border-steel'} inline-flex items-center justify-center transition-all ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
                                                >
                                                   {isChecked && <Check size={14} />}
                                                </button>
                                             </td>
                                          );
                                       })}
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </section>

                     <div className="grid gap-6 opacity-40 grayscale">
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-2 italic">Aperçu des rôles actuels</p>
                        {SYSTEM_ROLES.map((role: any) => (
                           <div key={role.key} className="flex gap-8 p-6 border border-black/10 items-center text-black">
                              <div className={`w-10 h-10 flex items-center justify-center border ${role.key === 'admin' ? 'bg-black text-white' : 'bg-background-soft'}`}>
                                 {role.key === 'admin' ? <ShieldCheck size={20} /> : role.key === 'gerant' ? <Key size={20} /> : <UserIcon size={20} />}
                              </div>
                              <div className="flex-1">
                                 <h4 className="text-xs font-bold uppercase tracking-widest mb-1">{role.label}</h4>
                                 <p className="text-[10px] font-serif italic"> {role.desc} </p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

                {activeSection === 'session' && <SessionSection />}
                {activeSection === 'license' && <LicenseSection />}
                {activeSection === 'maintenance' && <MaintenanceSection />}

                {activeSection === 'audit' && (user?.role === 'admin' || user?.role === 'gerant') && (
                   <AuditSection 
                      logs={logs} 
                      isLoading={isLogsLoading} 
                      onClear={() => {
                         showAlert({
                            title: 'Nettoyage du Journal',
                            message: 'Voulez-vous effacer définitivement tout l\'historique des actions ? Cette action est irréversible.',
                            confirmLabel: 'EFFACER TOUT',
                            cancelLabel: 'ANNULER',
                            isConfirm: true,
                            onConfirm: async () => {
                               await clearAuditLogs(user);
                               fetchAuditLogs();
                               showToast('Journal effacé', 'info');
                            }
                         });
                      }}
                   />
                )}
             </main>
         </div>

         {/* Modals Container */}
         {showAddModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm p-4 sm:p-6 animate-fade-up">
               <div className="w-full max-w-2xl bg-white border border-black p-6 sm:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar text-black">
                  <button onClick={() => { setShowAddModal(false); resetServiceForm(); }} className="absolute top-6 right-6 p-2 hover:rotate-90 transition-transform"><Plus size={24} className="rotate-45" /></button>
                  <p className="text-luxury mb-2 uppercase tracking-widest text-[10px]">Catalogue</p>
                  <h2 className="text-3xl lg:text-4xl text-editorial-title mb-8">{editingServiceId ? 'Modifier la Prestation' : 'Nouvelle Prestation'}</h2>
                  <form onSubmit={handleAddService} className="space-y-10">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                           <div className="space-y-3">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Désignation</label>
                              <input autoFocus className="w-full bg-transparent border-b border-black/20 focus:border-black px-0 py-2 text-xl font-serif italic outline-none transition-all" value={newName} onChange={e => setNewName(e.target.value)} required />
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Tarif (FCFA)</label>
                              <input className="w-full bg-transparent border-b border-black/20 focus:border-black px-0 py-2 text-xl font-bold outline-none transition-all" value={newPrice} onChange={e => setNewPrice(e.target.value.replace(/\D/g, ''))} required />
                           </div>
                        </div>
                        <div className="space-y-6">
                           <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 block">Visuel</label>
                           <div className="aspect-square bg-background-soft border border-dashed border-black/20 relative overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              {customImage || selectedImage ? <img src={customImage || selectedImage} className="w-full h-full object-cover" /> : <ImageIcon className="opacity-20" size={32} />}
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'service')} />
                           </div>
                           <div className="grid grid-cols-4 gap-2">
                              {PRESETS.map(p => (
                                 <button key={p.name} type="button" onClick={() => { setSelectedImage(p.url); setCustomImage(null); }} className={`aspect-square border ${selectedImage === p.url && !customImage ? 'border-black ring-2 ring-black ring-offset-2' : 'border-steel opacity-40'}`}>
                                    <img src={p.url} className="w-full h-full object-cover" />
                                 </button>
                              ))}
                           </div>
                        </div>
                     </div>
                     <button type="submit" className="w-full btn-premium py-5">{editingServiceId ? 'METTRE À JOUR' : 'VALIDER LA CRÉATION'}</button>
                  </form>
               </div>
            </div>
         )}

         {showStaffModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm p-4 sm:p-6 animate-fade-up">
               <div className="w-full max-w-4xl bg-white border border-black p-6 sm:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar text-black">
                  <button onClick={() => { setShowStaffModal(false); resetStaffForm(); }} className="absolute top-6 right-6 p-2 hover:rotate-90 transition-transform"><Plus size={24} className="rotate-45" /></button>
                  <p className="text-luxury mb-2 uppercase tracking-widest text-[10px]">Équipe Barber Shop</p>
                  <h2 className="text-3xl lg:text-4xl text-editorial-title mb-8">{editingStaffId ? 'Modifier un Collaborateur' : 'Nouveau Collaborateur'}</h2>
                  <form onSubmit={handleStaffSubmit} className="space-y-10">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Photo Section */}
                        <div className="space-y-6">
                           <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 block">Photo de Profil</label>
                           <div
                              onClick={() => staffFileInputRef.current?.click()}
                              className="aspect-square bg-background-soft border border-dashed border-black/20 relative overflow-hidden flex items-center justify-center cursor-pointer group/avatar"
                           >
                              {staffAvatar ? (
                                 <img src={staffAvatar} className="w-full h-full object-cover" />
                              ) : (
                                 <div className="flex flex-col items-center gap-2 opacity-20 group-hover/avatar:opacity-40 transition-opacity">
                                    <UserIcon size={40} strokeWidth={1} />
                                    <span className="text-[8px] font-bold uppercase tracking-widest">Choisir une image</span>
                                 </div>
                              )}
                              <input type="file" ref={staffFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'staff')} />
                           </div>

                           <div className="space-y-3">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Genre</label>
                              <div className="flex gap-2">
                                 {['homme', 'femme'].map(g => (
                                    <button
                                       key={g}
                                       type="button"
                                       onClick={() => setStaffGender(g as any)}
                                       className={`flex-1 py-3 border text-[9px] font-bold uppercase tracking-widest transition-all ${staffGender === g ? 'bg-black text-white border-black' : 'border-black/10'}`}
                                    >
                                       {g}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-8">
                              <div className="space-y-3">
                                 <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Nom Complet</label>
                                 <input autoFocus className="w-full bg-transparent border-b border-black/20 focus:border-black px-0 py-2 text-xl font-serif italic outline-none" value={staffName} onChange={e => setStaffName(e.target.value)} required />
                              </div>
                               <div className="space-y-3">
                                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Téléphone</label>
                                  <input 
                                     className={`w-full bg-transparent border-b ${staffError ? 'border-red-500' : 'border-black/20 focus:border-black'} px-0 py-2 text-lg font-serif italic outline-none transition-all`} 
                                     value={staffPhone} 
                                     onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9+]/g, '');
                                        setStaffPhone(val);
                                     }} 
                                  />
                                  {staffError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{staffError}</p>}
                               </div>
                              <div className="space-y-3">
                                 <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Email Professional</label>
                                 <input className="w-full bg-transparent border-b border-black/20 focus:border-black px-0 py-2 text-lg font-serif italic outline-none" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} />
                              </div>
                              <div className="space-y-3 relative">
                                 <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Mot de Passe Staff</label>
                                 <input type={showModalPassword ? "text" : "password"} placeholder="••••••••" className="w-full bg-transparent border-b border-black/20 focus:border-black px-0 py-2 text-lg font-serif italic outline-none" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} />
                                 <button 
                                    type="button" 
                                    onClick={() => setShowModalPassword(!showModalPassword)}
                                    className="absolute right-0 bottom-2 p-2 text-black/20 hover:text-black transition-all"
                                 >
                                    {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                 </button>
                                 <p className="text-[8px] opacity-20 italic">Par défaut : son nom (minuscule)</p>
                              </div>
                           </div>
                           <div className="space-y-8">
                              <div className="space-y-3">
                                 <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Grade Système</label>
                                 <div className="flex flex-col gap-2">
                                    {SYSTEM_ROLES.map((role: any) => (
                                       <button key={role.key} type="button" onClick={() => setStaffSystemRole(role.key)} className={`p-3 border text-[10px] font-bold uppercase tracking-widest text-left flex justify-between ${staffSystemRole === role.key ? 'bg-black text-white border-black' : 'border-black/10'}`}>
                                          {role.label} {staffSystemRole === role.key && <Check size={14} />}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                              <div className="space-y-3">
                                 <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Compétences {staffSystemRole === 'gerant' ? '(Optionnel)' : '(Obligatoire)'}</label>
                                 <div className="flex flex-wrap gap-2">
                                    {JOB_SKILLS.map((skill: { key: JobSkill; label: string }) => (
                                       <button key={skill.key} type="button" onClick={() => staffSkills.includes(skill.key) ? setStaffSkills(staffSkills.filter((s: JobSkill) => s !== skill.key)) : setStaffSkills([...staffSkills, skill.key])} className={`px-3 py-1 text-[8px] font-bold uppercase border ${staffSkills.includes(skill.key) ? 'bg-luxury text-white border-luxury' : 'border-black/10'}`}>
                                          {skill.label}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Section Blocage (Admin Seul) */}
                     {(user?.role === 'admin' || user?.role === 'gerant') && (
                        <div className="pt-10 border-t border-red-500/20 bg-red-50/10 p-8">
                           <div className="flex items-center gap-4 mb-6">
                              <div className={`w-10 h-10 flex items-center justify-center border ${staffIsBlocked ? 'bg-red-500 text-white border-red-500' : 'border-black/10 text-black/20'}`}>
                                 <Lock size={20} />
                              </div>
                              <div>
                                 <h4 className="text-xs font-bold uppercase tracking-widest text-red-900">Statut du Compte</h4>
                                 <p className="text-[10px] font-serif italic text-red-700/60">Suspendre ou rétablir l'accès au système</p>
                              </div>
                           </div>
                           
                           <div className="flex flex-col gap-6">
                              <label className="flex items-center gap-4 cursor-pointer group">
                                 <div 
                                    onClick={() => setStaffIsBlocked(!staffIsBlocked)}
                                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${staffIsBlocked ? 'bg-red-500' : 'bg-black/10'}`}
                                 >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${staffIsBlocked ? 'left-7' : 'left-1'}`} />
                                 </div>
                                 <span className="text-[11px] font-bold uppercase tracking-widest text-black">Compte Suspendu</span>
                              </label>

                              {staffIsBlocked && (
                                 <div className="space-y-3 animate-fade-up">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-900/60">Raison du blocage / Notes administratives</label>
                                    <textarea 
                                       className="w-full bg-white border border-red-500/20 focus:border-red-500 p-4 text-xs font-serif italic outline-none transition-all h-24 resize-none"
                                       placeholder="Précisez la raison du blocage..."
                                       value={staffBlockingReason}
                                       onChange={e => setStaffBlockingReason(e.target.value)}
                                    />
                                 </div>
                              )}
                           </div>
                        </div>
                     )}

                     <button type="submit" className="w-full btn-premium py-5">{editingStaffId ? 'MODIFIER LE PROFIL' : 'AJOUTER À L\'ÉQUIPE'}</button>
                  </form>
               </div>
            </div>
         )}
      </>
   );
};
