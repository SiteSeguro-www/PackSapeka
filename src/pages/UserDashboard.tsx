import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ShoppingBag, Clock, CheckCircle, XCircle, CreditCard, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'orders'),
          where('customerEmail', '==', user.email),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching user orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit";
    switch (status) {
      case 'completed': return <span className={`${baseClasses} bg-green-500/10 text-green-500`}><CheckCircle size={12} /> Concluído</span>;
      case 'paid': return <span className={`${baseClasses} bg-blue-500/10 text-blue-500`}><CreditCard size={12} /> Pago</span>;
      case 'cancelled': return <span className={`${baseClasses} bg-red-500/10 text-red-500`}><XCircle size={12} /> Cancelado</span>;
      default: return <span className={`${baseClasses} bg-yellow-500/10 text-yellow-500`}><Clock size={12} /> Pendente</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent mb-2">
            Minhas Compras
          </h1>
          <p className="text-white/50">Acompanhe o status dos seus pedidos e histórico de serviços.</p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {orders.length > 0 ? (
            orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="text-orange-500" size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-orange-500 transition-colors">
                        {order.serviceTitle}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <span>ID: #{order.id.substring(0, 8).toUpperCase()}</span>
                        <span>•</span>
                        <span>{order.createdAt ? format(order.createdAt.toDate(), "dd 'de' MMM, yyyy", { locale: ptBR }) : '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end justify-between gap-4">
                    <div className="text-2xl font-bold text-white">
                      R$ {order.price.toFixed(2)}
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {order.status === 'completed' && (
                  <div className="mt-6 pt-6 border-t border-white/5 flex justify-end">
                    <a
                      href={`/?review=true&orderId=${order.id}`}
                      className="flex items-center gap-2 text-sm font-bold text-orange-500 hover:text-orange-400 transition-colors"
                    >
                      Avaliar Serviço <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-[#111] border border-dashed border-white/10 rounded-3xl">
              <ShoppingBag className="mx-auto text-white/10 mb-4" size={64} />
              <h3 className="text-xl font-bold text-white mb-2">Nenhum pedido encontrado</h3>
              <p className="text-white/50 mb-8">Você ainda não realizou nenhuma compra em nossa plataforma.</p>
              <a 
                href="/"
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-orange-500 hover:text-white transition-all"
              >
                Explorar Serviços
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
