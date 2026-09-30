import React from 'react';

export default function StatCard({ label, value, icon: Icon, accent = 'brand' }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg bg-${accent}-50 text-${accent}-600`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
