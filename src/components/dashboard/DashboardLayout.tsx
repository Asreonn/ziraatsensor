import { PanelLeft } from 'lucide-react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppSidebar } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';

function DesktopSidebarToggle() {
  const { state, toggleSidebar } = useSidebar();

  if (state === 'expanded') {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="fixed left-4 top-4 z-20 hidden h-11 w-11 rounded-2xl border border-border bg-card shadow-md hover:bg-muted md:flex"
      aria-label="Menüyü aç"
      title="Menüyü aç"
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full overflow-hidden bg-transparent">
        {!isMobile && <AppSidebar />}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {!isMobile && <DesktopSidebarToggle />}
          <main className="relative flex-1 p-3 pb-24 md:p-6 md:pb-6">
            {children}
          </main>
          {isMobile && <MobileBottomNav />}
        </div>
      </div>
    </SidebarProvider>
  );
}
