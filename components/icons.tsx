// Shared line-icon set, replacing ad-hoc emoji used as functional icons across the app.
// All icons are 24x24 viewBox, stroke-based, and inherit color via currentColor so callers
// control size/color with className (e.g. "w-5 h-5 text-teal-600").

interface IconProps {
  className?: string;
}

export function AppleIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7c-3.5 0-6 2.7-6 6.8C6 18 8.5 21 11 21c.9 0 1.3-.4 2-.4s1.1.4 2 .4c2.5 0 5-3.2 5-7.1 0-1.7-.6-3.1-1.6-4-.9-.8-2.1-1.2-3.3-1.1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7c0-1.7.9-3 2.3-3.6M12 7c0-1.3-.5-2.5-1.5-3.3" />
    </svg>
  );
}

export function BulbIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.5.4.8 1 .8 1.6v.5h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0012 3z" />
    </svg>
  );
}

export function FireIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c4 0 6.5-2.5 6.5-6 0-2.8-1.7-4.4-2.8-6-.3.9-.9 1.9-1.7 2.4.2-2.5-1-5-3-6.4-.3 2-1 3-2.2 4.3C7.3 11.7 6 13 6 16c0 3.5 2 6 6 6z" />
    </svg>
  );
}

export function ZenIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c1.8-2.6 4-4 8-4s6.2 1.4 8 4M8 13c1-1.3 2.3-2 4-2s3 .7 4 2" />
    </svg>
  );
}

export function WarningIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a1.8 1.8 0 001.5 2.7h15.6a1.8 1.8 0 001.5-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z" />
    </svg>
  );
}

export function SparkleBotIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <rect x="4" y="9" width="16" height="11" rx="3" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9V5m-3 0h6M9 14.5h.01M15 14.5h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 3l.6 1.4L21 5l-1.4.6L19 7l-.6-1.4L17 5l1.4-.6L19 3z" />
    </svg>
  );
}

export function ChatBubbleIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 20l.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.3 2.3L15.5 9.5" />
    </svg>
  );
}

export function PillIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <rect x="4.5" y="9.5" width="15" height="7" rx="3.5" transform="rotate(-45 12 13)" />
      <path strokeLinecap="round" d="M9.5 9.5l5 5" />
    </svg>
  );
}

export function EggIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c4 0 6.5-3.3 6.5-8.2C18.5 7.4 15.5 3 12 3S5.5 7.4 5.5 12.8C5.5 17.7 8 21 12 21z" />
    </svg>
  );
}

export function RunningIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <circle cx="15" cy="5" r="1.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 8l-3 3 1.5 4-3 5m8-9l2 2.5 3.5 1M9.5 11l3.5 1 2-3" />
    </svg>
  );
}

export function ChartBarIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20V10m7 10V4m7 16v-7" />
    </svg>
  );
}

export function PlateIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
    </svg>
  );
}

export function SunriseIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 18h16M6.3 14.5a5.7 5.7 0 0111.4 0M12 8.5V5m-4.9 4.1L5.7 7.6M16.9 9.1l1.4-1.5" />
    </svg>
  );
}

export function SunIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 1010.5 10.5z" />
    </svg>
  );
}

export function ClockIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function DropletIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3S6 10.5 6 14.5a6 6 0 0012 0C18 10.5 12 3 12 3z" />
    </svg>
  );
}

export function MeatIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3c2.5 0 4.5 2 4.5 4.5 0 2.4-1.6 3.4-3.2 4.9-2 1.9-4.6 4.3-7.1 6.8a2.6 2.6 0 01-3.7-3.7c2.5-2.5 4.9-5.1 6.8-7.1C14.8 6.6 15.8 5 18.2 5" />
      <path strokeLinecap="round" d="M5.5 15.5l-2 2" />
    </svg>
  );
}

export function LeafIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 4S10 4 6.5 7.5 4 16 4 20c4 0 9.5-1 13-4.5S20 4 20 4z" />
      <path strokeLinecap="round" d="M10 18c2-4 5-7 9-9" />
    </svg>
  );
}

export function TargetIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function MuscleIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11c0-3 2-6 5-6 1.5 0 2 1 3 1s1.5-1 3-1c3 0 5 3 5 6-1 0-1.5-.5-2-1v4a5 5 0 01-5 5h-2a5 5 0 01-5-5v-4c-.5.5-1 1-2 1z" />
    </svg>
  );
}

export function TrendingUpIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M15 7h6v6" />
    </svg>
  );
}

export function ScaleIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M7 7H3l2.5 5a2.5 2.5 0 005 0L8 7H7zM17 7h-4l2.5 5a2.5 2.5 0 005 0L18 7h-1zM8 21h8" />
    </svg>
  );
}

export function RocketIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 9.5c2-2 2.9-4.9 2.5-6.5-1.6-.4-4.5.5-6.5 2.5-1.7 1.7-3 4.3-3.5 6-1.1.3-2.1.9-2.9 1.7L2 16l3 1 1 3 2.8-2.1c.8-.8 1.4-1.8 1.7-2.9 1.7-.5 4.3-1.8 6-3.5zM9 15l-3 3" />
      <circle cx="14.5" cy="9.5" r="1.3" />
    </svg>
  );
}

export function MicIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0014 0M12 18v3" />
    </svg>
  );
}

export function HeartIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.5s-7.5-4.6-9.8-9A5.3 5.3 0 0112 7a5.3 5.3 0 019.8 4.5c-2.3 4.4-9.8 9-9.8 9z" />
    </svg>
  );
}

export function NoteIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7V3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6m-6 4h6" />
    </svg>
  );
}
