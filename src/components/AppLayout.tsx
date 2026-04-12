import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<string, string> = {
  admin: "Админ",
  analyst: "Аналитик",
  viewer: "Наблюдатель",
};

export default function AppLayout() {
  const { user, profile, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (user && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Загрузка профиля...</p>
      </div>
    );
  }

  if (user && profile && !profile.approved) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <SidebarTrigger className="mr-2" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {profile?.full_name || user.email}
              </span>
              {role && (
                <Badge variant="secondary" className="text-xs">
                  {roleLabels[role] || role}
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={signOut} title="Выйти">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
