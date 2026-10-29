import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  FileText,
  User,
  Phone,
  CreditCard,
  Banknote,
  Smartphone,
  Pill,
  X,
  AlertCircle
} from 'lucide-react';

const Billing = () => {
  const { token, user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchMedicines = async () => {
    try {
      const res = await fetch('/api/medicines', { headers });
      const data = await res.json();
      if (data.success) {
        setMedicines(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [token]);

  const addToCart = (med) => {
    const existing = cart.find((item) => item.medicine_id === med.id);
    const available = med.current_stock || 0;

    if (available <= 0) {
      alert(`${med.name} is currently out of stock!`);
      return;
    }

    if (existing) {
      if (existing.quantity >= available) {
        alert(`Cannot add more than available stock (${available}) for ${med.name}.`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.medicine_id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          medicine_id: med.id,
          name: med.name,
          generic_name: med.generic_name,
          unit: med.unit || 'Tablet',
          price: parseFloat(med.selling_price) || 0,
          max_stock: available,
          quantity: 1
        }
      ]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(
      cart
        .map((item) => {
          if (item.medicine_id === id) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.max_stock) {
              alert(`Only ${item.max_stock} units available in stock!`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.medicine_id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = (subtotal * (parseFloat(discountPercent) || 0)) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * (parseFloat(taxPercent) || 0)) / 100;
  const grandTotal = taxableAmount + taxAmount;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Please add at least one medicine to the bill.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const payload = {
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim() || '',
        items: cart.map((c) => ({
          medicine_id: c.medicine_id,
          quantity: c.quantity
        })),
        discount_percent: parseFloat(discountPercent) || 0,
        tax_percent: parseFloat(taxPercent) || 0,
        payment_method: paymentMethod,
        notes: notes.trim()
      };

      const res = await fetch('/api/billing/sale', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setCompletedInvoice({
          invoice_number: data.invoice_number,
          sale_id: data.sale_id,
          date: new Date().toLocaleString('en-IN'),
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          items: cart,
          subtotal,
          discountAmount,
          taxAmount,
          total: data.total || grandTotal,
          payment_method: paymentMethod,
          cashier: user?.full_name || user?.username || 'Pharmacist'
        });
        // Clear cart
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setNotes('');
        setDiscountPercent(0);
        // Refresh catalog stock
        fetchMedicines();
      } else {
        setErrorMsg(data.message || 'Sale checkout failed.');
      }
    } catch {
      setErrorMsg('Network error while completing sale.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMedicines = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" /> POS Billing Terminal
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create patient invoices, dispense medicines, and deduct batch stock automatically via FIFO.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> FIFO Stock Auto-Allocation Active
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Split POS Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Medicine Search & Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search drug by brand or composition to add to cart..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Available Medicines ({filteredMedicines.length})
              </h2>
              <span className="text-[11px] text-slate-400">Click item to add to bill</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {filteredMedicines.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No medicines found matching "{search}".
                </div>
              ) : (
                filteredMedicines.map((m) => {
                  const inStock = (m.current_stock || 0) > 0;
                  return (
                    <div
                      key={m.id}
                      onClick={() => inStock && addToCart(m)}
                      className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                        inStock
                          ? 'hover:bg-slate-50 cursor-pointer'
                          : 'opacity-50 cursor-not-allowed bg-slate-50/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{m.name}</p>
                          <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">
                            {m.unit || 'Tablet'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {m.generic_name || 'General formulation'} &bull; {m.category_name}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right flex-shrink-0">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            ₹{Number(m.selling_price).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {inStock ? (
                              <span className="text-emerald-600 font-semibold">{m.current_stock} in stock</span>
                            ) : (
                              <span className="text-rose-500 font-semibold">Out of Stock</span>
                            )}
                          </p>
                        </div>
                        {inStock && (
                          <button
                            type="button"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors border border-emerald-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Invoice Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Current Bill ({cart.length} items)
            </h2>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-rose-500 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Customer Inputs */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Customer Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Optional"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Cart Items Table */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Cart is empty. Select medicines from the left to start billing.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.medicine_id} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400">
                        ₹{item.price.toFixed(2)} &times; {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.medicine_id, -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-slate-800">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.medicine_id, 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.medicine_id)}
                        className="p-1 text-slate-400 hover:text-rose-500 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing Adjustments */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">GST / Tax %</label>
              <input
                type="number"
                min="0"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                { id: 'card', label: 'Card', icon: CreditCard }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    paymentMethod === id
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600 border border-slate-200/60">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({discountPercent}%):</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>GST / Tax ({taxPercent}%):</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-emerald-700">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || submitting}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Generating Invoice...' : `Complete Sale & Print Bill (₹${grandTotal.toFixed(2)})`}
          </button>
        </div>
      </div>

      {/* Completed Invoice Modal */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-primary-600">PharmaCare Medical Store</h3>
                <p className="text-[11px] text-slate-400">Retail Drug License: DL-2024-KA-88741</p>
                <p className="text-[11px] text-slate-400">GSTIN: 29AABCD1234E1Z5 &bull; Ph: 9876543210</p>
              </div>
              <button
                onClick={() => setCompletedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
              <span className="text-xs font-bold text-emerald-800">
                Invoice #{completedInvoice.invoice_number}
              </span>
              <p className="text-[10px] text-emerald-600">Payment: {completedInvoice.payment_method.toUpperCase()}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 border-b border-slate-100 text-slate-600">
              <div>
                <p className="text-[10px] text-slate-400">Customer:</p>
                <p className="font-semibold text-slate-800">{completedInvoice.customer_name}</p>
                {completedInvoice.customer_phone && <p className="text-[10px]">{completedInvoice.customer_phone}</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Date & Cashier:</p>
                <p>{completedInvoice.date}</p>
                <p className="text-[10px] text-slate-500">By {completedInvoice.cashier}</p>
              </div>
            </div>

            <div className="py-3 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
              {completedInvoice.items.map((it, idx) => (
                <div key={idx} className="py-1.5 flex justify-between">
                  <div>
                    <span className="font-medium text-slate-800">{it.name}</span>
                    <span className="text-slate-400 text-[10px] ml-1">x{it.quantity}</span>
                  </div>
                  <span className="font-semibold text-slate-800">₹{(it.price * it.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-2 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{completedInvoice.subtotal.toFixed(2)}</span>
              </div>
              {completedInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>-₹{completedInvoice.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST:</span>
                <span>₹{completedInvoice.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Paid Amount:</span>
                <span className="text-emerald-700">₹{completedInvoice.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                onClick={() => setCompletedInvoice(null)}
                className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold"
              >
                Start New Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
