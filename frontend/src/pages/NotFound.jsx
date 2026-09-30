import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-display text-5xl font-bold text-steel-300">404</p>
      <p className="mt-2 text-steel-600">Cette page n'existe pas.</p>
      <Link to="/" className="btn-primary mt-4">Retour au tableau de bord</Link>
    </div>
  );
}
