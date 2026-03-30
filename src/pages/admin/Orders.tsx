import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, XCircle, CreditCard, Search, Loader2, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminOrders() {
  const { user, isAdmin, role } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'comprador' && !isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [role, isAdmin, navigate]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      let q;
      if (isAdmin) {
        q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      } else {
        q = query(
          collection(db, 'orders'), 
          where('sellerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  useEffect(() => {
    let result = orders;
    
    if (filter !== 'all') {
      result = result.filter(o => o.status === filter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.customerName?.toLowerCase().includes(term) || 
        o.customerEmail?.toLowerCase().includes(term) ||
        o.id?.toLowerCase().includes(term) ||
        o.serviceTitle?.toLowerCase().includes(term)
      );
    }
    
    setFilteredOrders(result);
  }, [filter, searchTerm, orders]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
      
      // Send Email if status is completed or paid
      if (newStatus === 'completed' || newStatus === 'paid') {
        const order = orders.find(o => o.id === id);
        if (order) {
          try {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: newStatus === 'completed' ? 'order_completed' : 'payment_confirmed',
                order: order
              })
            });
          } catch (e) {
            console.error("Erro ao enviar e-mail de atualização de status:", e);
          }
        }
      }

      await fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Erro ao atualizar status do pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div className="p-8 flex items-center justify-center">Carregando...</div>;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      case 'paid': return <CreditCard size={16} className="text-blue-600" />;
      case 'cancelled': return <XCircle size={16} className="text-red-600" />;
      default: return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit";
    switch (status) {
      case 'completed': return <span className={`${baseClasses} bg-green-100 text-green-700`}>{getStatusIcon(status)} Concluído</span>;
      case 'paid': return <span className={`${baseClasses} bg-blue-100 text-blue-700`}>{getStatusIcon(status)} Pago</span>;
      case 'cancelled': return <span className={`${baseClasses} bg-red-100 text-red-700`}>{getStatusIcon(status)} Cancelado</span>;
      default: return <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>{getStatusIcon(status)} Pendente</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel de Vendas</h1>
          <p className="text-gray-500">Gerencie o status e acompanhe suas vendas.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente ou pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto hide-scrollbar">
            {['all', 'pending', 'paid', 'completed', 'cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filter === f 
                    ? 'bg-white text-orange-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? 'Todos' : 
                 f === 'pending' ? 'Pendentes' : 
                 f === 'paid' ? 'Pagos' : 
                 f === 'completed' ? 'Concluídos' : 'Cancelados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">ID / Data</th>
                <th className="px-6 py-4 font-bold">Cliente</th>
                <th className="px-6 py-4 font-bold">Serviço</th>
                <th className="px-6 py-4 font-bold">Valor</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-xs uppercase mb-1">#{order.id.substring(0, 8)}</div>
                    <div className="text-xs text-gray-400">
                      {order.createdAt ? format(order.createdAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-700">{order.serviceTitle}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">R$ {order.price.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {updatingId === order.id ? (
                        <Loader2 className="animate-spin text-orange-500" size={20} />
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {order.status === 'pending' && (
                            <button 
                              onClick={() => updateStatus(order.id, 'paid')}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Marcar como Pago"
                            >
                              <CreditCard size={18} />
                            </button>
                          )}
                          {(order.status === 'paid' || order.status === 'pending') && (
                            <button 
                              onClick={() => updateStatus(order.id, 'completed')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Marcar como Concluído"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {order.status !== 'cancelled' && (
                            <button 
                              onClick={() => updateStatus(order.id, 'cancelled')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancelar Pedido"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                      )}
                      <select 
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        disabled={updatingId === order.id}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-orange-500 bg-white cursor-pointer"
                      >
                        <option value="pending">Pendente</option>
                        <option value="paid">Pago</option>
                        <option value="completed">Concluído</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={48} className="text-gray-200" />
                      <p className="font-medium">Nenhum pedido encontrado.</p>
                      <p className="text-sm">Tente ajustar seus filtros ou busca.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
