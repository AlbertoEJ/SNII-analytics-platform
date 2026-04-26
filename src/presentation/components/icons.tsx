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

export const GitHubIcon = ({ className }: Props) => (
  <svg viewBox="0 0 24 24" className={className ?? base} fill="currentColor" stroke="none" aria-hidden>
    <path d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.69-3.88-1.37-3.88-1.37-.52-1.34-1.27-1.7-1.27-1.7-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.9-.39.99 0 1.97.13 2.9.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.21 21.41 23.5 17.1 23.5 12.02 23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

export const HistoricIcon = ({ className }: Props) => (
  <svg viewBox="0 0 24 24" className={className ?? base} {...stroke} aria-hidden>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 5v4h4" />
    <path d="M12 7v5l3 2" />
  </svg>
);
