"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { ObjectiveQuestion } from "@/components/assessment/objective-question";
import { CodingQuestion } from "@/components/assessment/coding-question";
import { ChatPanel } from "@/components/assessment/chat-panel";
import { ProgressBar } from "@/components/assessment/progress-bar";
import { getNextQuestion, submitAnswer, getAssessmentProgress } from "@/lib/server-api";

type State = "LOADING_QUESTION" | "ANSWERING" | "JUDGING" | "SCORING" | "FEEDBACK";

interface QuestionData {
  id: string;
  question_type: "objective" | "coding";
  level: number;
  difficulty: number;
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

interface ReportStatusData {
  done?: boolean;
  final_level?: number | null;
  evaluation?: string | null;
}

function isReportReady(data?: ReportStatusData | null): boolean {
  return Boolean(data?.done && data.final_level != null && data.evaluation?.trim());
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

  // Pending done state — assessment finished, waiting for report generation
  const [pendingDone, setPendingDone] = useState(false);
  // Report ready state — report page has all required data (done + final_level + evaluation)
  const [reportReady, setReportReady] = useState(false);

  // Prefetched next question + readiness flag
  const [prefetchedQuestion, setPrefetchedQuestion] = useState<QuestionData | null>(null);
  const [questionReady, setQuestionReady] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoringPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (scoringPollTimerRef.current) clearTimeout(scoringPollTimerRef.current);
      if (reportPollTimerRef.current) clearTimeout(reportPollTimerRef.current);
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
    setPrefetchedQuestion(null);
    setQuestionReady(false);
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
      } else if (res.data?.done) {
        setPendingDone(true);
        if (isReportReady(res.data)) {
          setReportReady(true);
          router.replace(`/student/assessment/${token}/report`);
        }
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
          setPendingDone(true);
          if (isReportReady(data)) {
            setReportReady(true);
            router.replace(`/student/assessment/${token}/report`);
          }
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
    if (scoringPollTimerRef.current) {
      clearTimeout(scoringPollTimerRef.current);
      scoringPollTimerRef.current = null;
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
        // Poll progress until latest_feedback becomes available
        pollForScoringFeedback();
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
        // Assessment finished — show feedback first, then navigate to report
        setPendingDone(true);
        setState("FEEDBACK");
      } else {
        setState("FEEDBACK");
      }
    } catch {
      setError("提交失败，请重试");
      setState("ANSWERING");
    }
  };

  /**
   * Poll progress endpoint until latest_feedback becomes available for coding questions.
   * Once feedback is found, enter FEEDBACK state. If assessment is done, set pendingDone.
   */
  const pollForScoringFeedback = useCallback(async () => {
    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const res = await getAssessmentProgress(token);
        if (!mountedRef.current) return;
        if (res.success && res.data?.latest_feedback) {
          // Found scored feedback — enter FEEDBACK state
          const lf = res.data.latest_feedback;
          setFeedback({
            is_correct: lf.is_correct,
            score: lf.score,
            feedback: lf.feedback,
          });
          setProgress(prev => ({
            ...prev,
            ...res.data,
            current_question_number: prev.current_question_number,
          }));
          if (res.data.done) {
            setPendingDone(true);
          }
          setState("FEEDBACK");
          return;
        }
        // Update progress even if no feedback yet
        if (res.success && res.data) {
          setProgress(prev => ({
            ...prev,
            ...res.data,
            current_question_number: prev.current_question_number,
          }));
        }
      } catch {
        // Continue polling on error
      }
      // Poll again in 2 seconds
      if (mountedRef.current) {
        scoringPollTimerRef.current = setTimeout(poll, 2000);
      }
    };
    // Start polling after 2s delay (give agent time to score)
    scoringPollTimerRef.current = setTimeout(poll, 2000);
  }, [token]);

  const handleNext = () => loadNextQuestion();

  // Poll progress until report is ready (done + final_level + evaluation)
  useEffect(() => {
    if (!pendingDone || reportReady) return;
    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const res = await getAssessmentProgress(token);
        if (!mountedRef.current) return;
        if (res.success && isReportReady(res.data)) {
          setReportReady(true);
          return;
        }
      } catch {
        // Continue polling
      }
      if (mountedRef.current) {
        reportPollTimerRef.current = setTimeout(poll, 2000);
      }
    };
    reportPollTimerRef.current = setTimeout(poll, 1500);
    return () => {
      if (reportPollTimerRef.current) clearTimeout(reportPollTimerRef.current);
    };
  }, [pendingDone, reportReady, token]);

  useEffect(() => {
    if (!pendingDone || !reportReady || state !== "LOADING_QUESTION") return;
    router.replace(`/student/assessment/${token}/report`);
  }, [pendingDone, reportReady, state, token, router]);

  // Callback: question_ready SSE event → prefetch next question
  const handleQuestionReady = useCallback(async () => {
    if (state !== "FEEDBACK" && state !== "SCORING") return;
    setQuestionReady(true);
    try {
      const res = await getNextQuestion(token);
      if (res.success && res.data?.id) {
        setPrefetchedQuestion(res.data);
        if (res.data?.progress) {
          setProgress(prev => ({
            ...prev,
            ...res.data.progress,
            current_question_number: (res.data.progress?.total_answered ?? prev.total_answered) + 1,
          }));
        }
      } else if (res.data?.done) {
        // Backend says assessment is done — set pendingDone
        setPendingDone(true);
        if (isReportReady(res.data)) {
          setReportReady(true);
        }
      }
    } catch {
      // Prefetch failed — user will click and enter normal load flow
    }
  }, [token, state]);

  // Callback: assessment_done SSE event → set pendingDone (don't skip feedback)
  const handleAssessmentDone = useCallback((_finalLevel?: number) => {
    setPendingDone(true);
    // If already in FEEDBACK, update the button to show "查看测评报告"
    // If in SCORING, the polling will eventually pick up latest_feedback and transition to FEEDBACK
  }, []);

  // Handle Next button click during FEEDBACK
  const handleNextFromFeedback = useCallback(() => {
    // If assessment is done, navigate to report instead of next question
    if (pendingDone) {
      if (!reportReady) return;
      router.replace(`/student/assessment/${token}/report`);
      return;
    }

    if (prefetchedQuestion) {
      // Swap to prefetched question immediately
      setQuestion(prefetchedQuestion);
      setPrefetchedQuestion(null);
      setQuestionReady(false);
      setAnswer("");
      setFeedback(null);
      setState("ANSWERING");
    } else {
      // No prefetched question — fallback to normal load
      loadNextQuestion();
    }
  }, [pendingDone, reportReady, prefetchedQuestion, loadNextQuestion, token, router]);

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
      {state === "LOADING_QUESTION" && !pendingDone && (
        <Card>
          <CardContent className="space-y-4 py-8">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {state === "LOADING_QUESTION" && pendingDone && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
            <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <p>{reportReady ? "正在进入测评报告..." : "正在生成测评报告..."}</p>
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
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
                <span>Lv.{question.level}</span>
                <span className="text-border">|</span>
                <span>难度 {question.difficulty}</span>
              </span>
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
                {/* Button: next question, or report navigation when assessment is done */}
                {!pendingDone ? (
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleNextFromFeedback}
                    disabled={!questionReady && !prefetchedQuestion}
                  >
                    {!questionReady && !prefetchedQuestion ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        正在准备下一题...
                      </>
                    ) : (
                      <>
                        下一题 <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleNextFromFeedback}
                    disabled={!reportReady}
                  >
                    {reportReady ? (
                      <>查看测评报告 <ArrowRight className="h-4 w-4" /></>
                    ) : (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        正在生成测评报告...
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ChatPanel 
        token={token} 
        onQuestionReady={handleQuestionReady}
        onAssessmentDone={handleAssessmentDone}
      />
    </div>
  );
}
