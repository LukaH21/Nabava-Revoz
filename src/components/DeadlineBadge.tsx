export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-xs text-slate-400">brez roka</span>;
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0)
    return <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">Rok potekel ({deadline})</span>;
  if (days <= 2)
    return <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-700">Rok čez {days} dni ({deadline})</span>;
  return <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">Rok: {deadline}</span>;
}
