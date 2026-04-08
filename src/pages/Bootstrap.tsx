import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function Bootstrap() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/bootstrap-admin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, full_name: fullName }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Ошибка создания админа");
        return;
      }
      toast.success("Администратор создан! Теперь войдите.");
      setDone(true);
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Первоначальная настройка</CardTitle>
          <CardDescription>
            Создайте первого администратора системы. Этот шаг доступен только один раз.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-center text-primary font-medium">
              ✓ Администратор создан. Перенаправление на вход...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Полное имя</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Иван Иванов" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль (мин. 8 символов)</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Создание..." : "Создать администратора"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
