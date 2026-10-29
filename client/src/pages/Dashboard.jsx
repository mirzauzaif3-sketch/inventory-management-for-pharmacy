import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
  Pill,
  Package,
  AlertTriangle,
  XCircle,
  TrendingUp,
  DollarSign,
  PlusCircle,
  ShoppingCart,
  Layers,
  ArrowRight
} from 'lucide-react';

const StatCard = ({ title, value, icon, color = 'blue', subtext }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1.5">{value}</p>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
        {icon}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [stockOverview, setStockOverview] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, salesRes, lowRes, overviewRes] = await Promise.all([
          fetch('/api/dashboard/stats', { headers }).then(r => r.json()),
          fetch('/api/dashboard/recent-sales', { headers }).then(r => r.json()),
          fetch('/api/dashboard/low-stock', { headers }).then(r => r.json()),
          fetch('/api/dashboard/stock-overview', { headers }).then(r => r.json())
        ]);
        if (statsRes.success) setStats(statsRes.data || {});
        if (salesRes.success) setRecentSales(salesRes.data || []);
        if (lowRes.success) setLowStock(lowRes.data || []);
        if (overviewRes.success) setStockOverview(overviewRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Welcome back, {user?.full_name || user?.username || 'Pharmacist'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Overview of pharmacy stock, active sales, and inventory alerts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" /> New Sale / POS
          </button>
          <button
            onClick={() => navigate('/medicines')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Add Medicine
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Medicines"
          value={stats.totalMedicines ?? '-'}
          color="blue"
          icon={<Pill className="w-5 h-5" />}
        />
        <StatCard
          title="Stock In Hand"
          value={stats.availableStock ?? '-'}
          color="emerald"
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockCount ?? '-'}
          color="amber"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <StatCard
          title="Out of Stock"
          value={stats.outOfStockCount ?? '-'}
          color="rose"
          icon={<XCircle className="w-5 h-5" />}
        />
        <StatCard
          title="Today's Sales"
          value={stats.todaySalesTotal != null ? `₹${Number(stats.todaySalesTotal).toFixed(2)}` : '₹0.00'}
          color="teal"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Inventory Value"
          value={stats.inventoryValue != null ? `₹${Number(stats.inventoryValue).toFixed(2)}` : '₹0.00'}
          color="indigo"
          icon={<DollarSign className="w-5 h-5" />}
        />
      </div>

      {/* Main Grid: Chart & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Overview Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Stock by Category</h2>
              <p className="text-xs text-slate-500">Live quantity of available units per category</p>
            </div>
            <button
              onClick={() => navigate('/stock')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Manage Stock <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-72 w-full">
            {stockOverview.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockOverview} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value) => [`${value} units`, 'Stock']}
                  />
                  <Bar dataKey="total_stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
            </h2>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
              {lowStock.length} items
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Medicines below their minimum safe threshold</p>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-72 pr-1">
            {lowStock.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                All medicines are sufficiently stocked!
              </div>
            ) : (
              lowStock.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 hover:bg-amber-50/50 hover:border-amber-200 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Min: <span className="font-medium text-slate-700">{m.min_stock_level}</span> | Unit: {m.unit || 'Tablet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      {m.current_stock || 0}
                    </span>
                    <button
                      onClick={() => navigate('/stock')}
                      className="text-xs text-primary-600 hover:text-primary-800 font-semibold px-2 py-1 rounded bg-white border border-slate-200 shadow-2xs"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Recent Transactions</h2>
            <p className="text-xs text-slate-500">Latest completed counter and prescription bills</p>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            All Sales Reports <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/60">
                <th className="py-2.5 px-4 rounded-l-lg">Invoice #</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Payment</th>
                <th className="py-2.5 px-4">Total Amount</th>
                <th className="py-2.5 px-4 rounded-r-lg">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    No sales recorded yet. Click "New Sale" to create an invoice.
                  </td>
                </tr>
              ) : (
                recentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-primary-700">{s.invoice_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{s.customer_name || 'Walk-in Customer'}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.payment_method || 'cash'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      ₹{Number(s.total).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(s.created_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
