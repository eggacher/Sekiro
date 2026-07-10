"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { cn, paginate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export type Column<T> = {
  key: string;
  title: string;
  width?: string | number;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
};

export type SearchField = {
  key: string;
  label: string;
  type?: "input" | "select";
  options?: { label: string; value: string }[];
  placeholder?: string;
};

export type CrudTableProps<T extends { id: string | number }> = {
  columns: Column<T>[];
  data: T[];
  searchFields?: SearchField[];
  title?: string;
  pageSize?: number;
  toolbar?: React.ReactNode; // 右上角操作区（如"新增"按钮）
  rowKey?: (row: T) => string | number;
  searchable?: boolean;
  loading?: boolean;
};

export function CrudTable<T extends { id: string | number }>({
  columns,
  data,
  searchFields = [],
  pageSize = 10,
  toolbar,
  searchable = true,
  loading = false,
}: CrudTableProps<T>) {
  const [page, setPage] = React.useState(1);
  const [keyword, setKeyword] = React.useState("");
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [searched, setSearched] = React.useState(false);
  const { t } = useTranslation();

  // 过滤
  const filtered = React.useMemo(() => {
    let list = data;
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      list = list.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(k)
      );
    }
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        const field = searchFields.find((f) => f.key === key);
        const isSelect = field?.type === "select";
        if (isSelect) {
          list = list.filter((row) => String((row as Record<string, unknown>)[key]) === value);
        } else {
          list = list.filter((row) => {
            const val = (row as Record<string, unknown>)[key];
            return String(val ?? "").toLowerCase().includes(value.toLowerCase());
          });
        }
      }
    });
    return list;
  }, [data, keyword, filters, searchFields]);

  const { list: pageData, total } = paginate(filtered, page, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const handleSearch = () => {
    setPage(1);
    setSearched(true);
  };

  const handleReset = () => {
    setKeyword("");
    setFilters({});
    setPage(1);
    setSearched(false);
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3">
      {/* 搜索栏 */}
      {searchable && searchFields.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          {searchFields.map((f) => {
            if (f.type === "select") {
              return (
                <Select
                  key={f.key}
                  value={filters[f.key] ?? "all"}
                  onValueChange={(v) => setFilters((p) => ({ ...p, [f.key]: v }))}
                >
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder={f.placeholder ?? f.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all", { label: f.label })}</SelectItem>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }
            return (
              <div key={f.key} className="relative">
                <Input
                  placeholder={f.placeholder ?? t("common.pleaseEnter", { label: f.label })}
                  value={filters[f.key] ?? ""}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  className="h-9 w-[180px]"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            );
          })}

          <Button size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
            {t("common.search")}
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            {t("common.reset")}
          </Button>
        </div>
      )}

      {/* 工具栏 */}
      {toolbar && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("common.totalItems", { total })}
          </div>
          <div className="flex items-center gap-2">{toolbar}</div>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right"
                  )}
                >
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right"
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted-foreground">
          {searched && t("common.rangeItems", { start, end, total })}
          {!searched && t("common.showingItems", { start, end, total })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === 1}
            onClick={() => setPage(1)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === totalPages}
            onClick={() => setPage(totalPages)}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
