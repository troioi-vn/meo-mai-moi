import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StorageUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StorageUpgradeDialog({ open, onOpenChange }: StorageUpgradeDialogProps) {
  const { t } = useTranslation("settings");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("profile.patronDialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("profile.patronCtaDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common:actions.cancel", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <a href="https://www.patreon.com/catarchy" target="_blank" rel="noopener noreferrer">
              {t("profile.patronCtaAction")}
            </a>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
