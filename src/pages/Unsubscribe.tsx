import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  const content: Record<Status, { icon: React.ReactNode; title: string; desc: string }> = {
    loading: {
      icon: <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />,
      title: "Загрузка…",
      desc: "",
    },
    valid: {
      icon: <MailX className="h-10 w-10 text-primary" />,
      title: "Отписка от рассылки",
      desc: "Нажмите кнопку ниже, чтобы отписаться от уведомлений.",
    },
    already: {
      icon: <CheckCircle className="h-10 w-10 text-muted-foreground" />,
      title: "Вы уже отписаны",
      desc: "Этот адрес уже удалён из рассылки.",
    },
    success: {
      icon: <CheckCircle className="h-10 w-10 text-green-600" />,
      title: "Готово",
      desc: "Вы успешно отписались от уведомлений.",
    },
    invalid: {
      icon: <AlertCircle className="h-10 w-10 text-destructive" />,
      title: "Недействительная ссылка",
      desc: "Ссылка для отписки недействительна или устарела.",
    },
    error: {
      icon: <AlertCircle className="h-10 w-10 text-destructive" />,
      title: "Ошибка",
      desc: "Не удалось обработать отписку. Попробуйте позже.",
    },
  };

  const c = content[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          {c.icon}
          <CardTitle className="mt-4">{c.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{c.desc}</p>
          {status === "valid" && (
            <Button onClick={handleUnsubscribe} disabled={processing} className="w-full">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Отписаться
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
