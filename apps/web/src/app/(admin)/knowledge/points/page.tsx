"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { KnowledgeDataTable } from "@/components/knowledge-data-table";
import type { KnowledgePoint } from "@/components/knowledge-data-table";
import { KnowledgeDetailSheet } from "@/components/knowledge-detail-sheet";
import { KnowledgeForm } from "@/components/knowledge-form";
import type { KnowledgePointFormData } from "@/components/knowledge-form";
import { useKnowledgeAPI } from "@/hooks/use-knowledge-api";

function formDataFromSchema(
  data: KnowledgePointFormData
): Record<string, unknown> {
  return {
    point: data.point,
    level: data.level,
    block: data.block,
    mastery_verb: data.mastery_verb,
    description: data.description,
    tags: data.tags,
    language: data.language,
  };
}

export default function AdminKnowledgePointsPage() {
  const {
    data,
    total,
    page,
    loading,
    filters,
    setPage,
    setFilters,
    deletePoint,
    createPoint,
    updatePoint,
  } = useKnowledgeAPI();

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"view" | "edit" | "create">(
    "view"
  );
  const [selectedPoint, setSelectedPoint] = useState<KnowledgePoint | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function handleView(point: KnowledgePoint) {
    setSelectedPoint(point);
    setSheetMode("view");
    setSheetOpen(true);
  }

  function handleEdit(point: KnowledgePoint) {
    setSelectedPoint(point);
    setSheetMode("edit");
    setSheetOpen(true);
  }

  function handleCreate() {
    setSelectedPoint(null);
    setSheetMode("create");
    setSheetOpen(true);
  }

  function handleDelete(id: string) {
    setDeleteTargetId(id);
    setDeleteDialog(true);
  }

  async function confirmDelete() {
    if (deleteTargetId) {
      await deletePoint(deleteTargetId);
      setDeleteDialog(false);
      setDeleteTargetId(null);
    }
  }

  async function handleSave(formData: KnowledgePointFormData) {
    setSaving(true);
    try {
      if (sheetMode === "create") {
        await createPoint(formDataFromSchema(formData));
      } else if (selectedPoint) {
        await updatePoint(selectedPoint.id, formDataFromSchema(formData));
      }
      setSheetOpen(false);
      setSelectedPoint(null);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setSheetOpen(false);
    setSelectedPoint(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">知识点管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理 GESP C++ 知识点、标签和描述
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          添加知识点
        </Button>
      </div>

      {/* Data Table */}
      <KnowledgeDataTable
        data={data}
        total={total}
        page={page}
        limit={20}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onPageChange={setPage}
        onLevelFilter={(level) =>
          setFilters((f) => ({
            ...f,
            level: level && level !== "all" ? level : undefined,
          }))
        }
        onBlockFilter={(block) =>
          setFilters((f) => ({
            ...f,
            block: block && block !== "all" ? block : undefined,
          }))
        }
      />

      {/* Detail/Edit/Create Sheet */}
      <KnowledgeDetailSheet
        point={selectedPoint}
        open={sheetOpen}
        mode={sheetMode}
        onOpenChange={setSheetOpen}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除知识点</DialogTitle>
            <DialogDescription>
              确认删除知识点？此操作不可撤销
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
