'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '⌘' },
  { href: '/history', label: 'History', icon: '📜' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

/** Vertical nav sidebar for app-level navigation */
export function NavSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-14 flex-col items-center gap-1 border-r border-border bg-card py-4">
      <div className="mb-4 text-lg font-bold">CCD</div>
      {NAV_ITEMS.map((item) => {
        const active = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-colors hover:bg-accent ${
              active ? 'bg-accent text-foreground' : 'text-muted-foreground'
            }`}
          >
            {item.icon}
          </Link>
        );
      })}
    </nav>
  );
}
