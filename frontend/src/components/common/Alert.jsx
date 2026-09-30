import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Alert({ type = 'error', message }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm mb-4 ${
        isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
      }`}
    >
      {isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
      {message}
    </div>
  );
}
