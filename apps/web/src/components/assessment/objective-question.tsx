"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";

interface ObjectiveQuestionProps {
  content: string;
  disabled: boolean;
  onAnswer: (answer: string) => void;
}

function parseObjective(content: string): { stem: string; options: Array<{ key: string; text: string }> } {
  const lines = content.split("\n");
  const optionLines: string[] = [];
  let stemEnd = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^[A-D][.．、]/.test(lines[i].trim())) {
      stemEnd = i;
      optionLines.push(...lines.slice(i));
      break;
    }
  }
  const stem = lines.slice(0, stemEnd).join("\n").trim();
  const options = optionLines.filter(l => /^[A-D][.．、]/.test(l.trim())).map(l => {
    const match = l.trim().match(/^([A-D])[.．、]\s*(.+)/);
    return { key: match![1], text: match![2] };
  });
  return { stem, options };
}

export function ObjectiveQuestion({ content, disabled, onAnswer }: ObjectiveQuestionProps) {
  const [selected, setSelected] = useState("");
  const { stem, options } = parseObjective(content);

  return (
    <div className="space-y-6">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {stem && <p className="text-base font-medium whitespace-pre-wrap">{stem}</p>}
      </div>
      <div className="space-y-2" role="radiogroup">
        {options.map(opt => (
          <label
            key={opt.key}
            className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              disabled ? "opacity-60 pointer-events-none" : "hover:bg-secondary/50"
            } ${selected === opt.key ? "border-primary bg-primary/5" : ""}`}
          >
            <input
              type="radio"
              name="objective-answer"
              value={opt.key}
              checked={selected === opt.key}
              disabled={disabled}
              onChange={() => { setSelected(opt.key); onAnswer(opt.key); }}
              className="h-4 w-4 accent-primary"
            />
            <span className="flex-1 text-base">{opt.key}. {opt.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}