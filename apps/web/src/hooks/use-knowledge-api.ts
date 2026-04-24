"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { KnowledgePoint } from "@/components/knowledge-data-table";

interface ListResponse {
  data: KnowledgePoint[];
  total: number;
  page: number;
  limit: number;
}

// API base — uses relative path (NextJS proxy handles rewrite to backend)
const API_BASE = "/api";

export function useKnowledgeAPI() {
  const [data, setData] = useState<KnowledgePoint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ level?: string; block?: string }>(
    {}
  );

  const fetchPoints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filters.level) params.set("level", filters.level);
      if (filters.block) params.set("block", filters.block);

      const res = await fetch(`${API_BASE}/admin/knowledge/points?${params}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data.data);
        setTotal(json.data.total);
      } else {
        toast.error("加载知识点失败：" + json.message);
      }
    } catch {
      toast.error("加载失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters.level, filters.block]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const deletePoint = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`${API_BASE}/admin/knowledge/points/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const json = await res.json();
        if (json.success) {
          toast.success("已删除");
          fetchPoints();
        } else {
          toast.error("删除失败：" + json.message);
        }
      } catch {
        toast.error("删除失败，请稍后再试");
      }
    },
    [fetchPoints]
  );

  const createPoint = useCallback(
    async (formData: Record<string, unknown>) => {
      try {
        const payload = { ...formData };
        if (typeof payload.tags === "string") {
          payload.tags = (payload.tags as string)
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
        }
        const res = await fetch(`${API_BASE}/admin/knowledge/points`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        const json = await res.json();
        if (json.success) {
          toast.success("添加成功");
          fetchPoints();
        } else {
          toast.error("添加失败：" + json.message);
        }
      } catch {
        toast.error("添加失败，请稍后再试");
      }
    },
    [fetchPoints]
  );

  const updatePoint = useCallback(
    async (id: string, formData: Record<string, unknown>) => {
      try {
        const payload = { ...formData };
        if (typeof payload.tags === "string") {
          payload.tags = (payload.tags as string)
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
        }
        const res = await fetch(`${API_BASE}/admin/knowledge/points/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        const json = await res.json();
        if (json.success) {
          toast.success("保存成功");
          fetchPoints();
        } else {
          toast.error("保存失败：" + json.message);
        }
      } catch {
        toast.error("保存失败，请稍后再试");
      }
    },
    [fetchPoints]
  );

  return {
    data,
    total,
    page,
    loading,
    filters,
    setPage,
    setFilters,
    fetchPoints,
    deletePoint,
    createPoint,
    updatePoint,
  };
}
