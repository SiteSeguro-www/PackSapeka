import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { User, Instagram, Linkedin, Mail, Phone, ShoppingBag, Star, Clock, CheckCircle } from 'lucide-react';

export default function Profile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return;
      try {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        }

        // Fetch user services
        const q = query(
          collection(db, 'services'),
          where('sellerId', '==', userId),
          where('active', '==', true),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setServices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4">Usuário não encontrado</h2>
        <Link to="/" className="text-orange-500 hover:underline">Voltar para o início</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header / Cover Area */}
        <div className="relative mb-20">
          <div className="h-48 md:h-64 bg-gradient-to-r from-orange-600/20 to-purple-600/20 rounded-3xl border border-white/10 blur-sm absolute inset-0 -z-10"></div>
          <div className="flex flex-col md:flex-row items-end gap-6 px-8 pt-24 md:pt-32">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-[#111] border-4 border-[#050505] overflow-hidden flex-shrink-0 shadow-2xl">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20">
                  <User size={64} />
                </div>
              )}
            </div>
            <div className="flex-1 pb-2">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{profile.displayName}</h1>
              <p className="text-white/60 text-lg">{profile.title || 'Membro da Comunidade'}</p>
            </div>
            <div className="flex gap-3 pb-2">
              {profile.instagram && (
                <a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                  <Instagram size={20} />
                </a>
              )}
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                  <Linkedin size={20} />
                </a>
              )}
              <a href={`mailto:${profile.email}`} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Sidebar Info */}
          <div className="space-y-8">
            <section className="bg-[#111] border border-white/10 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-white mb-4">Sobre</h3>
              <p className="text-white/70 leading-relaxed whitespace-pre-wrap">
                {profile.bio || 'Este usuário ainda não adicionou uma biografia.'}
              </p>
              
              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-white/60">
                  <Star className="text-yellow-500" size={18} />
                  <span className="text-sm font-medium">4.9 (12 avaliações)</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <CheckCircle className="text-green-500" size={18} />
                  <span className="text-sm font-medium">Vendedor Verificado</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-3 text-white/60">
                    <Phone className="text-orange-500" size={18} />
                    <span className="text-sm font-medium">{profile.phone}</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Main Content - Services */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Serviços Oferecidos</h2>
              <span className="text-white/40 text-sm">{services.length} serviços</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.length > 0 ? (
                services.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden group hover:border-orange-500/50 transition-all"
                  >
                    <Link to={`/checkout/${service.id}`} className="block">
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={service.imageUrl || `https://picsum.photos/seed/${service.id}/600/400`} 
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-500 transition-colors">
                          {service.title}
                        </h3>
                        <p className="text-white/50 text-sm line-clamp-2 mb-4">
                          {service.description}
                        </p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2 text-white/40 text-xs">
                            <Clock size={14} />
                            {service.deliveryTime}
                          </div>
                          <div className="text-xl font-bold text-white">
                            R$ {service.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-[#111] border border-dashed border-white/10 rounded-3xl">
                  <ShoppingBag className="mx-auto text-white/10 mb-4" size={48} />
                  <p className="text-white/40">Nenhum serviço disponível no momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
