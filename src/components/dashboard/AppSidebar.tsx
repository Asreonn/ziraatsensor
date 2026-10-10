import {
  ChevronRight,
  ChevronsLeft,
  LayoutDashboard,
  RadioTower,
  SlidersHorizontal,
} from 'lucide-react';
import { AicoLogo } from '@/components/brand/AicoLogo';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
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
  { title: 'Komuta', caption: 'Havuz görünümü', url: '/', icon: LayoutDashboard },
  { title: 'Altyapı', caption: 'Saha telemetrisi', url: '/system', icon: RadioTower },
  { title: 'Ayarlar', caption: 'Eşik ve kontroller', url: '/settings', icon: SlidersHorizontal },
];

export function AppSidebar() {
  const { isMobile, state, toggleSidebar } = useSidebar();
  const isCollapsed = !isMobile && state === 'collapsed';

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/70"
    >
      <SidebarHeader className={cn('gap-4 px-4 pb-3 pt-4', isCollapsed && 'items-center px-2 pb-2')}>
        <div
          className={cn(
            'flex items-center gap-3 rounded-[1.75rem] border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-3 shadow-sm',
            isCollapsed && 'h-12 w-12 justify-center rounded-[1.3rem] border-sidebar-border/60 px-0 py-0',
          )}
        >
          <AicoLogo compact className={cn('w-11 shadow-none', isCollapsed && 'w-10')} />

          {!isCollapsed && (
            <>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sidebar-primary">AICO</p>
                <p className="mt-1 text-sm font-semibold text-sidebar-foreground">Kontrol Merkezi</p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="ml-auto h-10 w-10 rounded-2xl border border-sidebar-border/70 bg-sidebar-background text-sidebar-foreground shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Menüyü kapat"
                title="Menüyü kapat"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
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
                      'group flex w-full items-center gap-3 rounded-[1.55rem] border border-transparent px-3 py-3 text-sidebar-foreground transition-colors duration-150',
                      'hover:border-sidebar-border/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isCollapsed && 'h-12 w-12 justify-center rounded-[1.25rem] px-0 py-0',
                    )}
                    activeClassName={cn(
                      'border-primary/30 bg-primary/12 text-sidebar-accent-foreground',
                      isCollapsed && 'ring-1 ring-primary/30',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-sidebar-accent text-sidebar-primary transition-colors duration-150 group-hover:bg-primary/15',
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
                        <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/40 transition-colors duration-150 group-hover:text-sidebar-primary" />
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

    </Sidebar>
  );
}
