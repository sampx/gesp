"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit2 } from "lucide-react";
import {
  KnowledgeForm,
  type KnowledgePointFormData,
} from "./knowledge-form";
import type { KnowledgePoint } from "./knowledge-data-table";

interface Props {
  point: KnowledgePoint | null;
  open: boolean;
  mode: "view" | "edit" | "create";
  onOpenChange: (open: boolean) => void;
  onSave: (data: KnowledgePointFormData) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function KnowledgeDetailSheet({
  point,
  open,
  mode,
  onOpenChange,
  onSave,
  onCancel,
  saving,
}: Props) {
  const [editing, setEditing] = useState(mode === "edit" || mode === "create");

  const title =
    mode === "create"
      ? "添加知识点"
      : editing
        ? "编辑知识点"
        : point?.point || "详情";

  if (editing && mode !== "view") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[540px] sm:max-w-xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 px-4 pb-4">
            <KnowledgeForm
              mode={mode === "create" ? "create" : "edit"}
              defaultValues={
                point
                  ? ({
                      point: point.point,
                      level: point.level,
                      block: point.block,
                      mastery_verb: point.mastery_verb,
                      description: point.description,
                      tags: point.tags.join(", "),
                      language: "C++",
                    } as Partial<KnowledgePointFormData>)
                  : undefined
              }
              onSubmit={onSave}
              onCancel={onCancel}
              loading={saving}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // View mode
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[540px] sm:max-w-xl overflow-y-auto"
      >
        <SheetHeader className="flex flex-row justify-between items-start">
          <SheetTitle>{point?.point || "知识点详情"}</SheetTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </SheetHeader>
        {point && (
          <div className="mt-6 px-4 pb-4 space-y-4">
            <div className="flex gap-2">
              <Badge variant="secondary">L{point.level}</Badge>
              <Badge variant="outline">{point.mastery_verb}</Badge>
              <Badge variant="secondary">{point.block}</Badge>
            </div>
            {point.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {point.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">详细说明</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {point.description || "暂无说明"}
              </p>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              ID: {point.id}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
