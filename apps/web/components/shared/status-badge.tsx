"use client";

import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "enabled" | "disabled" }) {
  return status === "enabled" ? (
    <Badge variant="success" className="gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      启用
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      停用
    </Badge>
  );
}
