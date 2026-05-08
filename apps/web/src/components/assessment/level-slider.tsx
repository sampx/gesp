"use client";

import { Badge } from "@/components/ui/badge";

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "基础输入输出：变量、数据类型、简单运算",
  2: "条件判断与循环：if/else、for/while",
  3: "数组与字符串：一维数组、string操作、函数",
  4: "排序与递归：冒泡排序、递归函数、结构体",
  5: "进阶算法：二分查找、贪心、动态规划入门",
  6: "数据结构：链表、栈、队列",
  7: "图论基础：图的遍历、最短路径",
  8: "综合应用：算法综合、代码优化",
};

interface LevelSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export function LevelSlider({ value, onChange }: LevelSliderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">起始级别</span>
        <Badge variant="secondary" className="text-lg px-3 py-1">Lv.{value}</Badge>
      </div>
      <input
        type="range"
        min={1}
        max={8}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Lv.1</span>
        <span>Lv.8</span>
      </div>
      <p className="text-sm text-muted-foreground">{LEVEL_DESCRIPTIONS[value]}</p>
    </div>
  );
}