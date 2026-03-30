import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, LogIn, UserPlus, Chrome, ArrowRight, ShieldCheck, ShoppingBag, Store } from 'lucide-react';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const AuthPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail, loginAnonymously, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('comprador');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isPhoneAuth, setIsPhoneAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      await loginWithGoogle(role);
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar com Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      await loginAnonymously();
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar como convidado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, role, name);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login por E-mail/Senha ou Telefone não está ativado no Console do Firebase. Por favor, ative-os em Authentication > Sign-in method.');
      } else {
        setError(err.message || 'Erro na autenticação');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('Recaptcha resolved');
        }
      });
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login por Telefone não está ativado no Console do Firebase. Por favor, ative-o em Authentication > Sign-in method.');
      } else {
        setError(err.message || 'Erro ao enviar SMS');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(verificationCode);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login por Telefone não está ativado no Console do Firebase. Por favor, ative-o em Authentication > Sign-in method.');
      } else {
        setError(err.message || 'Código inválido');
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
      
      <div id="recaptcha-container"></div>
      
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
            {isPhoneAuth ? 'Entrar com Telefone' : (isLogin ? 'Bem-vindo de volta' : 'Criar sua conta')}
          </h2>
          <p className="text-center text-white/50 mb-8 text-sm">
            {isPhoneAuth ? 'Enviaremos um código por SMS' : (isLogin ? 'Acesse sua conta para continuar' : 'Escolha seu perfil e comece agora')}
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

          {!isPhoneAuth && !confirmationResult && (
            <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
              <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
              >
                Entrar
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
              >
                Cadastrar
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {isPhoneAuth ? (
              <motion.form 
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={confirmationResult ? handleVerifyCode : handlePhoneSignIn}
                className="space-y-4"
              >
                {!confirmationResult ? (
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input 
                      type="tel"
                      placeholder="+55 (11) 99999-9999"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-white placeholder:text-white/20"
                      required
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input 
                      type="text"
                      placeholder="Código de 6 dígitos"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-white placeholder:text-white/20"
                      required
                    />
                  </div>
                )}
                
                <button 
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20"
                >
                  {isSubmitting ? 'Processando...' : (confirmationResult ? 'Verificar Código' : 'Enviar SMS')}
                  <ArrowRight className="w-5 h-5" />
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    setIsPhoneAuth(false);
                    setConfirmationResult(null);
                  }}
                  className="w-full text-white/40 text-sm hover:text-white transition-all font-medium"
                >
                  Voltar para E-mail
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button 
                      type="button"
                      onClick={() => setRole('comprador')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${role === 'comprador' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/5 text-white/20 hover:border-white/10'}`}
                    >
                      <ShoppingBag className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase tracking-wider">Comprador</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRole('vendedor')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${role === 'vendedor' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/5 text-white/20 hover:border-white/10'}`}
                    >
                      <Store className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase tracking-wider">Vendedor</span>
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        type="text"
                        placeholder="Nome completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-white placeholder:text-white/20"
                        required={!isLogin}
                      />
                    </div>
                  )}
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
                    {isSubmitting ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
                    {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </button>
                </form>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#111] px-4 text-white/30 font-bold tracking-widest">Ou continue com</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    className="flex flex-col items-center justify-center gap-2 py-3 px-2 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-[10px] font-bold text-white"
                  >
                    <Chrome className="w-5 h-5 text-orange-500" />
                    Google
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsPhoneAuth(true)}
                    disabled={isSubmitting}
                    className="flex flex-col items-center justify-center gap-2 py-3 px-2 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-[10px] font-bold text-white"
                  >
                    <Phone className="w-5 h-5 text-yellow-500" />
                    Telefone
                  </button>
                  <button 
                    type="button"
                    onClick={handleGuestLogin}
                    disabled={isSubmitting}
                    className="flex flex-col items-center justify-center gap-2 py-3 px-2 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-[10px] font-bold text-white"
                  >
                    <User className="w-5 h-5 text-blue-500" />
                    Convidado
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="bg-white/5 p-6 text-center border-t border-white/5">
          <p className="text-sm text-white/40">
            {isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-bold text-orange-500 hover:text-orange-400 transition-colors"
            >
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
