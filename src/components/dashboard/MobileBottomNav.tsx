import { LayoutDashboard, RadioTower, SlidersHorizontal } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';

const items = [
  { title: 'Havuzlar', url: '/', icon: LayoutDashboard },
  { title: 'Sistem', url: '/system', icon: RadioTower },
  { title: 'Ayarlar', url: '/settings', icon: SlidersHorizontal },
];

export function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-3">
        {items.map(item => (
          <li key={item.url}>
            <NavLink
              to={item.url}
              end={item.url === '/'}
              className="flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
              activeClassName={cn('text-primary')}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
