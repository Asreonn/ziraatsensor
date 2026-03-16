import { useLocation } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AicoLogo } from '@/components/brand/AicoLogo';
import { AppSidebar } from './AppSidebar';

const routeMeta: Record<string, { title: string; eyebrow: string }> = {
  '/': { title: 'Alg Havuzlari', eyebrow: 'AICO mesh' },
  '/system': { title: 'Sistem', eyebrow: 'Saha telemetrisi' },
  '/settings': { title: 'Ayarlar', eyebrow: 'Kalibrasyon' },
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const meta = routeMeta[location.pathname] ?? routeMeta['/'];

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full overflow-hidden bg-transparent">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,245,74,0.18),transparent_22%),radial-gradient(circle_at_top_right,rgba(13,187,108,0.12),transparent_20%)]" />
        <AppSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-border/60 bg-background/78 backdrop-blur-xl">
            <div className="flex min-h-20 items-center gap-3 px-4 py-3 md:px-6">
              <AicoLogo compact className="hidden w-11 sm:block" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.32em] text-primary/80">{meta.eyebrow}</p>
                <h1 className="font-display text-lg font-semibold tracking-tight text-foreground md:text-[1.35rem]">
                  {meta.title}
                </h1>
              </div>
              <div className="ml-auto hidden items-center gap-2 rounded-full border border-border/80 bg-card/70 px-4 py-2 text-xs text-muted-foreground shadow-[0_16px_35px_-28px_rgba(7,130,95,0.65)] md:flex">
                <Activity className="h-3.5 w-3.5 text-status-healthy" />
                <span>Canli izleme</span>
              </div>
            </div>
          </header>
          <main className="relative flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
