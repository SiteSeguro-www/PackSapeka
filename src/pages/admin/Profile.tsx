import React, { useEffect, useState, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Save, User, Upload, Loader2 } from 'lucide-react';
import { compressImage } from '../../lib/utils';

export default function AdminProfile() {
  const [profile, setProfile] = useState({
    name: '',
    title: '',
    bio: '',
    avatarUrl: '',
    email: '',
    phone: '',
    instagram: '',
    linkedin: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'profile', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Erro: Por favor, selecione uma imagem válida.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setUploading(true);
    setMessage('Processando imagem...');

    try {
      // Compress image to fit within Firestore limits (max ~1MB, we use 0.8MB)
      const base64Image = await compressImage(file, 0.8);
      setProfile(prev => ({ ...prev, avatarUrl: base64Image }));
      setMessage('Imagem processada com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage('Erro ao processar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'profile', 'main'), profile);
      setMessage('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage('Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) return <div className="p-8 flex items-center justify-center">Carregando...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 pb-8 border-b border-gray-100">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={40} className="text-gray-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                {uploading ? <Loader2 size={24} className="text-white animate-spin" /> : <Upload size={24} className="text-white" />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">URL da Foto de Perfil (ou faça upload clicando na foto)</label>
              <input type="url" name="avatarUrl" value={profile.avatarUrl} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" placeholder="https://exemplo.com/foto.jpg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input required type="text" name="name" value={profile.name} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título Profissional</label>
              <input required type="text" name="title" value={profile.title} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" placeholder="Ex: Desenvolvedor Full Stack" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Biografia Curta</label>
              <textarea required name="bio" value={profile.bio} onChange={handleChange} rows={4} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" placeholder="Fale um pouco sobre você e seu trabalho..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Contato</label>
              <input type="email" name="email" value={profile.email} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
              <input type="tel" name="phone" value={profile.phone} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (URL)</label>
              <input type="url" name="instagram" value={profile.instagram} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn (URL)</label>
              <input type="url" name="linkedin" value={profile.linkedin} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <span className={`text-sm font-medium ${message.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>{message}</span>
            <button 
              type="submit" 
              disabled={saving}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
