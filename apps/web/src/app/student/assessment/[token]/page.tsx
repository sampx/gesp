"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ArrowRight, Trophy } from "lucide-react";
import { ObjectiveQuestion } from "@/components/assessment/objective-question";
import { CodingQuestion } from "@/components/assessment/coding-question";
import { ChatPanel } from "@/components/assessment/chat-panel";
import { ProgressBar } from "@/components/assessment/progress-bar";
import { getNextQuestion, submitAnswer, getAssessmentProgress } from "@/lib/server-api";

type State = "LOADING_QUESTION" | "ANSWERING" | "JUDGING" | "SCORING" | "FEEDBACK" | "DONE";

interface QuestionData {
  id: string;
  question_type: "objective" | "coding";
  level: number;
  knowledge_point: string;
  content: string;
}

interface FeedbackData {
  is_correct?: boolean;
  score?: number;
  feedback?: string;
  correct_answer?: string;
  explanation?: string;
}

export default function AssessmentAnswerPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [state, setState] = useState<State>("LOADING_QUESTION");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [progress, setProgress] = useState({
    current_level: 1,
    current_question_number: 0,
    total_answered: 0,
    total_correct: 0,
    config_question_limit: 5,
    remaining_questions: 5,
    config_time_limit_min: 0,
    remaining_time_sec: 0,
    started_at: "",
    done: false,
  });
  const [error, setError] = useState("");
  const [doneData, setDoneData] = useState<{ final_level?: number } | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const loadNextQuestion = useCallback(async () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setState("LOADING_QUESTION");
    setAnswer("");
    setFeedback(null);
    setError("");
    try {
      const res = await getNextQuestion(token);
      if (!mountedRef.current) return;
      if (res.success && res.data?.id) {
        setQuestion(res.data);
        // Update progress from backend payload (source of truth)
        if (res.data?.progress) {
          setProgress(prev => ({
            ...prev,
            ...res.data.progress,
            // current_question_number = total_answered + 1 during answering
            current_question_number: (res.data.progress?.total_answered ?? prev.total_answered) + 1,
          }));
        }
        setState("ANSWERING");
      } else if (res.data?.waiting) {
        if (res.data.progress) setProgress(prev => ({ ...prev, ...res.data.progress }));
        pollTimerRef.current = setTimeout(loadNextQuestion, 2000);
      } else {
        setError(res.message || "加载题目失败");
        setState("ANSWERING");
      }
    } catch {
      if (mountedRef.current) setError("加载题目失败");
    }
  }, [token]);

  useEffect(() => { loadNextQuestion(); }, [loadNextQuestion]);

  // Fetch progress on mount for fast progress bar restoration
  useEffect(() => {
    getAssessmentProgress(token).then(res => {
      if (res.success && mountedRef.current) {
        const data = res.data;
        setProgress(prev => ({
          ...prev,
          ...data,
          // If assessment is already done, redirect to report
        }));
        if (data?.done) {
          router.replace(`/student/assessment/${token}/report`);
        }
      }
    }).catch(() => {});
  }, [token, router]);

  const handleSubmit = async () => {
    if (!question || !answer) return;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setError("");
    setState("JUDGING");
    try {
      const res = await submitAnswer({ token, question_id: question.id, answer, time_spent_sec: 0 });
      if (!res.success) {
        setError(res.message || "提交失败，请重试");
        setState("ANSWERING");
        return;
      }

      // Handle async scoring for coding questions
      if (res.data.scoring) {
        setState("SCORING");
        // Poll for next question while agent evaluates
        pollTimerRef.current = setTimeout(loadNextQuestion, 2000);
        return;
      }
      setFeedback(res.data);
      // Refresh progress from backend payload (no optimistic increment)
      if (res.data?.progress) {
        setProgress(prev => ({
          ...prev,
          ...res.data.progress,
          // During FEEDBACK, keep showing the just-answered question number
          current_question_number: prev.current_question_number,
        }));
      }
      if (res.data.done) {
        setDoneData({ final_level: res.data.final_level });
        setState("DONE");
      } else {
        setState("FEEDBACK");
      }
    } catch {
      setError("提交失败，请重试");
      setState("ANSWERING");
    }
  };

  const handleNext = () => loadNextQuestion();
  const handleViewReport = () => router.push(`/student/assessment/${token}/report`);

  if (state === "DONE") {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
        <Trophy className="h-16 w-16 text-amber-500" />
        <h1 className="text-2xl font-semibold">测评完成！</h1>
        {doneData?.final_level && (
          <Badge className="text-lg px-4 py-2">你的级别：Lv.{doneData.final_level}</Badge>
        )}
        <p className="text-muted-foreground">AI 正在为你生成综合评价报告...</p>
        <Button onClick={handleViewReport} className="gap-2"><ArrowRight className="h-4 w-4" />查看测评报告</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-6">
      <ProgressBar
        currentLevel={progress.current_level}
        currentQuestionNumber={progress.current_question_number}
        totalAnswered={progress.total_answered}
        totalCorrect={progress.total_correct}
        questionLimit={progress.config_question_limit}
        remainingQuestions={progress.remaining_questions}
        configTimeLimitMin={progress.config_time_limit_min}
        remainingTimeSec={progress.remaining_time_sec}
        startedAt={progress.started_at}
        state={state}
      />

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* LOADING_QUESTION state */}
      {state === "LOADING_QUESTION" && (
        <Card>
          <CardContent className="space-y-4 py-8">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {/* ANSWERING / JUDGING / SCORING / FEEDBACK states */}
      {(state === "ANSWERING" || state === "JUDGING" || state === "SCORING" || state === "FEEDBACK") && question && (
        <Card>
          <CardContent className="space-y-6 py-6">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{question.question_type === "objective" ? "选择题" : "编程题"}</Badge>
              <Badge variant="outline">{question.knowledge_point}</Badge>
              <span className="text-xs text-muted-foreground ml-auto">难度 {question.level}</span>
            </div>

            {question.question_type === "objective" ? (
              <ObjectiveQuestion
                content={question.content}
                disabled={state !== "ANSWERING"}
                onAnswer={setAnswer}
              />
            ) : (
              <CodingQuestion
                content={question.content}
                disabled={state !== "ANSWERING"}
                onAnswer={setAnswer}
              />
            )}

            {state === "ANSWERING" && (
              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!answer}>
                提交答案
              </Button>
            )}

            {state === "JUDGING" && (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> 正在判题...
              </div>
            )}

            {state === "SCORING" && (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> AI 正在评估中...
              </div>
            )}

            {state === "FEEDBACK" && feedback && (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 text-lg font-semibold ${feedback.is_correct ? "text-green-600" : "text-red-600"}`}>
                  {feedback.is_correct ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                  {feedback.is_correct ? "回答正确！" : "回答错误"}
                </div>
                {feedback.correct_answer && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium">正确答案：{feedback.correct_answer}</p>
                  </div>
                )}
                {feedback.explanation && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-sm text-muted-foreground">{feedback.explanation}</p>
                  </div>
                )}
                <Button className="w-full gap-2" size="lg" onClick={handleNext}>
                  下一题 <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ChatPanel token={token} />
    </div>
  );
}
