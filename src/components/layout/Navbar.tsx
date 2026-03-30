import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent drop-shadow-lg">
          PackSapeka<span className="text-white">.</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <a href="#services" className="hidden sm:block text-sm font-medium text-white/70 hover:text-white transition-colors">Serviços</a>
          <a href="#reviews" className="hidden sm:block text-sm font-medium text-white/70 hover:text-white transition-colors">Avaliações</a>
          
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors sm:ml-4">
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {user ? (
            <button onClick={logout} className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors sm:ml-4">
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          ) : (
            <Link to="/auth" className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors sm:ml-4">
              <LogIn size={16} />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
