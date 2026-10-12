import { FALLBACK_STATUS } from "@/lib/status-labels";

type StatusMap = Record<string, { label: string; className: string }>;

export function StatusBadge({ status, map }: { status: string; map: StatusMap }) {
  const s = map[status] ?? { ...FALLBACK_STATUS, label: status };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.className}`}>
      {s.label}
    </span>
  );
}
