"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

export function StatusBadge({ status }: { status: "enabled" | "disabled" }) {
  const { t } = useTranslation();

  return status === "enabled" ? (
    <Badge variant="success" className="gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t("common.enabled")}
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t("common.disabled")}
    </Badge>
  );
}
