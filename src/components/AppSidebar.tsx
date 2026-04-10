import {
  Building2, ClipboardList, Lightbulb, ArrowRight,
  Users2, Brain, Settings, LayoutDashboard,
  Contact,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const dashboardItem = { title: "Дашборд", url: "/", icon: LayoutDashboard };

const partnershipItems = [
  { title: "Партнеры", url: "/partners", icon: Building2 },
  { title: "Задачи партнеров", url: "/needs", icon: ClipboardList },
  { title: "Внешние контакты", url: "/contacts/external", icon: Contact },
];

const miemItems = [
  { title: "Коллективы МИЭМ", url: "/units", icon: Users2 },
  { title: "Компетенции", url: "/competencies", icon: Brain },
  { title: "Внутренние контакты", url: "/contacts/internal", icon: Contact },
];

const workItems = [
  { title: "Гипотезы", url: "/hypotheses", icon: Lightbulb },
  { title: "Следующие шаги", url: "/next-steps", icon: ArrowRight },
];

const adminItem = { title: "Администрирование", url: "/admin", icon: Settings };

function MenuItems({ items, collapsed }: { items: typeof partnershipItems; collapsed: boolean }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === "/"}
              className="hover:bg-sidebar-accent/50"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            >
              <item.icon className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Дашборд */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span className="text-xs font-semibold tracking-wider uppercase">МИЭМ Партнерства</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <MenuItems items={[dashboardItem]} collapsed={collapsed} />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Партнёрства */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span>Партнёрства</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <MenuItems items={partnershipItems} collapsed={collapsed} />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* МИЭМ */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span>МИЭМ</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <MenuItems items={miemItems} collapsed={collapsed} />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Работа */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span>Работа</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <MenuItems items={workItems} collapsed={collapsed} />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Администрирование */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <MenuItems items={[adminItem]} collapsed={collapsed} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
