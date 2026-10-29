import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Pill, Package, ShoppingCart, Users, Calendar, BarChart2, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { user, hasRole } = useAuth();

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-md transition-colors duration-150 ${
      isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <aside className="w-64 h-screen bg-white shadow-md p-4 rounded-r-lg overflow-y-auto">
      <div className="text-xl font-semibold mb-6 text-primary-600 flex items-center gap-2">
        <span className="text-primary-500"><Home size={24} /></span>
        <span>PharmaCare</span>
      </div>
      <nav className="space-y-1">
        <NavLink to="/" end className={linkClasses}>
          <Home size={20} /> Dashboard
        </NavLink>
        <NavLink to="/medicines" className={linkClasses}>
          <Pill size={20} /> Medicines
        </NavLink>
        <NavLink to="/stock" className={linkClasses}>
          <Package size={20} /> Stock
        </NavLink>
        <NavLink to="/billing" className={linkClasses}>
          <ShoppingCart size={20} /> Billing
        </NavLink>
        <NavLink to="/suppliers" className={linkClasses}>
          <Users size={20} /> Suppliers
        </NavLink>
        <NavLink to="/reports" className={linkClasses}>
          <BarChart2 size={20} /> Reports
        </NavLink>
        {hasRole('admin') && (
          <NavLink to="/users" className={linkClasses}>
            <Settings size={20} /> Users
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
