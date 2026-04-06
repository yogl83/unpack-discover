import {
  Building2, ClipboardList, Lightbulb, ArrowRight,
  Users2, Brain, FileText, ShieldCheck, Settings, LayoutDashboard,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Дашборд", url: "/", icon: LayoutDashboard },
  { title: "Партнеры", url: "/partners", icon: Building2 },
  { title: "Задачи партнеров", url: "/needs", icon: ClipboardList },
  { title: "Гипотезы", url: "/hypotheses", icon: Lightbulb },
  { title: "Следующие шаги", url: "/next-steps", icon: ArrowRight },
  { title: "Коллективы МИЭМ", url: "/units", icon: Users2 },
  { title: "Компетенции", url: "/competencies", icon: Brain },
  { title: "Источники", url: "/sources", icon: FileText },
  { title: "Подтверждения", url: "/evidence", icon: ShieldCheck },
];

const adminItem = { title: "Администрирование", url: "/admin", icon: Settings };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
  const { isAdmin } = useAuth();
  const allItems = isAdmin ? [...navItems, adminItem] : navItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span className="text-xs font-semibold tracking-wider uppercase">МИЭМ Партнерства</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
