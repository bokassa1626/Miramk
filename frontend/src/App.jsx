import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import { Loading } from './components/ui.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Products = lazy(() => import('./pages/Products.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const Stock = lazy(() => import('./pages/Stock.jsx'));
const Purchases = lazy(() => import('./pages/Purchases.jsx'));
const Suppliers = lazy(() => import('./pages/Suppliers.jsx'));
const Sales = lazy(() => import('./pages/Sales.jsx'));
const Invoices = lazy(() => import('./pages/Invoices.jsx'));
const Expenses = lazy(() => import('./pages/Expenses.jsx'));
const Inventory = lazy(() => import('./pages/Inventory.jsx'));
const Losses = lazy(() => import('./pages/Losses.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const Audit = lazy(() => import('./pages/Audit.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><Loading label="Chargement de la page…" /></div>}>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route element={<ProtectedRoute perm="products:read" />}>
            <Route path="/products" element={<Products />} />
          </Route>
          <Route element={<ProtectedRoute perm="categories:read" />}>
            <Route path="/categories" element={<Categories />} />
          </Route>
          <Route element={<ProtectedRoute perm="stock:read" />}>
            <Route path="/stock" element={<Stock />} />
          </Route>
          <Route element={<ProtectedRoute perm="purchases:read" />}>
            <Route path="/purchases" element={<Purchases />} />
          </Route>
          <Route element={<ProtectedRoute perm="suppliers:read" />}>
            <Route path="/suppliers" element={<Suppliers />} />
          </Route>
          <Route element={<ProtectedRoute perm="sales:read" />}>
            <Route path="/sales" element={<Sales />} />
          </Route>
          <Route element={<ProtectedRoute perm="invoices:read" />}>
            <Route path="/invoices" element={<Invoices />} />
          </Route>
          <Route element={<ProtectedRoute perm="expenses:read" />}>
            <Route path="/expenses" element={<Expenses />} />
          </Route>
          <Route element={<ProtectedRoute perm="inventory:read" />}>
            <Route path="/inventory" element={<Inventory />} />
          </Route>
          <Route element={<ProtectedRoute perm="losses:read" />}>
            <Route path="/losses" element={<Losses />} />
          </Route>
          <Route element={<ProtectedRoute perm="reports:read" />}>
            <Route path="/reports" element={<Reports />} />
          </Route>
          <Route element={<ProtectedRoute perm="users:manage" />}>
            <Route path="/users" element={<Users />} />
          </Route>
          <Route element={<ProtectedRoute perm="audit:read" />}>
            <Route path="/audit" element={<Audit />} />
          </Route>
          <Route element={<ProtectedRoute perm="settings:write" />}>
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
