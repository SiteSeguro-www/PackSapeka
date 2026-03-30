import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion } from 'motion/react';
import { ShieldCheck, CreditCard, ArrowLeft, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generatePixPayload } from '../lib/pix';

export default function Checkout() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showPix, setShowPix] = useState(false);
  const [pixPayload, setPixPayload] = useState('');
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    paymentMethod: 'credit_card'
  });

  useEffect(() => {
    const fetchService = async () => {
      if (!serviceId) return;
      try {
        const docRef = doc(db, 'services', serviceId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setService({ id: docSnap.id, ...docSnap.data() });
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching service:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [serviceId, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;
    setSubmitting(true);

    try {
      // 1. Generate Order ID
      const orderRef = doc(collection(db, 'orders'));
      const orderId = orderRef.id;

      if (formData.paymentMethod === 'pix') {
        // Handle Pix Payment
        const pixKey = '4ba410d8-bf07-4f04-beb7-9f64c6738082';
        const payload = generatePixPayload(pixKey, 'Admin', 'Sao Paulo', service.price, orderId.substring(0, 10));
        setPixPayload(payload);
        
        await setDoc(orderRef, {
          customerName: formData.customerName || 'Cliente Pix',
          customerEmail: formData.customerEmail || '',
          customerPhone: formData.customerPhone || '',
          customerId: auth.currentUser?.uid || null,
          serviceId: service.id,
          serviceTitle: service.title,
          sellerId: service.sellerId || null,
          sellerName: service.sellerName || 'Vendedor',
          price: service.price,
          status: 'pending',
          paymentMethod: 'pix',
          createdAt: serverTimestamp()
        });

        // Post to Feed automatically for Pix sale intent
        await addDoc(collection(db, 'feed'), {
          type: 'sale',
          authorName: 'Sistema',
          authorId: 'system',
          serviceTitle: service.title,
          price: service.price,
          createdAt: serverTimestamp()
        });

        setShowPix(true);
        setSubmitting(false);
        return;
      }

      // 2. Call Backend to create Stripe Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          customer: {
            name: formData.customerName,
            email: formData.customerEmail,
            phone: formData.customerPhone
          },
          orderId,
          paymentMethod: formData.paymentMethod
        })
      });

      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Resposta não-JSON do servidor:", text);
        if (response.status === 413) {
          throw new Error("O pedido é muito grande para ser processado. Por favor, tente novamente ou entre em contato com o suporte.");
        }
        throw new Error(`Erro de comunicação com o servidor (Status: ${response.status}).`);
      }

      if (!response.ok) throw new Error(data.error || 'Erro ao criar sessão de pagamento');

      // 3. Save Order to Firestore as Pending
      await setDoc(orderRef, {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerId: auth.currentUser?.uid || null,
        serviceId: service.id,
        serviceTitle: service.title,
        sellerId: service.sellerId || null,
        sellerName: service.sellerName || 'Vendedor',
        price: service.price,
        status: 'pending',
        stripeSessionId: data.sessionId,
        createdAt: serverTimestamp()
      });

      // 4. Redirect to Stripe
      if (window.self !== window.top) {
        // Estamos dentro de um iframe (AI Studio Preview)
        // O Stripe bloqueia iframes, então abrimos em nova aba
        const newWindow = window.open(data.url, '_blank');
        setCheckoutUrl(data.url); // Mostra o botão de qualquer forma
      } else {
        // Não estamos em iframe, pode redirecionar normalmente
        window.location.href = data.url;
      }
      setSubmitting(false);
    } catch (error: any) {
      console.error("Error creating order:", error);
      alert(`Erro no pagamento: ${error.message}`);
      setSubmitting(false);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!service) return null;

  if (showPix) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 to-emerald-900/20 blur-3xl pointer-events-none"></div>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-[#111] border border-white/10 text-white p-8 md:p-12 rounded-3xl max-w-md w-full text-center shadow-[0_0_50px_rgba(34,197,94,0.1)] relative z-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(52,211,153,0.4)]"
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </motion.div>
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-300 to-emerald-500 bg-clip-text text-transparent">Pagamento via Pix</h2>
          <p className="text-white/60 mb-6">
            Escaneie o QR Code abaixo ou copie o código Pix Copia e Cola para finalizar sua compra.
          </p>
          
          <div className="bg-white p-6 rounded-2xl flex justify-center mb-6 border border-white/10 shadow-inner">
            <QRCodeSVG value={pixPayload} size={200} />
          </div>

          <div className="mb-8">
            <p className="text-sm font-medium text-white/70 mb-2 text-left">Pix Copia e Cola</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={pixPayload} 
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white/80 outline-none text-sm focus:border-green-500 transition-colors"
              />
              <button 
                onClick={copyPixCode}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all flex-shrink-0 flex items-center justify-center shadow-lg hover:shadow-green-500/25"
              >
                {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          <button 
            onClick={() => {
              setSuccess(true);
              setShowPix(false);
            }}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:scale-105 transition-all mb-4 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
          >
            Já realizei o pagamento
          </button>
          <button 
            onClick={() => setShowPix(false)}
            className="text-white/50 hover:text-white transition-colors underline"
          >
            Cancelar
          </button>
        </motion.div>
      </div>
    );
  }

  if (checkoutUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-indigo-900/20 blur-3xl pointer-events-none"></div>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-[#111] border border-white/10 text-white p-8 md:p-12 rounded-3xl max-w-md w-full text-center shadow-[0_0_50px_rgba(59,130,246,0.1)] relative z-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.4)]"
          >
            <ExternalLink size={40} />
          </motion.div>
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-300 to-indigo-500 bg-clip-text text-transparent">Quase lá!</h2>
          <p className="text-white/60 mb-8">
            Como você está visualizando o site no modo de pré-visualização, o Stripe exige que o pagamento seja feito em uma nova aba por segurança.
          </p>
          <a 
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold hover:scale-105 transition-all flex items-center justify-center gap-2 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          >
            Abrir Tela de Pagamento <ExternalLink size={20} />
          </a>
          <button 
            onClick={() => setCheckoutUrl(null)}
            className="text-white/50 hover:text-white transition-colors underline"
          >
            Voltar
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 via-yellow-500/10 to-transparent blur-3xl pointer-events-none"></div>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="bg-[#111] border border-white/10 text-white p-8 md:p-12 rounded-3xl max-w-md w-full text-center shadow-[0_0_50px_rgba(249,115,22,0.15)] relative z-10"
        >
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-orange-400 to-yellow-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(249,115,22,0.5)]"
          >
            <ShieldCheck size={48} />
          </motion.div>
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-300 to-yellow-400 bg-clip-text text-transparent"
          >
            Pedido Confirmado!
          </motion.h2>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-white/70 mb-8 text-lg"
          >
            Obrigado{formData.customerName ? `, ${formData.customerName}` : ''}. Seu pedido para <strong className="text-white">{service.title}</strong> foi recebido com sucesso. Entraremos em contato em breve.
          </motion.p>
          <motion.button 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-black py-4 rounded-xl font-bold hover:scale-105 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
          >
            Voltar para a Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 md:py-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={20} /> Voltar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Checkout Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#111] border border-white/10 text-white p-8 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500"></div>
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Finalizar Compra</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-white/80 border-b border-white/10 pb-2">Forma de Pagamento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`border rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 transition-all duration-300 ${formData.paymentMethod === 'credit_card' ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.2)] scale-105' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                  <input type="radio" name="paymentMethod" value="credit_card" checked={formData.paymentMethod === 'credit_card'} onChange={handleChange} className="sr-only" />
                  <CreditCard size={24} className={formData.paymentMethod === 'credit_card' ? 'text-orange-500' : 'text-white/50'} />
                  <span className={`text-sm font-medium ${formData.paymentMethod === 'credit_card' ? 'text-orange-500' : 'text-white/50'}`}>Cartão</span>
                </label>
                <label className={`border rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 transition-all duration-300 ${formData.paymentMethod === 'pix' ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-105' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                  <input type="radio" name="paymentMethod" value="pix" checked={formData.paymentMethod === 'pix'} onChange={handleChange} className="sr-only" />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={formData.paymentMethod === 'pix' ? 'text-green-500' : 'text-white/50'}><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className={`text-sm font-medium ${formData.paymentMethod === 'pix' ? 'text-green-500' : 'text-white/50'}`}>Pix</span>
                </label>
              </div>
            </div>

            {formData.paymentMethod === 'credit_card' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4"
              >
                <h3 className="font-semibold text-white/80 border-b border-white/10 pb-2">Dados Pessoais</h3>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Nome Completo</label>
                  <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-white/20" placeholder="João da Silva" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">E-mail</label>
                  <input required type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-white/20" placeholder="joao@exemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Telefone / WhatsApp</label>
                  <input required type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-white/20" placeholder="(11) 99999-9999" />
                </div>
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={submitting}
              className="relative group overflow-hidden w-full bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 text-black py-4 rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-8 bg-[length:200%_auto] animate-shine shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
            >
              {submitting ? 'Processando...' : `Pagar R$ ${service.price.toFixed(2)}`}
            </button>
            <p className="text-xs text-center text-white/40 flex items-center justify-center gap-1 mt-4">
              <ShieldCheck size={14} className="text-green-500" /> Pagamento 100% seguro e criptografado
            </p>
          </form>
        </motion.div>

        {/* Order Summary */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:pl-12"
        >
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl sticky top-24 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Resumo do Pedido</h3>
            
            <div className="flex gap-4 mb-6 pb-6 border-b border-white/10">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#0a0a0a] flex-shrink-0 border border-white/5">
                <img src={service.imageUrl || `https://picsum.photos/seed/${service.id}/200/200`} alt={service.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="font-semibold text-lg text-white">{service.title}</h4>
                <p className="text-orange-400/80 text-sm mt-1 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Prazo: {service.deliveryTime}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-white/60">
                <span>Subtotal</span>
                <span>R$ {service.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Taxas</span>
                <span className="text-green-400">Grátis</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-white/10">
              <span className="text-lg font-medium text-white">Total</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">R$ {service.price.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
