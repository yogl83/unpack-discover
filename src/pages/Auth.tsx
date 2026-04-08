import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function Auth() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Загрузка...</p></div>;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) toast.error(error.message);
        else { toast.success("Письмо для сброса пароля отправлено"); setResetSent(true); }
      } else {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">МИЭМ НИУ ВШЭ</CardTitle>
          <CardDescription>Система управления партнерствами</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@hse.ru" />
            </div>
            {!resetMode && (
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting || (resetMode && resetSent)}>
              {submitting ? "..." : resetMode ? (resetSent ? "Письмо отправлено" : "Отправить ссылку") : "Войти"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm text-primary hover:underline"
              onClick={() => { setResetMode(!resetMode); setResetSent(false); }}
            >
              {resetMode ? "Назад ко входу" : "Забыли пароль?"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Для получения доступа обратитесь к администратору системы
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
