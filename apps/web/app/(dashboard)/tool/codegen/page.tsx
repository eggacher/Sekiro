"use client";

import * as React from "react";
import { Database, FileCode2, Copy, Download, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { mockTables } from "@/lib/mock/monitor";

const codeTemplates = (table: string, comment: string) => ({
  entity: `package com.sekiro.system.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * ${comment}
 */
@Data
@TableName("${table}")
public class ${pascal(table)} {

    private Long id;
    private String name;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}`,
  controller: `package com.sekiro.system.controller;

import com.sekiro.common.api.R;
import com.sekiro.system.service.${pascal(table)}Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * ${comment} 接口
 */
@Tag(name = "${comment}")
@RestController
@RequestMapping("/system/${table.replace(/_/g, '-').replace('sys-', '')}")
@RequiredArgsConstructor
public class ${pascal(table)}Controller {

    private final ${pascal(table)}Service service;

    @Operation(summary = "分页查询")
    @GetMapping("/page")
    public R page(${pascal(table)}Query query) {
        return R.ok(service.page(query));
    }

    @Operation(summary = "新增")
    @PostMapping
    public R create(@RequestBody @Valid ${pascal(table)}Dto dto) {
        service.create(dto);
        return R.ok();
    }
}`,
  vue: `<script setup lang="ts">
import { ref } from 'vue'
import { useTable } from '@/composables/useTable'
import { columns, searchSchema, formSchema } from './schema'
import { get${pascal(table)}Page, delete${pascal(table)} } from '@/api/system/${table}'

const { tableRef, open, reload, handleAdd, handleEdit, handleDelete } = useTable(get${pascal(table)}Page)
</script>

<template>
  <CrudTable
    ref="tableRef"
    title="${comment}"
    :columns="columns"
    :search-schema="searchSchema"
    :form-schema="formSchema"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
  />
</template>`,
  sql: `-- 建表语句：${comment}
CREATE TABLE \`${table}\` (
  \`id\`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  \`name\`        VARCHAR(64)  DEFAULT NULL COMMENT '名称',
  \`status\`      TINYINT      DEFAULT 0 COMMENT '状态(0启用 1停用)',
  \`create_time\` DATETIME     DEFAULT CURRENT_TIMESTAMP,
  \`update_time\` DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='${comment}';`,
});

function pascal(s: string) {
  return s.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
}

export default function CodegenPage() {
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [activeTable, setActiveTable] = React.useState(mockTables[0]);
  const [copied, setCopied] = React.useState(false);

  const toggle = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleGen = () => {
    if (selected.size === 0) {
      toast.error("请至少选择一张表");
      return;
    }
    toast.success(`已为 ${selected.size} 张表生成代码（演示，未实际下载）`);
  };

  const codes = codeTemplates(activeTable.tableName, activeTable.comment);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeader title="代码生成器" description="根据数据库表结构，一键生成前后端 CRUD 代码（脚手架杀手锏）">
        <Button variant="outline">
          <Download className="h-4 w-4" />下载 Zip
        </Button>
        <Button onClick={handleGen}>
          <FileCode2 className="h-4 w-4" />生成选中({selected.size})
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* 表列表 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              数据表
            </CardTitle>
            <Input placeholder="搜索表名/注释" className="mt-2" />
          </CardHeader>
          <CardContent className="scrollbar-thin max-h-[560px] flex-1 space-y-1 overflow-y-auto p-3 pt-0">
            {mockTables.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveTable(t)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border p-2.5 transition-colors",
                  activeTable.id === t.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                )}
              >
                <Checkbox
                  checked={selected.has(t.id)}
                  onCheckedChange={() => toggle(t.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform", activeTable.id === t.id && "rotate-90")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-medium">{t.tableName}</code>
                    <Badge variant="outline" className="text-[10px]">{t.columns}列</Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{t.comment}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 代码预览 */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">{activeTable.comment} · 代码预览</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                表名：<code className="text-foreground">{activeTable.tableName}</code>
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <Tabs defaultValue="entity">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="entity">Entity</TabsTrigger>
                  <TabsTrigger value="controller">Controller</TabsTrigger>
                  <TabsTrigger value="vue">Vue 页面</TabsTrigger>
                  <TabsTrigger value="sql">SQL</TabsTrigger>
                </TabsList>
                <Button variant="outline" size="sm" onClick={() => copy(codes.entity, "entity")}>
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  复制
                </Button>
              </div>
              {(Object.keys(codes) as (keyof typeof codes)[]).map((k) => (
                <TabsContent key={k} value={k}>
                  <pre className="scrollbar-thin mt-3 max-h-[480px] overflow-auto rounded-lg border bg-muted/30 p-4 text-xs leading-relaxed">
                    <code className="font-mono">{codes[k]}</code>
                  </pre>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
