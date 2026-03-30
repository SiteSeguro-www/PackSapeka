import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { ShieldCheck, Loader2, XCircle } from 'lucide-react';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const orderId = searchParams.get('order_id');

      if (!sessionId || !orderId) {
        setStatus('error');
        return;
      }

      try {
        // Check if order is already paid to avoid unnecessary calls
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        
        if (orderSnap.exists() && orderSnap.data().status === 'paid') {
          setStatus('success');
          return;
        }

        // Verify with backend
        const response = await fetch(`/api/verify-session?session_id=${sessionId}`);
        const data = await response.json();

        if (data.payment_status === 'paid') {
          // Update Firestore
          await updateDoc(orderRef, { status: 'paid' });
          
          // Send "Payment Confirmed" Email
          try {
            const orderData = orderSnap.data();
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'payment_confirmed',
                order: { id: orderId, ...orderData }
              })
            });
          } catch (e) {
            console.error("Erro ao enviar e-mail de confirmação de pagamento:", e);
          }

          setStatus('success');
        } else {
          // Payment not completed yet (e.g., PIX pending)
          // We can still show success but mention it's pending
          setStatus('success'); 
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
        <h2 className="text-xl font-medium">Verificando pagamento...</h2>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-500 mb-4">Erro ao verificar pagamento</h2>
        <p className="text-gray-400 mb-8 max-w-md">Não foi possível confirmar o status do seu pedido. Se o pagamento já foi realizado, não se preocupe, entraremos em contato.</p>
        <button onClick={() => navigate('/')} className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Voltar para Home</button>
      </div>
    );
  }

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
          Obrigado! Seu pedido foi recebido com sucesso. Entraremos em contato em breve com os próximos passos.
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
