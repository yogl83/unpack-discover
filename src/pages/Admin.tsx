import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users2, RefreshCw, Settings, Mail } from "lucide-react";
import AdminUsers from "@/components/AdminUsers";
import AdminSync from "@/components/AdminSync";
import AdminSettings from "@/components/AdminSettings";
import AdminEmails from "@/components/AdminEmails";

export default function Admin() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Администрирование</h1>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5"><Users2 className="h-4 w-4" />Пользователи</TabsTrigger>
          <TabsTrigger value="sync" className="gap-1.5"><RefreshCw className="h-4 w-4" />Синхронизация</TabsTrigger>
          <TabsTrigger value="emails" className="gap-1.5"><Mail className="h-4 w-4" />Письма</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-4 w-4" />Настройки</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><AdminUsers /></TabsContent>
        <TabsContent value="sync"><AdminSync /></TabsContent>
        <TabsContent value="emails"><AdminEmails /></TabsContent>
        <TabsContent value="settings"><AdminSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
