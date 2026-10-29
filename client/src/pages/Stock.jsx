import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  Sliders,
  History,
  X,
  Search,
  RefreshCw,
  FileText
} from 'lucide-react';

const Stock = () => {
  const { token, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'near_expiry' | 'expired' | 'movements'
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Add Batch Form
  const [batchForm, setBatchForm] = useState({
    medicine_id: '',
    batch_number: '',
    mfg_date: '',
    expiry_date: '',
    quantity: '',
    purchase_price: ''
  });

  // Adjust Form
  const [adjustForm, setAdjustForm] = useState({
    medicine_id: '',
    batch_id: '',
    quantity: '',
    type: 'ADJUSTMENT',
    notes: 'Damaged / Expired stock write-off'
  });

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchMedicines = async () => {
    try {
      const res = await fetch('/api/medicines', { headers });
      const data = await res.json();
      if (data.success) setMedicines(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      let url = '/api/stock/batches?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (activeTab === 'near_expiry') url += 'near_expiry=true&';
      if (activeTab === 'expired') url += 'expired=true&';

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) setBatches(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock/movements', { headers });
      const data = await res.json();
      if (data.success) setMovements(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovements();
    } else {
      fetchBatches();
    }
  }, [activeTab, search, token]);

  const handleAddBatch = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch('/api/stock/batch', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...batchForm,
          medicine_id: parseInt(batchForm.medicine_id),
          quantity: parseInt(batchForm.quantity),
          purchase_price: parseFloat(batchForm.purchase_price) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddBatchModal(false);
        fetchBatches();
      } else {
        setFormError(data.message || 'Failed to add batch');
      }
    } catch {
      setFormError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medicine_id: parseInt(adjustForm.medicine_id),
          batch_id: adjustForm.batch_id ? parseInt(adjustForm.batch_id) : null,
          quantity: parseInt(adjustForm.quantity),
          notes: adjustForm.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAdjustModal(false);
        fetchBatches();
      } else {
        setFormError(data.message || 'Stock adjustment failed');
      }
    } catch {
      setFormError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const selectedMedBatches = adjustForm.medicine_id
    ? batches.filter((b) => b.medicine_id === parseInt(adjustForm.medicine_id))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" /> Stock & Batch Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track batches, monitor FEFO/FIFO expiry dates, and record stock movements.
          </p>
        </div>
        {hasRole('admin', 'pharmacist') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAdjustForm({
                  medicine_id: medicines[0]?.id || '',
                  batch_id: '',
                  quantity: '',
                  type: 'ADJUSTMENT',
                  notes: 'Damage / Correction'
                });
                setFormError('');
                setShowAdjustModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              <Sliders className="w-3.5 h-3.5" /> Adjust Stock
            </button>
            <button
              onClick={() => {
                setBatchForm({
                  medicine_id: medicines[0]?.id || '',
                  batch_number: `BCH-${Math.floor(1000 + Math.random() * 9000)}`,
                  mfg_date: new Date().toISOString().slice(0, 10),
                  expiry_date: '',
                  quantity: '',
                  purchase_price: ''
                });
                setFormError('');
                setShowAddBatchModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Receive Batch
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'batches'
                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Active Batches
          </button>
          <button
            onClick={() => setActiveTab('near_expiry')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'near_expiry'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Near Expiry (&lt;90 days)
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'expired'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" /> Expired Stock
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'movements'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Movement History
          </button>
        </div>

        {activeTab !== 'movements' && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search batch or medicine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-slate-800"
            />
          </div>
        )}
      </div>

      {/* Tab Content: Batches Table */}
      {activeTab !== 'movements' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/60">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Mfg Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Days Left</th>
                  <th className="py-3 px-4">In Stock</th>
                  <th className="py-3 px-4">Purchase Price</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      Loading stock batches...
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      No batches found for this view.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => {
                    const days = b.days_until_expiry != null
                      ? b.days_until_expiry
                      : Math.round((new Date(b.expiry_date) - new Date()) / 86400000);
                    const isExpired = days < 0;
                    const isNear = days >= 0 && days <= 90;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {b.batch_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{b.medicine_name || b.name}</p>
                          <p className="text-[11px] text-slate-400">{b.category_name}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{b.unit || 'Tablet'}</td>
                        <td className="py-3 px-4 text-slate-500">{b.mfg_date ? b.mfg_date.slice(0, 10) : '-'}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{b.expiry_date.slice(0, 10)}</td>
                        <td className="py-3 px-4">
                          {isExpired ? (
                            <span className="font-bold text-rose-600">Expired ({Math.abs(days)}d ago)</span>
                          ) : isNear ? (
                            <span className="font-bold text-amber-600">{days} days remaining</span>
                          ) : (
                            <span className="text-slate-600">{days} days</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 text-sm">{b.quantity}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">₹{Number(b.purchase_price || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          {isExpired ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Expired
                            </span>
                          ) : isNear ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Near Expiry
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Movement History Table */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/60">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Notes / Reason</th>
                  <th className="py-3 px-4">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      Loading movement logs...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No stock adjustments or transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(m.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            m.type === 'IN'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.type === 'OUT'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{m.medicine_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{m.batch_number || '-'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{m.quantity}</td>
                      <td className="py-3 px-4 text-slate-600">{m.notes || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{m.performed_by || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Receive Batch */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-600" /> Receive New Batch
              </h2>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddBatch} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Medicine *</label>
                <select
                  required
                  value={batchForm.medicine_id}
                  onChange={(e) => setBatchForm({ ...batchForm, medicine_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Select Medicine</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit || 'Tablet'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Batch Number *</label>
                <input
                  type="text"
                  required
                  value={batchForm.batch_number}
                  onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="e.g. PAR-B005"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mfg Date</label>
                  <input
                    type="date"
                    value={batchForm.mfg_date}
                    onChange={(e) => setBatchForm({ ...batchForm, mfg_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={batchForm.expiry_date}
                    onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Quantity Received *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchForm.quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchForm.purchase_price}
                    onChange={(e) => setBatchForm({ ...batchForm, purchase_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="2.50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add to Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Stock */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" /> Stock Adjustment
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdjustStock} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Medicine *</label>
                <select
                  required
                  value={adjustForm.medicine_id}
                  onChange={(e) => setAdjustForm({ ...adjustForm, medicine_id: e.target.value, batch_id: '' })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Select Medicine</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit || 'Tablet'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Batch (Optional)</label>
                <select
                  value={adjustForm.batch_id}
                  onChange={(e) => setAdjustForm({ ...adjustForm, batch_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Any Batch / General</option>
                  {selectedMedBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} (Qty: {b.quantity}, Exp: {b.expiry_date.slice(0, 10)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Quantity Adjustment (positive to add, negative to deduct) *
                </label>
                <input
                  type="number"
                  required
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="e.g. -5 or +10"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reason / Notes *</label>
                <input
                  type="text"
                  required
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="e.g. Damaged during storage, expiry write-off"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Adjusting...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
