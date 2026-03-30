import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ShoppingBag, Clock, CheckCircle, XCircle, CreditCard, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalOrders: 0,
    chartData: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'orders'),
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setOrders(data);

        // Calculate stats
        let spent = 0;
        const ordersByDay: Record<string, number> = {};

        // Prepare last 7 days for chart
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          ordersByDay[format(date, 'yyyy-MM-dd')] = 0;
        }

        data.forEach(order => {
          if (order.status !== 'cancelled') {
            spent += order.price;
            
            if (order.createdAt) {
              const dateKey = format(order.createdAt.toDate(), 'yyyy-MM-dd');
              if (ordersByDay[dateKey] !== undefined) {
                ordersByDay[dateKey] += order.price;
              }
            }
          }
        });

        const chartData = Object.entries(ordersByDay).map(([date, value]) => ({
          name: format(new Date(date + 'T00:00:00'), 'dd/MM'),
          value: value
        }));

        setStats({
          totalSpent: spent,
          totalOrders: data.length,
          chartData: chartData
        });
      } catch (error) {
        console.error("Error fetching user orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Investido', value: `R$ ${stats.totalSpent.toFixed(2)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Meus Pedidos', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Serviços Ativos', value: orders.filter(o => o.status === 'paid' || o.status === 'pending').length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'Concluídos', value: orders.filter(o => o.status === 'completed').length, icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Meu Painel de Compras</h1>
          <p className="text-gray-500">Acompanhe seus pedidos e investimentos em serviços.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div 
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Spending Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Histórico de Investimento</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Investido']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#f97316" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats / Info */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Status dos Pedidos</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Pendentes</span>
                </div>
                <span className="font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Pagos</span>
                </div>
                <span className="font-bold text-blue-600">{orders.filter(o => o.status === 'paid').length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-600" />
                  <span className="text-sm font-medium text-green-900">Concluídos</span>
                </div>
                <span className="font-bold text-green-600">{orders.filter(o => o.status === 'completed').length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <XCircle size={20} className="text-red-600" />
                  <span className="text-sm font-medium text-red-900">Cancelados</span>
                </div>
                <span className="font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Histórico de Pedidos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Serviço</th>
                  <th className="px-6 py-4 font-medium">Vendedor</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Valor</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length > 0 ? orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.serviceTitle}</div>
                      <div className="text-xs text-gray-400">ID: {order.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{order.sellerName || 'Vendedor'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.createdAt ? format(order.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">R$ {order.price.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.status === 'completed' ? 'Concluído' :
                         order.status === 'pending' ? 'Pendente' :
                         order.status === 'paid' ? 'Pago' : 'Cancelado'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <ShoppingBag className="mx-auto mb-4 opacity-20" size={48} />
                      <p>Você ainda não realizou nenhum pedido.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
