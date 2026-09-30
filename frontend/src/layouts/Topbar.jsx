import { useState } from 'react';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../utils/labels.js';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-steel-200 bg-white px-4 sm:px-6">
      <button className="rounded p-1.5 text-steel-600 hover:bg-steel-100 lg:hidden" onClick={onMenu} aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
      <p className="hidden text-sm font-medium text-steel-500 lg:block">Boucherie Mira-Mk — Lubumbashi</p>
      <div className="relative">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-steel-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-800 text-xs font-semibold text-white">{initials}</span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-steel-800">{user?.firstName} {user?.lastName}</span>
            <span className="block text-xs leading-tight text-steel-500">{ROLE_LABELS[user?.role] || user?.role}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-steel-400" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-steel-200 bg-white py-1 shadow-lg">
              <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-cure-600 hover:bg-steel-50"><LogOut className="h-4 w-4" /> Se déconnecter</button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
