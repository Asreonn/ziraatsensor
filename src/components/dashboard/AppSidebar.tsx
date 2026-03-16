import {
  ChevronsLeft, LayoutDashboard, RadioTower, SlidersHorizontal, Sparkles
} from 'lucide-react';
import { AicoLogo } from '@/components/brand/AicoLogo';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Komuta', caption: 'Havuz genel gorunumu', url: '/', icon: LayoutDashboard },
  { title: 'Altyapi', caption: 'Ag ve saha telemetrisi', url: '/system', icon: RadioTower },
  { title: 'Ayarlar', caption: 'Esik ve tazeleme kontrolleri', url: '/settings', icon: SlidersHorizontal },
];

export function AppSidebar() {
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/80">
      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(
          "absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground shadow-sm transition-transform duration-300 cursor-pointer",
          "group-data-[collapsible=icon]:rotate-180"
        )}
        aria-label="Sidebari daralt/genişlet"
        title="Sidebari daralt/genişlet"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>

      <SidebarHeader className="px-4 pb-4 pt-6 transition-all duration-300 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-6 items-center">
        <div className="relative h-12 w-full flex items-center justify-center overflow-visible">
          <div className="absolute left-0 transition-opacity duration-300 group-data-[collapsible=icon]:opacity-0 opacity-100 flex flex-col w-[8.75rem] group-data-[collapsible=icon]:pointer-events-none">
            <AicoLogo className="w-full" />
            <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-sidebar-primary whitespace-nowrap">Biomonitor mesh</p>
          </div>
          <div className="absolute transition-opacity duration-300 group-data-[collapsible=icon]:opacity-100 opacity-0 flex items-center justify-center w-full pointer-events-none group-data-[collapsible=icon]:pointer-events-auto">
            <AicoLogo compact className="w-[2.1rem]" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 transition-all duration-300 group-data-[collapsible=icon]:px-1 mt-4">
        <SidebarGroup className="pt-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={`${item.title} · ${item.caption}`}
                    className="p-0 h-auto bg-transparent hover:bg-transparent"
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className={cn(
                        'group flex w-full min-h-12 items-center gap-3 rounded-2xl transition-all duration-300 overflow-hidden',
                        'px-3 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-12',
                        'hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
                      )}
                      activeClassName="bg-[linear-gradient(135deg,rgba(217,245,74,0.18),rgba(13,187,108,0.12))] text-sidebar-accent-foreground ring-1 ring-sidebar-primary/25"
                    >
                      <div className="flex shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-primary transition-all duration-300 group-hover:bg-sidebar-primary/18 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 h-10 w-10">
                        <item.icon className="h-5 w-5 transition-all duration-300" />
                      </div>
                      <div className="flex-1 min-w-0 transition-opacity duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0">
                        <span className="block text-sm font-semibold whitespace-nowrap">{item.title}</span>
                        <span className="block truncate text-[11px] text-sidebar-foreground/58 whitespace-nowrap">{item.caption}</span>
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-5 pt-3 transition-all duration-300 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pb-4">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-sidebar-border/80 bg-sidebar-accent/65 p-4 transition-all duration-300 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent flex justify-center items-center">

          <div className="flex w-full items-center gap-3 transition-opacity duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary/16 text-sidebar-primary shadow-inner">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground whitespace-nowrap">AICO Live Layer</p>
              <p className="text-[11px] text-sidebar-foreground/60 whitespace-nowrap truncate">Sensör akışı aktif</p>
            </div>
          </div>

          <div className="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-300 opacity-0 group-data-[collapsible=icon]:opacity-100 pointer-events-none group-data-[collapsible=icon]:pointer-events-auto" title="Sensör akışı aktif">
            <div className="relative flex items-center justify-center h-10 w-10">
              <div className="absolute inset-0 rounded-full bg-sidebar-primary/20 animate-ping shadow-[0_0_15px_rgba(217,245,74,0.4)]" />
              <div className="h-2.5 w-2.5 rounded-full bg-sidebar-primary shadow-[0_0_8px_rgba(217,245,74,0.8)] relative z-10" />
            </div>
          </div>

        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
