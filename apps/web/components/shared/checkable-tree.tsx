"use client";

import * as React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export type TreeNode = {
  id: string | number;
  title: string;
  type?: string;
  children?: TreeNode[];
};

/**
 * 通用树（含父子联动勾选）
 */
export function CheckableTree({
  data,
  checkedKeys,
  onChange,
  showType = false,
}: {
  data: TreeNode[];
  checkedKeys: Set<string | number>;
  onChange: (keys: Set<string | number>) => void;
  showType?: boolean;
}) {
  const toggle = (node: TreeNode) => {
    const next = new Set(checkedKeys);
    const allKeys = collectKeys(node);
    const allChecked = allKeys.every((k) => next.has(k));
    if (allChecked) {
      allKeys.forEach((k) => next.delete(k));
    } else {
      allKeys.forEach((k) => next.add(k));
    }
    onChange(next);
  };

  return (
    <div className="space-y-0.5">
      {data.map((node) => (
        <TreeRow
          key={node.id}
          node={node}
          checkedKeys={checkedKeys}
          onToggle={toggle}
          showType={showType}
          level={0}
        />
      ))}
    </div>
  );
}

function TreeRow({
  node,
  checkedKeys,
  onToggle,
  showType,
  level,
}: {
  node: TreeNode;
  checkedKeys: Set<string | number>;
  onToggle: (n: TreeNode) => void;
  showType: boolean;
  level: number;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const { t } = useTranslation();
  const hasChildren = !!node.children?.length;
  const allKeys = collectKeys(node);
  const checkedCount = allKeys.filter((k) => checkedKeys.has(k)).length;
  const isAllChecked = checkedCount === allKeys.length;
  const isIndeterminate = checkedCount > 0 && !isAllChecked;

  const typeColor: Record<string, "default" | "secondary" | "outline"> = {
    directory: "default",
    menu: "secondary",
    button: "outline",
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-accent/50",
        )}
        style={{ paddingLeft: level * 20 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex h-4 w-4 items-center justify-center text-muted-foreground"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Checkbox
          checked={isIndeterminate ? "indeterminate" : isAllChecked}
          onCheckedChange={() => onToggle(node)}
        />
        <span className="text-sm">{node.title}</span>
        {showType && node.type && (
          <Badge variant={typeColor[node.type] ?? "outline"} className="ml-1 text-[10px]">
            {node.type === "directory"
              ? t("system.menu.type.directory")
              : node.type === "menu"
                ? t("system.menu.type.menu")
                : t("system.menu.type.button")}
          </Badge>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              checkedKeys={checkedKeys}
              onToggle={onToggle}
              showType={showType}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function collectKeys(node: TreeNode): (string | number)[] {
  const keys: (string | number)[] = [node.id];
  if (node.children) {
    node.children.forEach((c) => keys.push(...collectKeys(c)));
  }
  return keys;
}
