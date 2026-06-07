import type { LucideIcon } from 'lucide-react';

export function StatCard({ title, value, icon: Icon, hint }: { title: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="rounded-2xl bg-emerald-50 p-3 text-pitch">
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
