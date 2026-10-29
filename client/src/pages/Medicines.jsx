import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Pill,
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  RefreshCw
} from 'lucide-react';

const Medicines = () => {
  const { token, hasRole } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    category_id: '',
    supplier_id: '',
    description: '',
    purchase_price: '',
    selling_price: '',
    min_stock_level: 10,
    unit: 'Tablet',
    manufacturer: ''
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (stockFilter) params.append('stock_status', stockFilter);

      const res = await fetch(`/api/medicines?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.success) {
        setMedicines(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [catRes, supRes] = await Promise.all([
        fetch('/api/categories', { headers }).then(r => r.json()),
        fetch('/api/suppliers', { headers }).then(r => r.json())
      ]);
      if (catRes.success) setCategories(catRes.data || []);
      if (supRes.success) setSuppliers(supRes.data || []);
    } catch (err) {
      console.error('Failed to load categories/suppliers:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedicines();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, stockFilter, token]);

  const openAddModal = () => {
    setEditingMedicine(null);
    setFormData({
      name: '',
      generic_name: '',
      category_id: categories[0]?.id || '',
      supplier_id: suppliers[0]?.id || '',
      description: '',
      purchase_price: '',
      selling_price: '',
      min_stock_level: 10,
      unit: 'Tablet',
      manufacturer: ''
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (med) => {
    setEditingMedicine(med);
    setFormData({
      name: med.name,
      generic_name: med.generic_name || '',
      category_id: med.category_id || '',
      supplier_id: med.supplier_id || '',
      description: med.description || '',
      purchase_price: med.purchase_price,
      selling_price: med.selling_price,
      min_stock_level: med.min_stock_level,
      unit: med.unit || 'Tablet',
      manufacturer: med.manufacturer || ''
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const url = editingMedicine ? `/api/medicines/${editingMedicine.id}` : '/api/medicines';
      const method = editingMedicine ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          purchase_price: parseFloat(formData.purchase_price) || 0,
          selling_price: parseFloat(formData.selling_price) || 0,
          min_stock_level: parseInt(formData.min_stock_level) || 10,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchMedicines();
      } else {
        setFormError(data.message || 'Operation failed');
      }
    } catch {
      setFormError('Network error while saving medicine');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (med) => {
    if (!window.confirm(`Are you sure you want to remove "${med.name}"?`)) return;
    try {
      const res = await fetch(`/api/medicines/${med.id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (data.success) {
        fetchMedicines();
      } else {
        alert(data.message || 'Failed to delete');
      }
    } catch (err) {
      alert('Error deleting medicine');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary-600" /> Medicine Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage drug catalog, pricing, formulation units, and safe stock thresholds.
          </p>
        </div>
        {hasRole('admin', 'pharmacist') && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Medicine
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by brand name or generic composition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Stock Levels</option>
            <option value="normal">Normal Stock</option>
            <option value="low">Low Stock (≤ Threshold)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>

          <button
            onClick={fetchMedicines}
            className="p-2 text-slate-500 hover:text-primary-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/60">
                <th className="py-3 px-4">Medicine & Generic</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Cost / MRP</th>
                <th className="py-3 px-4">Available Stock</th>
                <th className="py-3 px-4">Status</th>
                {hasRole('admin', 'pharmacist') && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Loading medicine catalog...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No medicines match the selected search or filters.
                  </td>
                </tr>
              ) : (
                medicines.map((m) => {
                  const stock = m.current_stock || 0;
                  const isLow = stock > 0 && stock <= m.min_stock_level;
                  const isOut = stock === 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{m.name}</p>
                        <p className="text-[11px] text-slate-400 font-normal">{m.generic_name || 'Standard composition'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {m.category_name || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{m.manufacturer || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{m.unit || 'Tablet'}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">₹{Number(m.selling_price).toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">Cost: ₹{Number(m.purchase_price).toFixed(2)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 text-sm">{stock}</span>
                        <span className="text-[10px] text-slate-400 ml-1">/ min {m.min_stock_level}</span>
                      </td>
                      <td className="py-3 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>
                      {hasRole('admin', 'pharmacist') && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(m)}
                              className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md transition-colors"
                              title="Edit medicine"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {hasRole('admin') && (
                              <button
                                onClick={() => handleDelete(m)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete medicine"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Pill className="w-4 h-4 text-primary-600" />
                {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="e.g. Amoxicillin 500mg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Generic Name / Composition</label>
                  <input
                    type="text"
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="e.g. Amoxicillin Trihydrate"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Form / Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Tube">Tube (Ointment)</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Injection">Injection</option>
                    <option value="Sachet">Sachet</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Purchase Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Min Safe Stock Level</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Primary Supplier</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="e.g. Cipla Ltd, Sun Pharma"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingMedicine ? 'Update Medicine' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medicines;
