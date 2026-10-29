import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building,
  Edit2,
  Trash2,
  X,
  FileCheck,
  RefreshCw
} from 'lucide-react';

const Suppliers = () => {
  const { token, hasRole } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: ''
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers', { headers });
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [token]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      company: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_number: ''
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      company: sup.company || '',
      contact_person: sup.contact_person || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      gst_number: sup.gst_number || ''
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchSuppliers();
      } else {
        setFormError(data.message || 'Failed to save supplier');
      }
    } catch {
      setFormError('Network error while saving supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sup) => {
    if (!window.confirm(`Are you sure you want to remove supplier "${sup.name}"?`)) return;
    try {
      const res = await fetch(`/api/suppliers/${sup.id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (data.success) {
        fetchSuppliers();
      } else {
        alert(data.message || 'Failed to delete');
      }
    } catch {
      alert('Error deleting supplier');
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.company && s.company.toLowerCase().includes(search.toLowerCase())) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" /> Supplier Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage pharmaceutical vendors, medical distributors, contact persons, and GST details.
          </p>
        </div>
        {hasRole('admin', 'pharmacist') && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        )}
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search vendor by company or contact person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-slate-800"
          />
        </div>
        <button
          onClick={fetchSuppliers}
          className="p-2 text-slate-500 hover:text-primary-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">
            Loading suppliers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">
            No suppliers found. Click "Add Supplier" to register a new vendor.
          </div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex flex-col justify-between space-y-4 hover:border-primary-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">{s.name}</h3>
                    <p className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-0.5">
                      <Building className="w-3.5 h-3.5" /> {s.company || 'Direct Distributor'}
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Contact: <strong className="text-slate-800">{s.contact_person || 'Representative'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{s.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{s.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{s.address || '-'}</span>
                  </div>
                  {s.gst_number && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                      <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>GST: <span className="font-mono font-semibold">{s.gst_number}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {hasRole('admin', 'pharmacist') && (
                <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md transition-colors"
                    title="Edit supplier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {hasRole('admin') && (
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-600" />
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Supplier / Agency Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="e.g. MedPlus Distributors"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Parent Company / Brand</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="e.g. Sun Pharmaceutical Industries Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="e.g. Suresh Reddy"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="9845012345"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="supplier@company.com"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Office Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="e.g. 12 MG Road, Bangalore"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">GST / Tax ID</label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="29AABCD1234E1Z5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingSupplier ? 'Update Vendor' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
