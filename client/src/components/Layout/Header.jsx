import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between bg-white shadow-sm px-6 py-3 rounded-b-lg">
      <h1 className="text-2xl font-semibold text-gray-800">PharmaCare</h1>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 text-gray-600">
          <User size={20} /> {user?.full_name || user?.username}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors"
        >
          <LogOut size={20} /> Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
