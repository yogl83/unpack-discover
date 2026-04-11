import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Mode = "login" | "reset" | "register";

export default function Auth() {
  const { user, loading, signIn, isPending } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [resetSent, setResetSent] = useState(false);
  const [registerSent, setRegisterSent] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Загрузка...</p></div>;

  // User logged in but pending approval
  if (user && isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Ожидание подтверждения</CardTitle>
            <CardDescription>Ваш аккаунт ожидает подтверждения администратором. Пожалуйста, попробуйте войти позже.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={async () => { await supabase.auth.signOut(); }}>
              Выйти
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) toast.error(error.message);
        else { toast.success("Письмо для сброса пароля отправлено"); setResetSent(true); }
      } else if (mode === "register") {
        if (password.length < 6) {
          toast.error("Пароль должен быть не менее 6 символов");
          return;
        }
        const res = await supabase.functions.invoke("register-request", {
          body: { email, password, full_name: fullName },
        });
        if (res.error) {
          let msg = "Ошибка при отправке заявки";
          try {
            const body = await (res.error as any).context.json();
            if (body?.error) msg = body.error;
          } catch {}
          toast.error(msg);
        } else if (res.data?.error) {
          toast.error(res.data.error);
        } else {
          toast.success("Заявка отправлена! Ожидайте подтверждения администратора.");
          setRegisterSent(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setResetSent(false);
    setRegisterSent(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">МИЭМ НИУ ВШЭ</CardTitle>
          <CardDescription>
            {mode === "register" ? "Запрос доступа к системе" : "Система управления партнерствами"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registerSent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Заявка на доступ отправлена. Администратор рассмотрит вашу заявку, после чего вы сможете войти в систему.
              </p>
              <Button variant="outline" className="w-full" onClick={() => switchMode("login")}>
                Назад ко входу
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">ФИО</Label>
                  <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Иванов Иван Иванович" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@hse.ru" />
              </div>
              {mode !== "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={submitting || (mode === "reset" && resetSent)}>
                {submitting
                  ? "..."
                  : mode === "reset"
                    ? (resetSent ? "Письмо отправлено" : "Отправить ссылку")
                    : mode === "register"
                      ? "Отправить заявку"
                      : "Войти"
                }
              </Button>

              <div className="flex flex-col gap-1">
                {mode === "login" && (
                  <>
                    <button type="button" className="w-full text-center text-sm text-primary hover:underline" onClick={() => switchMode("reset")}>
                      Забыли пароль?
                    </button>
                    <button type="button" className="w-full text-center text-sm text-primary hover:underline" onClick={() => switchMode("register")}>
                      Запросить доступ
                    </button>
                  </>
                )}
                {mode !== "login" && (
                  <button type="button" className="w-full text-center text-sm text-primary hover:underline" onClick={() => switchMode("login")}>
                    Назад ко входу
                  </button>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {mode === "register"
                  ? "После отправки заявки администратор подтвердит ваш доступ"
                  : "Для получения доступа обратитесь к администратору системы"
                }
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
