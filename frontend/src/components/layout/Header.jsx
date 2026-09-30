import React from 'react';
import { LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ title }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between bg-white border-b px-6 py-4">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UserCircle className="w-5 h-5" />
          <span>{user?.fullName}</span>
          <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">
            {user?.role}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
