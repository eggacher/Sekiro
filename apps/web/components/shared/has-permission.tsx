"use client";
import * as React from "react";
import { usePermission } from "@/lib/hooks/use-permission";

export function HasPermission({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) {
  const { has } = usePermission();
  return has(code) ? <>{children}</> : null;
}
