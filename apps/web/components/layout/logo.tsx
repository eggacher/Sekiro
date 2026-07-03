import { cn } from "@/lib/utils";

export function Logo({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 overflow-hidden", className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-primary-foreground shadow-md">
        <span className="text-sm font-bold">S</span>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold">Sekiro</span>
          <span className="text-[10px] text-muted-foreground">Admin Scaffold</span>
        </div>
      )}
    </div>
  );
}
