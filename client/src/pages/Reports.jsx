import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  BarChart2,
  TrendingUp,
  DollarSign,
  AlertOctagon,
  Download,
  Calendar,
  FileSpreadsheet,
  Award,
  RefreshCw
} from 'lucide-react';

const Reports = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState({});
  const [trend, setTrend] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [valuation, setValuation] = useState([]);
  const [expiryReport, setExpiryReport] = useState([]);
  const [daysFilter, setDaysFilter] = useState(30);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [sumRes, trendRes, topRes, valRes, expRes] = await Promise.all([
        fetch('/api/reports/summary', { headers }).then(r => r.json()),
        fetch(`/api/reports/sales-trend?days=${daysFilter}`, { headers }).then(r => r.json()),
        fetch('/api/reports/top-selling?limit=5', { headers }).then(r => r.json()),
        fetch('/api/reports/inventory-valuation', { headers }).then(r => r.json()),
        fetch('/api/reports/expiry-report', { headers }).then(r => r.json())
      ]);

      if (sumRes.success) setSummary(sumRes.data || {});
      if (trendRes.success) setTrend(trendRes.data || []);
      if (topRes.success) setTopSelling(topRes.data || []);
      if (valRes.success) setValuation(valRes.data || []);
      if (expRes.success) setExpiryReport(expRes.data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [daysFilter, token]);

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary-600" /> Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Financial auditing, profit margins, sales volume, and risk evaluation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">This Year</option>
          </select>
          <button
            onClick={() => exportCSV(topSelling, 'top_selling_medicines')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sales Revenue</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            ₹{Number(summary.total_revenue || 0).toFixed(2)}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> From {summary.total_sales || 0} completed invoices
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Estimated Gross Profit</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ₹{Number(summary.gross_profit || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Selling Price minus Cost of Goods</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Inventory Value</p>
          <p className="text-2xl font-bold text-primary-700 mt-1">
            ₹{Number(summary.inventory_value || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Current unexpired retail stock</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expired Stock Loss</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            ₹{Number(summary.expired_value || 0).toFixed(2)}
          </p>
          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5" /> Written-off expired inventory
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Daily Revenue Trend</h2>
          <p className="text-xs text-slate-400 mb-4">Daily gross receipts over the last {daysFilter} days</p>

          <div className="h-64 w-full">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="sale_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No trend data recorded for this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Inventory Valuation by Category */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Inventory Valuation by Category</h2>
          <p className="text-xs text-slate-400 mb-4">Stock capital allocation across therapy classes</p>

          <div className="h-64 w-full">
            {valuation.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valuation} margin={{ top: 10, right: 10, left: -10, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category_name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Valuation']}
                  />
                  <Bar dataKey="total_value" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No valuation data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Medicines */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Fast-Moving Medicines
            </h2>
            <p className="text-xs text-slate-500">Highest volume medicines dispensed across all sales</p>
          </div>
          <button
            onClick={() => exportCSV(topSelling, 'top_selling_medicines')}
            className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Download Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/60">
                <th className="py-2.5 px-4 rounded-l-lg">Medicine Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Unit Price</th>
                <th className="py-2.5 px-4">Units Sold</th>
                <th className="py-2.5 px-4 rounded-r-lg">Gross Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {topSelling.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    No sales data available.
                  </td>
                </tr>
              ) : (
                topSelling.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {m.medicine_name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{m.category_name}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">₹{Number(m.unit_price).toFixed(2)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{m.total_quantity_sold} units</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">₹{Number(m.total_revenue).toFixed(2)}</td>
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

export default Reports;
