import { tool } from "@opencode-ai/plugin-sdk";
import { z } from "zod";

const GESP_API_URL = process.env.GESP_API_URL || "http://localhost:3000";
const GESP_API_KEY = process.env.GESP_API_KEY || "dev-key";

async function gespFetch(path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${GESP_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GESP_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GESP API error ${res.status}: ${errText}`);
  }
  return res.json();
}

/** D-04: Tool 1 — Get question candidates (summary only, anti-leak) */
export const get_question_candidates = tool(
  "get_question_candidates",
  "获取候选题目列表（仅含摘要不含完整题目内容）。根据课程、级别、可选知识点提示，返回 3-5 道候选题目供选题决策。",
  {
    token: z.string().describe("评估令牌"),
    course_id: z.string().describe("课程 ID，如 'cpp'"),
    level: z.number().int().min(1).max(8).describe("目标级别 1-8"),
    hint: z.string().optional().describe("知识点方向提示，用于语义搜索"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .describe("返回候选数量"),
  },
  async (params) => {
    return await gespFetch("/api/assessment/candidates", params);
  }
);

/** D-04: Tool 2 — Lock the selected next question */
export const select_next_question = tool(
  "select_next_question",
  "锁定一道题目作为学员的下一道测评题。从 get_question_candidates 返回的候选列表中选定一道后调用。",
  {
    token: z.string().describe("评估令牌"),
    question_id: z.string().describe("候选题目 ID"),
  },
  async (params) => {
    return await gespFetch("/api/assessment/select", params);
  }
);

/** D-04: Tool 3 — Write final evaluation */
export const update_evaluation = tool(
  "update_evaluation",
  "写入测评综合评价。测评收敛完成后调用，保存定级结果、答题统计、知识薄弱点和学习建议。",
  {
    token: z.string().describe("评估令牌"),
    evaluation: z.string().describe("Markdown 格式的综合评价文本"),
  },
  async (params) => {
    return await gespFetch("/api/assessment/evaluate", params);
  }
);