import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#111] border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h1 className="text-2xl font-bold mb-4">Ops! Algo deu errado.</h1>
            <p className="text-white/60 mb-8">
              Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada.
            </p>
            
            {this.state.error && (
              <div className="bg-black/40 p-4 rounded-xl mb-8 text-left overflow-auto max-h-32 border border-white/5">
                <code className="text-xs text-red-400 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-all"
              >
                <RefreshCw size={18} /> Recarregar Página
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-white/5 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all border border-white/10"
              >
                <Home size={18} /> Voltar para Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
