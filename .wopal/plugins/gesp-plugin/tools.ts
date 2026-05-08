import { tool } from "@opencode-ai/plugin";
import { createDebugLog, createWarnLog } from "./debug";

const debug = createDebugLog("[gesp-plugin]");
const warn = createWarnLog("[gesp-plugin]");

const GESP_API_URL = process.env.GESP_API_URL || "http://localhost:3000";
const GESP_API_KEY = process.env.GESP_API_KEY || "dev-key";

debug(`Plugin config: GESP_API_URL=${GESP_API_URL}, GESP_API_KEY=${GESP_API_KEY ? "(set)" : "(fallback)"}`);

async function gespFetch(path: string, body: Record<string, unknown>): Promise<unknown> {
  const url = `${GESP_API_URL}${path}`;
  debug(`gespFetch → ${url} body=${JSON.stringify(body)}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GESP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    debug(`gespFetch ← status=${res.status} body=${text.slice(0, 500)}`);

    if (!res.ok) {
      warn(`gespFetch error ${res.status}: ${text}`);
      throw new Error(`GESP API error ${res.status}: ${text}`);
    }

    return JSON.parse(text);
  } catch (err) {
    warn(`gespFetch failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/** D-04: Tool 1 — Get question candidates (summary only, anti-leak) */
export const get_question_candidates = tool({
  description: "获取候选题目列表（仅含摘要不含完整题目内容）。根据课程、级别、可选知识点提示，返回 3-5 道候选题目供选题决策。",
  args: {
    token: tool.schema.string().describe("评估令牌"),
    course_id: tool.schema.string().describe("课程 ID，如 'cpp'"),
    level: tool.schema.number().int().min(1).max(8).describe("目标级别 1-8"),
    hint: tool.schema.string().optional().describe("知识点方向提示，用于语义搜索"),
    limit: tool.schema.number().int().min(1).max(10).optional().default(5).describe("返回候选数量"),
  },
  execute: async (args) => {
    debug(`get_question_candidates called: token=${args.token?.slice(0, 8)}... course=${args.course_id} level=${args.level} hint=${args.hint ?? "(none)"} limit=${args.limit}`);
    const result = await gespFetch("/api/assessment/candidates", args);
    debug(`get_question_candidates done: ${JSON.stringify(result).slice(0, 300)}`);
    return JSON.stringify(result);
  },
});

/** D-04: Tool 2 — Lock the selected next question */
export const select_next_question = tool({
  description: "锁定一道题目作为学员的下一道测评题。从 get_question_candidates 返回的候选列表中选定一道后调用。",
  args: {
    token: tool.schema.string().describe("评估令牌"),
    question_id: tool.schema.string().describe("候选题目 ID"),
  },
  execute: async (args) => {
    debug(`select_next_question called: token=${args.token?.slice(0, 8)}... question_id=${args.question_id}`);
    const result = await gespFetch("/api/assessment/select", args);
    debug(`select_next_question done: ${JSON.stringify(result).slice(0, 300)}`);
    return JSON.stringify(result);
  },
});

/** D-04: Tool 3 — Write final evaluation */
export const update_evaluation = tool({
  description: "写入测评综合评价。测评收敛完成后调用，保存定级结果、答题统计、知识薄弱点和学习建议。",
  args: {
    token: tool.schema.string().describe("评估令牌"),
    evaluation: tool.schema.string().describe("Markdown 格式的综合评价文本"),
  },
  execute: async (args) => {
    debug(`update_evaluation called: token=${args.token?.slice(0, 8)}... evaluation=${args.evaluation?.slice(0, 100)}...`);
    const result = await gespFetch("/api/assessment/evaluate", args);
    debug(`update_evaluation done: ${JSON.stringify(result).slice(0, 300)}`);
    return JSON.stringify(result);
  },
});
