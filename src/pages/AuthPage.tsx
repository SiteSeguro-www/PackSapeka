import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, LogIn, UserPlus, Chrome, ArrowRight, ShieldCheck, ShoppingBag, Store } from 'lucide-react';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const AuthPage: React.FC = () => {
  const { loginWithEmail, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login por E-mail/Senha não está ativado no Console do Firebase.');
      } else {
        setError(err.message || 'Erro na autenticação');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#111] rounded-[32px] shadow-2xl overflow-hidden border border-white/10 relative z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500"></div>
        
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-4 rounded-3xl shadow-lg shadow-orange-500/20">
              <ShieldCheck className="w-8 h-8 text-black" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center mb-2 text-white tracking-tighter">
            Bem-vindo de volta
          </h2>
          <p className="text-center text-white/50 mb-8 text-sm">
            Acesse sua conta para continuar
          </p>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 text-red-500 p-3 rounded-xl text-sm mb-6 border border-red-500/20"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input 
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-white placeholder:text-white/20"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input 
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-white placeholder:text-white/20"
                required
              />
            </div>
            
            <button 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20"
            >
              {isSubmitting ? 'Processando...' : 'Entrar'}
              <LogIn className="w-5 h-5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
