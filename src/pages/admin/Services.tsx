import React, { useEffect, useState, useRef } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, X, Check, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function AdminServices() {
  const { user, isAdmin, role } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'comprador' && !isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [role, isAdmin, navigate]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    deliveryTime: '',
    imageUrl: '',
    active: true
  });

  const fetchServices = async () => {
    if (!user) return;
    try {
      let q;
      if (isAdmin) {
        q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
      } else {
        q = query(
          collection(db, 'services'), 
          where('sellerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      setServices(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [user]);

  const handleOpenModal = (service?: any) => {
    if (service) {
      setFormData({
        title: service.title,
        description: service.description,
        price: service.price,
        deliveryTime: service.deliveryTime,
        imageUrl: service.imageUrl,
        active: service.active
      });
      setEditingId(service.id);
    } else {
      setFormData({ title: '', description: '', price: 0, deliveryTime: '', imageUrl: '', active: true });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.');
      return;
    }

    setUploading(true);

    try {
      // Compress image to fit within Firestore limits (max ~1MB, we use 0.8MB)
      const base64Image = await compressImage(file, 0.8);
      setFormData(prev => ({ ...prev, imageUrl: base64Image }));
    } catch (error) {
      console.error("Upload error:", error);
      alert('Erro ao processar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), formData);
      } else {
        await addDoc(collection(db, 'services'), {
          ...formData,
          sellerId: user.uid,
          sellerName: user.displayName || 'Vendedor',
          sellerEmail: user.email,
          createdAt: serverTimestamp()
        });
      }
      fetchServices();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving service:", error);
      alert("Erro ao salvar serviço.");
    }
  };

  const handleDeleteClick = (id: string) => {
    setServiceToDelete(id);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      await deleteDoc(doc(db, 'services', serviceToDelete));
      fetchServices();
      setServiceToDelete(null);
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Erro ao excluir serviço.");
      setServiceToDelete(null);
    }
  };

  const cancelDelete = () => {
    setServiceToDelete(null);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'services', id), { active: !currentStatus });
      fetchServices();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  if (loading) return <div className="p-8 flex items-center justify-center">Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Serviço
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Serviço</th>
                <th className="px-6 py-4 font-medium">Preço</th>
                <th className="px-6 py-4 font-medium">Prazo</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.length > 0 ? services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                        <img src={service.imageUrl || `https://picsum.photos/seed/${service.id}/100/100`} alt={service.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{service.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-1 max-w-xs">{service.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">R$ {service.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-600">{service.deliveryTime}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleActive(service.id, service.active)}
                      className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${service.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {service.active ? <><Check size={12} /> Ativo</> : <><X size={12} /> Inativo</>}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenModal(service)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteClick(service.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum serviço cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Excluir Serviço</h2>
            <p className="text-gray-600 mb-8">
              Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={cancelDelete} 
                className="px-6 py-3 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex-1"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-6 py-3 bg-red-600 text-white font-medium hover:bg-red-700 rounded-xl transition-colors flex-1"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título do Serviço</label>
                  <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea required name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input required type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Entrega</label>
                  <input required type="text" name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" placeholder="Ex: 3 dias úteis" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do Serviço</label>
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0 relative group">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={32} className="text-gray-400" />
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                      >
                        {uploading ? <Loader2 size={24} className="text-white animate-spin" /> : <Upload size={24} className="text-white" />}
                      </button>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          Fazer Upload do PC
                        </button>
                        <span className="text-sm text-gray-500">ou</span>
                      </div>
                      <input 
                        type="url" 
                        name="imageUrl" 
                        value={formData.imageUrl} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm" 
                        placeholder="Cole o link (URL) da imagem aqui" 
                      />
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-2 mt-2">
                  <input type="checkbox" id="active" name="active" checked={formData.active} onChange={(e) => setFormData({...formData, active: e.target.checked})} className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500" />
                  <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer">Serviço Ativo (Visível no site)</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
