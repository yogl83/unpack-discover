import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, UserPlus, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminUsers() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [newPassword, setNewPassword] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("*");
      return profiles.map(p => ({
        ...p,
        role: roles?.find(r => r.user_id === p.id)?.role || "viewer",
      }));
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await supabase.functions.invoke("update-user-role", { body: { userId, role } });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users-list"] }); toast.success("Роль изменена"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await supabase.functions.invoke("delete-user", { body: { userId } });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users-list"] }); toast.success("Пользователь удалён"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addUser = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("create-admin", {
        body: { users: [{ email: newEmail, password: newPassword, full_name: newName, role: newRole }] },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.results?.[0]?.error) throw new Error(res.data.results[0].error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-list"] });
      toast.success("Пользователь создан");
      setAddOpen(false);
      setNewEmail(""); setNewName(""); setNewPassword(""); setNewRole("viewer");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveUser = useMutation({
    mutationFn: async ({ userId, approved, role }: { userId: string; approved: boolean; role?: string }) => {
      const res = await supabase.functions.invoke("approve-user", { body: { userId, approved, role } });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["users-list"] });
      toast.success(vars.approved ? "Пользователь одобрен" : "Заявка отклонена");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approvedUsers = users?.filter(u => (u as any).approved !== false);
  const pendingUsers = users?.filter(u => (u as any).approved === false);
  const filtered = approvedUsers?.filter(u => roleFilter === "all" || u.role === roleFilter);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Активные</TabsTrigger>
          <TabsTrigger value="pending">
            Ожидающие {pendingUsers && pendingUsers.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">
                {pendingUsers.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Все роли" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                <SelectItem value="admin">Админ</SelectItem>
                <SelectItem value="analyst">Аналитик</SelectItem>
                <SelectItem value="viewer">Наблюдатель</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><UserPlus className="h-4 w-4 mr-2" />Добавить пользователя</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новый пользователь</DialogTitle>
                  <DialogDescription>Создание учётной записи с указанной ролью</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div><Label>Email</Label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
                  <div><Label>ФИО</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
                  <div><Label>Пароль</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
                  <div>
                    <Label>Роль</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Админ</SelectItem>
                        <SelectItem value="analyst">Аналитик</SelectItem>
                        <SelectItem value="viewer">Наблюдатель</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => addUser.mutate()} disabled={addUser.isPending || !newEmail || !newPassword}>
                    {addUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Создать
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : !filtered?.length ? (
            <p className="text-muted-foreground py-8 text-center">Нет пользователей</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Дата регистрации</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell>{u.email || "—"}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={v => changeRole.mutate({ userId: u.id, role: v })}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Админ</SelectItem>
                            <SelectItem value="analyst">Аналитик</SelectItem>
                            <SelectItem value="viewer">Наблюдатель</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(u.created_at), "dd.MM.yyyy")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Удалить пользователя?")) deleteUser.mutate(u.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : !pendingUsers?.length ? (
            <p className="text-muted-foreground py-8 text-center">Нет ожидающих заявок</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Дата заявки</TableHead>
                    <TableHead>Роль при одобрении</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map(u => (
                    <PendingRow key={u.id} user={u} onApprove={(role) => approveUser.mutate({ userId: u.id, approved: true, role })} onReject={() => { if (confirm("Отклонить заявку и удалить пользователя?")) approveUser.mutate({ userId: u.id, approved: false }); }} isPending={approveUser.isPending} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PendingRow({ user, onApprove, onReject, isPending }: {
  user: any;
  onApprove: (role: string) => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState("viewer");

  return (
    <TableRow>
      <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
      <TableCell>{user.email || "—"}</TableCell>
      <TableCell className="text-muted-foreground">{format(new Date(user.created_at), "dd.MM.yyyy")}</TableCell>
      <TableCell>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Админ</SelectItem>
            <SelectItem value="analyst">Аналитик</SelectItem>
            <SelectItem value="viewer">Наблюдатель</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onApprove(role)} disabled={isPending}>
            <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> Одобрить
          </Button>
          <Button size="sm" variant="ghost" onClick={onReject} disabled={isPending}>
            <XCircle className="h-4 w-4 mr-1 text-destructive" /> Отклонить
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
