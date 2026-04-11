import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import React from "react";

interface ConfirmDialogProps {
  title?: string;
  description?: string;
  onConfirm: () => void;
  variant?: "destructive" | "default" | "ghost" | "outline" | "secondary" | "link";
  triggerLabel?: React.ReactNode;
  triggerSize?: "sm" | "default" | "lg" | "icon";
  triggerClassName?: string;
  showIcon?: boolean;
  actionLabel?: string;
}

export function ConfirmDialog({
  title = "Подтверждение",
  description = "Это действие нельзя отменить. Вы уверены?",
  onConfirm,
  variant = "destructive",
  triggerLabel = "Удалить",
  triggerSize = "sm",
  triggerClassName,
  showIcon = true,
  actionLabel = "Удалить",
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={triggerSize} className={triggerClassName}>
          {showIcon && <Trash2 className="mr-1 h-4 w-4" />}
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
