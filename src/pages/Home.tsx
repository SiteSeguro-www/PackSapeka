import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ArrowRight, CheckCircle2, X } from 'lucide-react';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ customerName: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('review') === 'true') {
      setIsReviewModalOpen(true);
    }
  }, [searchParams]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        ...reviewForm,
        orderId: searchParams.get('orderId') || null,
        active: true, // Auto-approve for now, or set to false if admin approval is needed
        createdAt: serverTimestamp()
      });
      setReviewSuccess(true);
      setTimeout(() => {
        setIsReviewModalOpen(false);
        setReviewSuccess(false);
        setReviewForm({ customerName: '', rating: 5, comment: '' });
        setSearchParams({}); // Clear URL params
      }, 3000);
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Profile
        const profileDoc = await getDoc(doc(db, 'profile', 'main'));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data());
        }

        // Fetch Services
        const servicesQuery = query(collection(db, 'services'), where('active', '==', true), orderBy('createdAt', 'desc'));
        const servicesSnapshot = await getDocs(servicesQuery);
        setServices(servicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Reviews
        const reviewsQuery = query(collection(db, 'reviews'), where('active', '==', true), orderBy('createdAt', 'desc'));
        const reviewsSnapshot = await getDocs(reviewsQuery);
        setReviews(reviewsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-4 py-24 md:py-32 flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-yellow-300 rounded-full blur-2xl opacity-40 animate-pulse"></div>
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
            <img 
              src={profile?.avatarUrl || "https://picsum.photos/seed/avatar/200/200"} 
              alt={profile?.name || "Profile"} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs font-bold px-4 py-1.5 rounded-full border-2 border-[#050505] shadow-lg">
            PRO
          </div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent"
        >
          {profile?.name || "Seu Nome Aqui"}
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl md:text-2xl text-white/70 font-light mb-8 max-w-2xl"
        >
          {profile?.title || "Especialista em Serviços Exclusivos"}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0"
        >
          <a href="#services" className="relative group overflow-hidden bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 text-white px-8 py-4 rounded-full font-bold transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] flex items-center justify-center gap-2 bg-[length:200%_auto] animate-shine w-full sm:w-auto">
            Ver Serviços <ArrowRight size={18} />
          </a>
          <a href="https://t.me/MagrinhaSapeka" target="_blank" rel="noopener noreferrer" className="bg-white/5 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-colors border border-white/10 backdrop-blur-sm w-full sm:w-auto text-center">
            Entrar em Contato
          </a>
        </motion.div>
      </section>

      {/* Services Section */}
      <section id="services" className="w-full py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-900/10 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent">Serviços Exclusivos</h2>
            <p className="text-white/70 max-w-2xl mx-auto">Soluções personalizadas e de alto nível para atender às suas necessidades com excelência e rapidez.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.length > 0 ? services.map((service, index) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-[#111] rounded-3xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all duration-500 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/0 via-orange-500/0 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="aspect-video w-full overflow-hidden bg-[#0a0a0a]">
                  <img 
                    src={service.imageUrl || `https://picsum.photos/seed/${service.id}/600/400`} 
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-8 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">{service.title}</h3>
                    <span className="text-yellow-400 font-bold bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full text-sm shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                      R$ {service.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-white/60 mb-6 line-clamp-3">{service.description}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-white/50 mb-8 font-medium">
                    <CheckCircle2 size={16} className="text-orange-500" />
                    Prazo: {service.deliveryTime}
                  </div>

                  <Link 
                    to={`/checkout/${service.id}`}
                    className="block w-full text-center bg-white/5 border border-white/10 text-white py-3 rounded-xl font-semibold group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-yellow-500 group-hover:border-transparent group-hover:text-black group-hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all duration-300"
                  >
                    Contratar Agora
                  </Link>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full text-center text-white/50 py-12">
                Nenhum serviço disponível no momento.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="w-full max-w-7xl mx-auto px-4 py-24 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="text-center mb-16 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">O que dizem</h2>
          <p className="text-white/70 max-w-2xl mx-auto">A satisfação dos meus clientes é a minha maior prioridade.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {reviews.length > 0 ? reviews.map((review, index) => (
            <motion.div 
              key={review.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-[#111] border border-white/5 p-8 rounded-3xl hover:border-orange-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] group"
            >
              <div className="flex gap-1 mb-4 text-orange-500 group-hover:text-yellow-400 transition-colors">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill={i < review.rating ? "currentColor" : "none"} />
                ))}
              </div>
              <p className="text-white/80 mb-6 italic">"{review.comment}"</p>
              <div className="font-semibold text-orange-200">{review.customerName}</div>
            </motion.div>
          )) : (
            <div className="col-span-full text-center text-white/50 py-12">
              Nenhuma avaliação ainda.
            </div>
          )}
        </div>

        <div className="mt-12 text-center relative z-10">
          <button
            onClick={() => setIsReviewModalOpen(true)}
            className="bg-white/5 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-colors border border-white/10 backdrop-blur-sm"
          >
            Deixar Avaliação
          </button>
        </div>
      </section>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500"></div>
              
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              {reviewSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Obrigado!</h3>
                  <p className="text-white/70">Sua avaliação foi enviada com sucesso.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Sua Avaliação</h2>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Seu Nome</label>
                      <input
                        required
                        type="text"
                        value={reviewForm.customerName}
                        onChange={(e) => setReviewForm({ ...reviewForm, customerName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-white/20"
                        placeholder="Como gostaria de ser chamado?"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">Sua Nota</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            className={`transition-colors ${reviewForm.rating >= star ? 'text-orange-500' : 'text-white/20 hover:text-white/50'}`}
                          >
                            <Star size={32} fill={reviewForm.rating >= star ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Comentário</label>
                      <textarea
                        required
                        rows={4}
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-white/20 resize-none"
                        placeholder="Conte-nos o que achou do serviço..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                      {submittingReview ? 'Enviando...' : 'Enviar Avaliação'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
