"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const knowledgePointSchema = z.object({
  point: z.string().min(1, "知识点名称不能为空"),
  level: z.number().int().min(1).max(8),
  block: z.string().min(1, "所属主题不能为空"),
  mastery_verb: z.enum(["了解", "理解", "掌握"]),
  description: z.string(),
  tags: z.string(),
  language: z.string(),
});

export type KnowledgePointFormData = z.infer<typeof knowledgePointSchema>;

interface Props {
  mode: "create" | "edit";
  defaultValues?: Partial<KnowledgePointFormData>;
  onSubmit: (data: KnowledgePointFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function KnowledgeForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  loading,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<KnowledgePointFormData>({
    resolver: zodResolver(knowledgePointSchema as any),
    defaultValues: {
      point: defaultValues?.point || "",
      level: defaultValues?.level || 1,
      block: defaultValues?.block || "",
      mastery_verb: defaultValues?.mastery_verb || "了解",
      description: defaultValues?.description || "",
      tags: defaultValues?.tags || "",
      language: "C++",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as SubmitHandler<KnowledgePointFormData>)} className="space-y-4">
      {/* Point name */}
      <div className="space-y-2">
        <Label htmlFor="point">知识点名称 *</Label>
        <Input id="point" {...register("point")} />
        {errors.point && (
          <p className="text-sm text-destructive">{errors.point.message}</p>
        )}
      </div>

      {/* Level + Mastery verb row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>GESP 级别 *</Label>
          <Select
            value={String(watch("level"))}
            onValueChange={(val) => {
              if (val) setValue("level", Number(val));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 8 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  Level {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" {...register("level")} />
        </div>

        <div className="space-y-2">
          <Label>掌握程度</Label>
          <Select
            value={watch("mastery_verb") ?? "了解"}
            onValueChange={(val) => {
              if (val) setValue("mastery_verb", val as KnowledgePointFormData["mastery_verb"]);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="了解">了解</SelectItem>
              <SelectItem value="理解">理解</SelectItem>
              <SelectItem value="掌握">掌握</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" {...register("mastery_verb")} />
        </div>
      </div>

      {/* Block */}
      <div className="space-y-2">
        <Label htmlFor="block">所属主题 *</Label>
        <Input
          id="block"
          {...register("block")}
          placeholder="如：初等数论、排序算法"
        />
        {errors.block && (
          <p className="text-sm text-destructive">{errors.block.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">详细说明</Label>
        <Textarea
          id="description"
          {...register("description")}
          rows={4}
          placeholder="知识点的详细说明，支持 Markdown"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">标签</Label>
        <Input
          id="tags"
          {...register("tags")}
          placeholder="用逗号分隔，如：基础语法, 数据结构"
        />
      </div>

      {/* Hidden language field */}
      <input type="hidden" {...register("language")} />

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "保存中..."
            : mode === "create"
              ? "添加知识点"
              : "保存"}
        </Button>
      </div>
    </form>
  );
}
