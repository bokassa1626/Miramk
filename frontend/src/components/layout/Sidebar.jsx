import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Receipt,
  FileText,
  Wallet,
  BarChart3,
  Users,
  Beef,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/products', label: 'Produits', icon: Package, roles: ['ADMIN', 'MANAGER'] },
  { to: '/stock', label: 'Stock', icon: Boxes, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/purchases', label: 'Achats', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER'] },
  { to: '/sales', label: 'Ventes', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/invoices', label: 'Factures', icon: FileText, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/expenses', label: 'Dépenses', icon: Wallet, roles: ['ADMIN', 'MANAGER'] },
  { to: '/reports', label: 'Rapports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Utilisateurs', icon: Users, roles: ['ADMIN'] },
];

export default function Sidebar() {
  const { role } = useAuth();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-brand-800 text-white min-h-screen">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-brand-700">
        <Beef className="w-7 h-7" />
        <div>
          <p className="font-bold leading-tight">Boucherie Mira-Mk</p>
          <p className="text-xs text-brand-200">Gestion & Ventes</p>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {links
          .filter((l) => l.roles.includes(role))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}
