import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';
import { DollarSign, ShoppingBag, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function AdminDashboard() {
  const { user, isAdmin, role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    totalRevenue: 0, 
    totalOrders: 0, 
    recentOrders: [] as any[],
    chartData: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'comprador' && !isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [role, isAdmin, navigate]);

  const fetchStats = async () => {
    if (!user) return;
    try {
      let ordersQuery;
      if (isAdmin) {
        ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      } else {
        ordersQuery = query(
          collection(db, 'orders'), 
          where('sellerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }
      
      const ordersSnapshot = await getDocs(ordersQuery);
      
      let revenue = 0;
      const recent = [] as any[];
      const ordersByDay: Record<string, number> = {};

      // Prepare last 7 days for chart
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        ordersByDay[format(date, 'yyyy-MM-dd')] = 0;
      }

      ordersSnapshot.docs.forEach((doc, index) => {
        const data = doc.data() as any;
        if (data.status !== 'cancelled') {
          revenue += data.price;
          
          if (data.createdAt) {
            const dateKey = format(data.createdAt.toDate(), 'yyyy-MM-dd');
            if (ordersByDay[dateKey] !== undefined) {
              ordersByDay[dateKey] += data.price;
            }
          }
        }
        if (index < 5) {
          recent.push({ id: doc.id, ...data });
        }
      });

      const chartData = Object.entries(ordersByDay).map(([date, value]) => ({
        name: format(new Date(date + 'T00:00:00'), 'dd/MM'),
        value: value
      }));

      setStats({
        totalRevenue: revenue,
        totalOrders: ordersSnapshot.size,
        recentOrders: recent,
        chartData: chartData
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
      
      // Send Email if status is completed or paid
      if (newStatus === 'completed' || newStatus === 'paid') {
        const order = stats.recentOrders.find(o => o.id === id);
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

      await fetchStats();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Erro ao atualizar status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div className="p-8 flex items-center justify-center">Carregando...</div>;

  const statCards = [
    { title: 'Receita Total', value: `R$ ${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100', trend: '+12.5%', trendUp: true },
    { title: 'Pedidos', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100', trend: '+5.2%', trendUp: true },
    { title: 'Conversão', value: '12.5%', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100', trend: '-1.2%', trendUp: false },
    { title: 'Visitas', value: '1,240', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100', trend: '+18%', trendUp: true },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Profissional</h1>
        <p className="text-gray-500">Visão geral das suas vendas e desempenho.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <Icon size={24} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.trend}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Desempenho de Vendas</h2>
            <select className="text-sm border-none bg-gray-50 rounded-lg px-3 py-1 outline-none">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
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
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
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

        {/* Recent Activity / History */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Histórico Geral</h2>
          <div className="space-y-6">
            {stats.recentOrders.map((order, index) => (
              <div key={order.id} className="flex gap-4 relative">
                {index !== stats.recentOrders.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-100"></div>
                )}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  order.status === 'completed' ? 'bg-green-100 text-green-600' :
                  order.status === 'paid' ? 'bg-blue-100 text-blue-600' :
                  'bg-orange-100 text-orange-600'
                }`}>
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{order.serviceTitle}</p>
                  <p className="text-xs text-gray-500">
                    {order.customerName} • R$ {order.price.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase">
                    {order.createdAt ? format(order.createdAt.toDate(), "dd MMM, HH:mm", { locale: ptBR }) : '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link 
            to="/admin/orders"
            className="w-full mt-8 py-3 text-sm font-bold text-gray-600 hover:text-orange-500 transition-colors border-t border-gray-50 flex items-center justify-center gap-2"
          >
            Ver todos os pedidos
          </Link>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Últimas Vendas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Serviço</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recentOrders.length > 0 ? stats.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{order.serviceTitle}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {order.createdAt ? format(order.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">R$ {order.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {updatingId === order.id ? (
                        <Loader2 className="animate-spin text-orange-500" size={16} />
                      ) : (
                        <select 
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className={`text-xs border-none rounded-full px-3 py-1 font-medium cursor-pointer outline-none ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum pedido recente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
