import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Beef, Tags, Boxes, ShoppingCart, Truck, Receipt, FileText,
  Wallet, ClipboardList, TriangleAlert, BarChart3, Users, ShieldCheck, Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, perm: 'dashboard:read' },
  { to: '/products', label: 'Produits', icon: Beef, perm: 'products:read' },
  { to: '/categories', label: 'Catégories', icon: Tags, perm: 'categories:read' },
  { to: '/stock', label: 'Stocks', icon: Boxes, perm: 'stock:read' },
  { to: '/purchases', label: 'Achats', icon: ShoppingCart, perm: 'purchases:read' },
  { to: '/suppliers', label: 'Fournisseurs', icon: Truck, perm: 'suppliers:read' },
  { to: '/sales', label: 'Ventes', icon: Receipt, perm: 'sales:read' },
  { to: '/invoices', label: 'Factures', icon: FileText, perm: 'invoices:read' },
  { to: '/expenses', label: 'Dépenses', icon: Wallet, perm: 'expenses:read' },
  { to: '/inventory', label: 'Inventaire', icon: ClipboardList, perm: 'inventory:read' },
  { to: '/losses', label: 'Pertes', icon: TriangleAlert, perm: 'losses:read' },
  { to: '/reports', label: 'Rapports', icon: BarChart3, perm: 'reports:read' },
  { to: '/users', label: 'Utilisateurs', icon: Users, perm: 'users:manage' },
  { to: '/audit', label: 'Audit', icon: ShieldCheck, perm: 'audit:read' },
  { to: '/settings', label: 'Paramètres', icon: Settings, perm: 'settings:write' },
];

export default function Sidebar({ onNavigate }) {
  const { can } = useAuth();
  return (
    <nav className="flex h-full flex-col bg-sky-950 text-sky-50/90">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600 font-display text-lg font-bold text-white">M</div>
        <div>
          <p className="font-display text-sm font-bold leading-tight text-white">Mira-Mk</p>
          <p className="text-[11px] leading-tight text-sky-50/60">Gestion & contrôle</p>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.filter((n) => can(n.perm)).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-600 text-white' : 'text-sky-50/75 hover:bg-white/5 hover:text-white'}`}>
            <n.icon className="h-4 w-4 shrink-0" />{n.label}
          </NavLink>
        ))}
      </div>
      <p className="px-5 pb-4 text-[11px] text-sky-50/60">Mitipisha, Gécamines, Av. de Kinshasa — Lubumbashi</p>
    </nav>
  );
}
