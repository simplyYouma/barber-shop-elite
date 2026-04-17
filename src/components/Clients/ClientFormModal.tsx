import React, { useState, useRef } from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { useClientStore } from '@/store/useClientStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { Client } from '@/types';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (client: Client) => void;
  editingClient?: Client | null;
  initialName?: string;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingClient = null,
  initialName = ''
}) => {
  const { addClient, updateClient } = useClientStore();
  const { showToast } = useNotificationStore();
  
  const [newName, setNewName] = useState(editingClient?.name || initialName);
  const [newPhone, setNewPhone] = useState(editingClient?.phone || '');
  const [newAvatar, setNewAvatar] = useState<string | null>(editingClient?.avatar || null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setNewName('');
    setNewPhone('');
    setNewAvatar(null);
    setError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newName.trim()) {
      setError('Le nom est obligatoire');
      return;
    }

    let formattedPhone = newPhone.trim();
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      formattedPhone = '+223' + formattedPhone;
    }

    setIsSubmitting(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, { 
          name: newName, 
          phone: formattedPhone, 
          avatar: newAvatar || undefined 
        });
        showToast('Profil mis à jour', 'success');
        onClose();
      } else {
        const client = await addClient({ 
          name: newName, 
          phone: formattedPhone, 
          avatar: newAvatar || undefined,
          is_deleted: false
        });
        showToast(`Fiche de ${newName} créée avec succès`, 'success');
        if (onSuccess) onSuccess(client);
        resetForm();
        onClose();
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/90 backdrop-blur-sm p-6 animate-fade-up">
      <div className="w-full max-w-xl bg-white border border-black p-8 lg:p-12 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 hover:rotate-90 transition-transform"
        >
          <Plus size={24} className="rotate-45" />
        </button>

        <p className="text-luxury mb-2 uppercase tracking-widest text-[10px]">
          {editingClient ? 'MODIFICATION DE FICHE' : 'CRÉATION DE FICHE'}
        </p>
        <h2 className="text-3xl lg:text-4xl text-editorial-title mb-10">
          {editingClient ? 'Modifier Client' : 'Nouveau Client'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-6">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 block">Photo de Profil</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-background-soft border border-dashed border-black/20 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group/thumb"
              >
                {newAvatar ? (
                  <img src={newAvatar} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 opacity-20 group-hover/thumb:opacity-40 transition-opacity">
                    <ImageIcon size={32} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Choisir</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Nom de l'Adhérent</label>
                <input 
                  autoFocus
                  className="w-full bg-background-soft border-b border-black/20 focus:border-black px-0 py-4 text-xl font-serif italic outline-none transition-all placeholder:opacity-20"
                  placeholder="Nom complet..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Téléphone</label>
                <input 
                  className={`w-full bg-background-soft border-b ${error && !newPhone.startsWith('+') && newPhone.length > 0 ? 'border-red-500' : 'border-black/20 focus:border-black'} px-0 py-4 text-xl font-serif italic outline-none transition-all placeholder:opacity-20`}
                  placeholder="+223 ..."
                  value={newPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+]/g, '');
                    setNewPhone(val);
                  }}
                />
                {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse">{error}</p>}
              </div>
            </div>
          </div>
          <div className="flex gap-0 pt-6">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 btn-premium py-6 disabled:opacity-50"
            >
              {editingClient ? 'SAUVEGARDER' : "CONFIRMER L'INSCRIPTION"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
