import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Erro ao atualizar status do pedido.");
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
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">ID / Data</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Serviço</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length > 0 ? orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 text-xs uppercase mb-1">{order.id.substring(0, 8)}</div>
                    <div className="text-sm text-gray-500">
                      {order.createdAt ? format(order.createdAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerEmail}</div>
                    <div className="text-sm text-gray-500">{order.customerPhone}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{order.serviceTitle}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">R$ {order.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select 
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="completed">Concluído</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum pedido encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
