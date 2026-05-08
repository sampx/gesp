"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CodingQuestionProps {
  content: string;
  disabled: boolean;
  onAnswer: (code: string) => void;
}

export function CodingQuestion({ content, disabled, onAnswer }: CodingQuestionProps) {
  const [code, setCode] = useState("");

  return (
    <div className="space-y-4">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
      <div className="space-y-2">
        <Label>你的代码</Label>
        <Textarea
          value={code}
          onChange={(e) => { setCode(e.target.value); onAnswer(e.target.value); }}
          disabled={disabled}
          placeholder="在这里编写你的C++代码..."
          className="min-h-[200px] font-mono text-sm"
        />
      </div>
      {code && (
        <div className="rounded-lg border bg-muted p-4">
          <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto"><code>{code}</code></pre>
        </div>
      )}
    </div>
  );
}