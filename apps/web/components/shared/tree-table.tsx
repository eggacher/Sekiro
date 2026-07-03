"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TreeRow<T> = T & { children?: TreeRow<T>[] };

/**
 * 树形表格容器：表头 + 树形展开的行
 */
export function TreeTable<T extends { id: string | number }>({
  columns,
  data,
  rowKey = (row: T & { id: string | number }) => String(row.id),
}: {
  columns: {
    key: string;
    title: string;
    width?: string | number;
    render?: (row: T, level: number) => React.ReactNode;
  }[];
  data: TreeRow<T>[];
  rowKey?: (row: T) => string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className="h-10 px-3 text-left align-middle font-medium text-muted-foreground"
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <TreeTableRow
                key={rowKey(row)}
                row={row}
                columns={columns}
                level={0}
                rowKey={rowKey}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TreeTableRow<T extends { id: string | number }>({
  row,
  columns,
  level,
  rowKey,
}: {
  row: TreeRow<T>;
  columns: { key: string; title: string; width?: string | number; render?: (row: T, level: number) => React.ReactNode }[];
  level: number;
  rowKey: (row: T) => string;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const hasChildren = !!row.children?.length;

  return (
    <>
      <tr className="border-b transition-colors hover:bg-muted/30">
        {columns.map((col, idx) => (
          <td key={col.key} className="p-3 align-middle">
            {idx === 0 ? (
              <div
                className="flex items-center"
                style={{ paddingLeft: level * 24 }}
              >
                {hasChildren ? (
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="mr-1 flex h-4 w-4 items-center justify-center text-muted-foreground"
                  >
                    <ChevronRight
                      className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
                    />
                  </button>
                ) : (
                  <span className="mr-1 w-4" />
                )}
                {col.render ? col.render(row, level) : String((row as Record<string, unknown>)[col.key] ?? "")}
              </div>
            ) : col.render ? (
              col.render(row, level)
            ) : (
              String((row as Record<string, unknown>)[col.key] ?? "")
            )}
          </td>
        ))}
      </tr>
      {hasChildren && expanded && (
        <>
          {row.children!.map((child) => (
            <TreeTableRow
              key={rowKey(child)}
              row={child}
              columns={columns}
              level={level + 1}
              rowKey={rowKey}
            />
          ))}
        </>
      )}
    </>
  );
}
