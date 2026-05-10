import type { ToolDefinition } from "@opencode-ai/plugin";
import { createDebugLog } from "./debug";
import { get_question_candidates, select_next_question, update_evaluation, query_progress, update_answer_score } from "./tools";

const debug = createDebugLog("[gesp-plugin]");

const tools: Record<string, ToolDefinition> = {
  get_question_candidates,
  select_next_question,
  update_evaluation,
  query_progress,
  update_answer_score,
};

debug(`Plugin loaded — registering ${Object.keys(tools).length} tools: ${Object.keys(tools).join(", ")}`);

export default {
  id: "gesp-plugin",
  server: () => ({ tool: tools }),
};
