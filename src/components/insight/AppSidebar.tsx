import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Zap,
  Flag,
  Globe2,
  LineChart,
  Cpu,
  Atom,
  Car,
  Briefcase,
  Shield,
  Trophy,
  Bookmark,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const primary = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Breaking News", url: "/breaking", icon: Zap },
];

const sections = [
  { title: "India", url: "/india", icon: Flag },
  { title: "World", url: "/world", icon: Globe2 },
  { title: "Markets", url: "/markets", icon: LineChart },
  { title: "Technology & AI", url: "/technology", icon: Cpu },
  { title: "Science", url: "/science", icon: Atom },
  { title: "Vehicles", url: "/vehicles", icon: Car },
  { title: "Business", url: "/business", icon: Briefcase },
  { title: "Cybersecurity", url: "/cybersecurity", icon: Shield },
  { title: "Sports", url: "/sports", icon: Trophy },
];

const personal = [
  { title: "Saved Articles", url: "/saved", icon: Bookmark },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const renderItem = (item: { title: string; url: string; icon: typeof Flag }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        isActive={isActive(item.url)}
        className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-md"
      >
        <Link to={item.url} className="flex items-center gap-3">
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          {collapsed ? (
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 overflow-hidden">
              <img
                src="/logo.png"
                alt="Insight"
                className="h-8 w-auto max-w-none object-left"
              />
            </div>
          ) : (
            <div className="flex items-center h-8">
              <img src="/logo.png" alt="Insight" className="h-6 w-auto object-left" />
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{primary.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono">
              Sections
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>{sections.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono">
              Personal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>{personal.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
