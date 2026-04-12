import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Paperclip, File, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Props {
  portfolioItemId: string;
  itemSource: "unit" | "contact";
  editable: boolean;
}

export function PortfolioItemFiles({ portfolioItemId, itemSource, editable }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: files = [] } = useQuery({
    queryKey: ["portfolio-item-files", portfolioItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_item_files" as any)
        .select("*")
        .eq("portfolio_item_id", portfolioItemId)
        .eq("item_source", itemSource)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ts = Date.now();
      const storagePath = `items/${portfolioItemId}/${ts}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("unit-portfolio-files")
        .upload(storagePath, file);
      if (uploadErr) throw uploadErr;

      const { error: metaErr } = await supabase.from("portfolio_item_files" as any).insert({
        portfolio_item_id: portfolioItemId,
        item_source: itemSource,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type || null,
        file_size: file.size,
        uploaded_by: user?.id || null,
      } as any);
      if (metaErr) throw metaErr;

      toast.success("Файл прикреплён");
      qc.invalidateQueries({ queryKey: ["portfolio-item-files", portfolioItemId] });
    } catch (err: any) {
      toast.error("Ошибка загрузки: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async (f: any) => {
    const { data, error } = await supabase.storage
      .from("unit-portfolio-files")
      .createSignedUrl(f.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Не удалось скачать файл");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (f: any) => {
    await supabase.storage.from("unit-portfolio-files").remove([f.storage_path]);
    await supabase.from("portfolio_item_files" as any).delete().eq("file_id", f.file_id);
    toast.success("Файл удалён");
    qc.invalidateQueries({ queryKey: ["portfolio-item-files", portfolioItemId] });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (!files.length && !editable) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        {files.map((f: any) => (
          <div key={f.file_id} className="inline-flex items-center gap-1.5 rounded border bg-muted/50 px-2 py-1 text-xs">
            <File className="h-3 w-3 text-muted-foreground shrink-0" />
            <button onClick={() => handleDownload(f)} className="truncate max-w-[140px] hover:underline text-left" title={f.original_filename}>
              {f.original_filename}
            </button>
            {formatSize(f.file_size) && <span className="text-muted-foreground">{formatSize(f.file_size)}</span>}
            {editable && (
              <ConfirmDialog
                title="Удалить файл?"
                description={`Файл «${f.original_filename}» будет удалён.`}
                onConfirm={() => handleDelete(f)}
                triggerSize="icon"
                triggerLabel={<Trash2 className="h-3 w-3" />}
                showIcon={false}
                variant="ghost"
                triggerClassName="h-5 w-5 text-destructive p-0"
              />
            )}
          </div>
        ))}
        {editable && (
          <>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" disabled={uploading} onClick={() => inputRef.current?.click()}>
              <Paperclip className="h-3 w-3" />
              {uploading ? "Загрузка..." : "Прикрепить"}
            </Button>
            <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
          </>
        )}
      </div>
    </div>
  );
}
