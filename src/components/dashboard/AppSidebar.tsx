import {
  ChevronRight,
  ChevronsLeft,
  LayoutDashboard,
  RadioTower,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { AicoLogo } from '@/components/brand/AicoLogo';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Komuta', caption: 'Havuz genel gorunumu', url: '/', icon: LayoutDashboard },
  { title: 'Altyapi', caption: 'Ag ve saha telemetrisi', url: '/system', icon: RadioTower },
  { title: 'Ayarlar', caption: 'Esik ve tazeleme kontrolleri', url: '/settings', icon: SlidersHorizontal },
];

export function AppSidebar() {
  const { isMobile, state, toggleSidebar } = useSidebar();
  const isCollapsed = !isMobile && state === 'collapsed';

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/70 bg-[linear-gradient(180deg,rgba(251,255,251,0.98),rgba(239,251,244,0.94))]"
    >
      <SidebarHeader className={cn('gap-4 px-4 pb-3 pt-4', isCollapsed && 'items-center px-2 pb-2')}>
        <div
          className={cn(
            'flex items-center gap-3 rounded-[1.75rem] border border-sidebar-border/70 bg-white/80 px-3 py-3 shadow-[0_22px_50px_-40px_rgba(7,130,95,0.75)]',
            isCollapsed && 'h-14 w-14 justify-center rounded-[1.4rem] border-sidebar-border/60 px-0 py-0',
          )}
        >
          <AicoLogo compact className={cn('w-11 shadow-none', isCollapsed && 'w-10')} />

          {!isCollapsed && (
            <>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sidebar-primary">AICO</p>
                <p className="mt-1 text-sm font-semibold text-sidebar-foreground">Kontrol merkezi</p>
                <p className="text-[11px] text-sidebar-foreground/60">Alg havuzu izleme paneli</p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="ml-auto h-10 w-10 rounded-2xl border border-sidebar-border/70 bg-white/70 text-sidebar-foreground shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Sidebari kapat"
                title="Sidebari kapat"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {!isCollapsed && (
          <div className="rounded-[1.55rem] border border-sidebar-border/70 bg-sidebar-accent/45 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sidebar-primary/80">Navigasyon</p>
            <p className="mt-2 text-sm text-sidebar-foreground">
              Paneller arasinda hizli gecis yapin. Sidebar kapandiginda yalniz ikonlar gorunur.
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator className={cn('mx-4', isCollapsed && 'mx-2')} />

      <SidebarContent className={cn('mt-2 px-3 pb-3', isCollapsed && 'mt-1 px-2')}>
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className={cn('gap-2', isCollapsed && 'items-center')}>
              {navItems.map((item) => {
                const navItem = (
                  <NavLink
                    to={item.url}
                    end={item.url === '/'}
                    aria-label={item.title}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-[1.55rem] border border-transparent px-3 py-3 text-sidebar-foreground transition-all duration-300',
                      'hover:border-sidebar-border/80 hover:bg-white/75 hover:text-sidebar-accent-foreground hover:shadow-[0_18px_40px_-36px_rgba(7,130,95,0.85)]',
                      isCollapsed && 'h-14 w-14 justify-center rounded-[1.35rem] px-0 py-0',
                    )}
                    activeClassName={cn(
                      'border-sidebar-primary/30 bg-[linear-gradient(135deg,rgba(217,245,74,0.16),rgba(13,187,108,0.12))] text-sidebar-accent-foreground shadow-[0_20px_44px_-34px_rgba(7,130,95,0.9)]',
                      isCollapsed && 'ring-1 ring-sidebar-primary/30',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] bg-sidebar-accent text-sidebar-primary transition-all duration-300 group-hover:bg-sidebar-primary/16',
                        isCollapsed && 'h-11 w-11',
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>

                    {!isCollapsed && (
                      <>
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{item.title}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-sidebar-foreground/58">{item.caption}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/35 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-sidebar-primary" />
                      </>
                    )}
                  </NavLink>
                );

                return (
                  <SidebarMenuItem key={item.title} className={cn(isCollapsed && 'w-auto')}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                        <TooltipContent side="right" align="center">
                          {item.title} · {item.caption}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      navItem
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className={cn('mx-4', isCollapsed && 'mx-2')} />

      <SidebarFooter className={cn('px-4 pb-4 pt-3', isCollapsed && 'px-2 pb-3')}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <div
              className="relative flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-sidebar-border/70 bg-white/80 shadow-[0_18px_36px_-32px_rgba(7,130,95,0.75)]"
              title="Canli sensor akisi"
            >
              <div className="absolute inset-0 rounded-[1.35rem] bg-[radial-gradient(circle_at_center,rgba(217,245,74,0.18),transparent_65%)]" />
              <div className="relative flex items-center justify-center">
                <div className="absolute h-6 w-6 rounded-full bg-sidebar-primary/20 animate-ping" />
                <div className="relative h-2.5 w-2.5 rounded-full bg-sidebar-primary shadow-[0_0_12px_rgba(217,245,74,0.85)]" />
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.65rem] border border-sidebar-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(236,251,241,0.88))] p-4 shadow-[0_24px_50px_-42px_rgba(7,130,95,0.78)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] bg-sidebar-primary/14 text-sidebar-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground">Canli akis</p>
                <p className="text-[11px] text-sidebar-foreground/60">Sidebar kapandiginda yalniz ikonlar kalir.</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[1.15rem] border border-sidebar-border/70 bg-white/72 px-3 py-2 text-[11px] text-sidebar-foreground/70">
              <span>Kisayol</span>
              <span className="rounded-full border border-sidebar-border/70 px-2 py-1 font-semibold text-sidebar-foreground">Ctrl/Cmd + B</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
