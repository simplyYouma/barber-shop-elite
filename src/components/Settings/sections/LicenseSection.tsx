import React from 'react';
import { ShieldCheck, Mail, Phone, Lock, Scale, AlertCircle } from 'lucide-react';

export const LicenseSection: React.FC = () => {
  return (
    <div className="space-y-10 lg:space-y-12 animate-fade-up">
      <div className="border-b border-steel pb-6 text-black">
        <p className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-40">Propriété Intellectuelle</p>
        <h3 className="text-3xl lg:text-4xl text-editorial-title">Contrat de Licence & Conditions</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Contract Area */}
        <div className="lg:col-span-8 space-y-12 pb-12">
           <section className="space-y-6">
              <div className="flex items-center gap-3 text-black">
                 <Scale size={20} className="text-luxury" />
                 <h4 className="text-sm font-bold uppercase tracking-[0.2em]">Préambule Légal</h4>
              </div>
              <div className="bg-background-soft/50 p-8 border-l-2 border-black space-y-4">
                 <p className="text-xs font-serif leading-relaxed text-black italic">
                    "Le présent contrat régit l'utilisation du logiciel de gestion Barber Shop Elite. 
                    L'installation, l'accès ou l'utilisation de ce système par l'établissement client atteste de 
                    l'acceptation pleine et entière des présentes conditions."
                 </p>
              </div>
           </section>

           <section className="space-y-8">
              <div className="flex items-center gap-3 text-black">
                 <Lock size={20} className="text-luxury" />
                 <h4 className="text-sm font-bold uppercase tracking-[0.2em]">Clause de Non-Partage & Protection</h4>
              </div>
              
              <div className="grid gap-8 text-[11px] font-serif leading-relaxed text-black/80">
                 <div className="space-y-2">
                    <p className="font-bold uppercase tracking-widest text-[9px] text-black">1. EXCLUSIVITÉ DU LOGICIEL</p>
                    <p>
                       Ce logiciel est fourni sous forme d'abonnement pour l'usage exclusif de l'établissement détenteur de la licence. 
                       Tout partage de code source, de fichiers d'installation, ou d'accès utilisateur avec des tiers non autorisés 
                       (autres salons, consultants externes, ou particuliers) constitue une violation grave du contrat.
                    </p>
                 </div>

                 <div className="space-y-2">
                    <p className="font-bold uppercase tracking-widest text-[9px] text-black">2. PROPRIÉTÉ INTELLECTUELLE</p>
                    <p>
                       Barber Shop Elite demeure la propriété exclusive du développeur original. 
                       Toute tentative de rétro-ingénierie, de décompilation ou de modification logicielle sans autorisation écrite 
                       fera l'objet de poursuites judiciaires conformément aux lois sur le droit d'auteur.
                    </p>
                 </div>

                 <div className="space-y-2">
                    <p className="font-bold uppercase tracking-widest text-[9px] text-black">3. UTILISATION VAUT ACCEPTATION</p>
                    <p className="italic">
                       Le simple fait de disposer du logiciel sur ses terminaux prouve l'acceptation expresse des termes de ce contrat. 
                       L'abonnement est personnel et non transmissible sans accord express du propriétaire.
                    </p>
                 </div>
              </div>
           </section>

           <section className="p-8 border border-black/5 bg-background-soft/30 space-y-6">
              <div className="flex items-center gap-4 text-black">
                 <AlertCircle size={20} className="text-red-500" />
                 <h5 className="text-[10px] font-bold uppercase tracking-widest">Avis de Sanction</h5>
              </div>
              <p className="text-[10px] font-serif italic text-black/60 leading-relaxed">
                 Le non-respect de ces clauses entraîne la suspension immédiate de la licence sans préavis ni remboursement, 
                 ainsi que la désactivation à distance du système de gestion pour protéger les intérêts du propriétaire.
              </p>
           </section>
        </div>

        {/* Support & Contact Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="p-8 bg-black text-white space-y-8 shadow-2xl">
              <div className="space-y-2">
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-luxury">Contact Propriétaire</span>
                 <h4 className="text-2xl font-serif italic">Youba Sokona</h4>
              </div>

              <div className="space-y-6 pt-6 border-t border-white/10">
                 <div className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-luxury transition-all">
                       <Mail size={14} />
                    </div>
                    <div>
                       <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">E-mail Officiel</p>
                       <p className="text-xs font-mono">contact@youbasokona.com</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-luxury transition-all">
                       <Phone size={14} />
                    </div>
                    <div>
                       <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">Ligne Directe</p>
                       <p className="text-xs font-mono">+223 70 00 00 00</p>
                    </div>
                 </div>
              </div>

              <div className="pt-6">
                 <div className="p-6 bg-white/5 border border-white/10 rounded-sm">
                    <div className="flex items-center gap-3 mb-4">
                       <ShieldCheck size={18} className="text-luxury" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Statut Elite</span>
                    </div>
                    <p className="text-[10px] font-serif italic text-white/40 leading-relaxed">
                       Système de gestion tactique protégé par cryptage dynamique des licences.
                    </p>
                 </div>
              </div>
           </div>

           <div className="p-8 border border-black flex flex-col items-center justify-center text-center space-y-4">
              <p className="text-[8px] font-bold uppercase tracking-widest text-black/40">Validité Contractuelle</p>
              <p className="text-2xl font-serif italic text-black">CONFORME</p>
              <div className="w-12 h-px bg-luxury" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-luxury">Usage Autorisé</p>
           </div>
        </div>
      </div>
    </div>
  );
};
