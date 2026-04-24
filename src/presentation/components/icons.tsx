// Minimal inline icons (Lucide-inspired). Avoids an icon dep.
type Props = { className?: string };
const base = "w-full h-full stroke-current fill-none";
const stroke = { strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const MapIcon = ({ className }: Props) => (
  <svg viewBox="0 0 24 24" className={className ?? base} {...stroke}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

export const UsersIcon = ({ className }: Props) => (
  <svg viewBox="0 0 24 24" className={className ?? base} {...stroke}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const ChartIcon = ({ className }: Props) => (
  <svg viewBox="0 0 24 24" className={className ?? base} {...stroke}>
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 4 4 5-6" />
  </svg>
);

export const SearchIcon = ({ className }: Props) => (
  <svg viewBox="0 0 24 24" className={className ?? base} {...stroke}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const MenuIcon = ({ className }: Props) => (
  <svg viewBox="0 0 24 24" className={className ?? base} {...stroke}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const CloseIcon = ({ className }: Props) => (
  <svg viewBox="0 0 24 24" className={className ?? base} {...stroke}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
