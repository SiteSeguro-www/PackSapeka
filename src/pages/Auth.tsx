import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Phone, User, Store, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'phone';

export default function Auth() {
  const { loginWithGoogle, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        
        // Create user record in Firestore
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: name,
          role: role,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
      setVerificationId(confirmation.verificationId);
      (window as any).confirmationResult = confirmation;
    } catch (err: any) {
      console.error('Phone sign in error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await (window as any).confirmationResult.confirm(otp);
      
      // Check if user exists in Firestore
      // (Simplified: always create if not exists)
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber,
        role: role,
        createdAt: serverTimestamp()
      }, { merge: true });
      
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(role);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#050505]">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
            {mode === 'login' ? 'Bem-vindo de volta' : mode === 'register' ? 'Criar sua conta' : 'Acesso via Celular'}
          </h1>
          <p className="text-white/50">
            {mode === 'login' ? 'Acesse sua conta para continuar' : 'Junte-se à nossa plataforma hoje'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        {/* Role Selection (Only for Register or Phone) */}
        {mode !== 'login' && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => setRole('user')}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${role === 'user' ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              <User size={24} />
              <span className="text-sm font-bold">Comprador</span>
            </button>
            <button 
              onClick={() => setRole('admin')}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${role === 'admin' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              <Store size={24} />
              <span className="text-sm font-bold">Vendedor (Admin)</span>
            </button>
          </div>
        )}

        {/* Auth Forms */}
        <div className="space-y-4">
          {mode !== 'phone' ? (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'register' && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                  <input 
                    required
                    type="text" 
                    placeholder="Seu Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input 
                  required
                  type="email" 
                  placeholder="Seu E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input 
                  required
                  type="password" 
                  placeholder="Sua Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : mode === 'login' ? 'Entrar' : 'Criar Conta'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {!verificationId ? (
                <form onSubmit={handlePhoneSignIn} className="space-y-4">
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                    <input 
                      required
                      type="tel" 
                      placeholder="+55 (11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <div id="recaptcha-container"></div>
                  <button 
                    disabled={loading}
                    className="w-full bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Enviar Código'}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyOtp} className="space-y-4">
                  <div className="relative">
                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                    <input 
                      required
                      type="text" 
                      placeholder="Código de 6 dígitos"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <button 
                    disabled={loading}
                    className="w-full bg-orange-500 text-black font-bold py-3 rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Verificar Código'}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#111] px-2 text-white/30">Ou continue com</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button 
              onClick={() => { setMode(mode === 'phone' ? 'login' : 'phone'); setError(null); }}
              className="text-xs text-white/50 hover:text-white transition-colors py-2"
            >
              {mode === 'phone' ? 'Acesso via E-mail' : 'Acesso via Celular'}
            </button>
            <button 
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
              className="text-xs text-white/50 hover:text-white transition-colors py-2 text-right"
            >
              {mode === 'login' ? 'Criar nova conta' : 'Já tenho conta'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
