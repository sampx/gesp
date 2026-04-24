"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2, Trash2, Eye } from "lucide-react";

const LEVEL_NAMES: Record<number, string> = {
  1: "L1",
  2: "L2",
  3: "L3",
  4: "L4",
  5: "L5",
  6: "L6",
  7: "L7",
  8: "L8",
};

export interface KnowledgePoint {
  id: string;
  level: number;
  block: string;
  point: string;
  mastery_verb: string;
  description: string;
  tags: string[];
}

interface Props {
  data: KnowledgePoint[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  onEdit: (point: KnowledgePoint) => void;
  onDelete: (id: string) => void;
  onView: (point: KnowledgePoint) => void;
  onPageChange: (page: number) => void;
  onLevelFilter: (level: string | null) => void;
  onBlockFilter: (block: string | null) => void;
}

export function KnowledgeDataTable({
  data,
  total,
  page,
  limit,
  loading,
  onEdit,
  onDelete,
  onView,
  onPageChange,
  onLevelFilter,
  onBlockFilter,
}: Props) {
  const totalPages = Math.ceil(total / limit);

  // Extract unique blocks from data for filter dropdown
  const blocks = [...new Set(data.map((d) => d.block))].sort();

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex gap-3 items-center">
        <div className="w-40">
          <Select onValueChange={onLevelFilter} defaultValue="">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="全部级别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部级别</SelectItem>
              {Array.from({ length: 8 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  L{i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select onValueChange={onBlockFilter} defaultValue="">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="全部主题" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部主题</SelectItem>
              {blocks.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          共 {total} 条记录
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">级别</TableHead>
              <TableHead>知识点名称</TableHead>
              <TableHead className="w-32">主题</TableHead>
              <TableHead className="w-24">掌握程度</TableHead>
              <TableHead className="w-20">标签</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  暂无数据 — 点击&ldquo;添加知识点&rdquo;创建新内容，或使用搜索查找已有资源
                </TableCell>
              </TableRow>
            ) : (
              data.map((point) => (
                <TableRow key={point.id}>
                  <TableCell>
                    <Badge variant="secondary">{LEVEL_NAMES[point.level]}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{point.point}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {point.block}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{point.mastery_verb}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {point.tags?.slice(0, 2).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onView(point)}
                        title="查看"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(point)}
                        title="编辑"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(point.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center text-sm">
        <div>
          第 {page} 页，共 {totalPages} 页
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
