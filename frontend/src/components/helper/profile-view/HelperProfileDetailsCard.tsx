import { BadgeDollarSign, Baby, PawPrint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HelperProfile } from "@/types/helper-profile";
import { useTranslation } from "react-i18next";

export function HelperProfileDetailsCard({ profile }: { profile: HelperProfile }) {
  const { t } = useTranslation(["helper", "common"]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t("helper:view.sections.details")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <PawPrint className="h-4 w-4" />
            {t("helper:view.details.hasPets")}
          </span>
          <span className="font-medium">{profile.has_pets ? t("common:yes") : t("common:no")}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Baby className="h-4 w-4" />
            {t("helper:view.details.hasChildren")}
          </span>
          <span className="font-medium">
            {profile.has_children ? t("common:yes") : t("common:no")}
          </span>
        </div>
        {profile.offer ? (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BadgeDollarSign className="h-4 w-4" />
              <span>{t("helper:view.details.offer")}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm font-medium">{profile.offer}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
