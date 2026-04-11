import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Upload, File, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ProfileFile {
  file_id: string;
  original_filename: string;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string;
  created_at: string;
}

interface Props {
  profileId: string;
  partnerId: string;
  files: ProfileFile[];
  editable: boolean;
}

export function ProfileFileUpload({ profileId, partnerId, files, editable }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ];
    if (!allowed.includes(file.type) && !file.name.endsWith(".md")) {
      toast.error("Допустимые форматы: .pdf, .docx, .txt, .md");
      return;
    }

    setUploading(true);
    try {
      const ts = Date.now();
      const storagePath = `${partnerId}/${profileId}/${ts}_${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from("partner-profile-files")
        .upload(storagePath, file);
      if (uploadErr) throw uploadErr;

      const { error: metaErr } = await supabase.from("partner_profile_files").insert({
        profile_id: profileId,
        partner_id: partnerId,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type || null,
        file_size: file.size,
        uploaded_by: user?.id || null,
      });
      if (metaErr) throw metaErr;

      toast.success("Файл загружен");
      qc.invalidateQueries({ queryKey: ["partner-profile-files", profileId] });
    } catch (err: any) {
      toast.error("Ошибка загрузки: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async (f: ProfileFile) => {
    const { data, error } = await supabase.storage
      .from("partner-profile-files")
      .createSignedUrl(f.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Не удалось скачать файл");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (f: ProfileFile) => {
    await supabase.storage.from("partner-profile-files").remove([f.storage_path]);
    await supabase.from("partner_profile_files").delete().eq("file_id", f.file_id);
    toast.success("Файл удалён");
    qc.invalidateQueries({ queryKey: ["partner-profile-files", profileId] });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Исходные документы</h3>
        {editable && (
          <>
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
              <Upload className="mr-1 h-3.5 w-3.5" />
              {uploading ? "Загрузка..." : "Загрузить"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleUpload}
            />
          </>
        )}
      </div>

      {!files.length ? (
        <p className="text-muted-foreground text-sm py-2">Нет прикреплённых файлов</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.file_id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
              <File className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{f.original_filename}</span>
              <span className="text-muted-foreground text-xs">{formatSize(f.file_size)}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(f)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              {editable && (
                <ConfirmDialog
                  title={`Удалить файл?`}
                  description={`Файл «${f.original_filename}» будет удалён без возможности восстановления.`}
                  onConfirm={() => handleDelete(f)}
                  triggerSize="icon"
                  triggerLabel={<Trash2 className="h-3.5 w-3.5" />}
                  showIcon={false}
                  variant="ghost"
                  triggerClassName="h-7 w-7 text-destructive"
                />
              )
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
