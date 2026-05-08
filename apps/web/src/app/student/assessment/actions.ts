"use server";

import { redirect } from "next/navigation";
import { startAssessment } from "@/lib/server-api";

export async function handleStart(formData: FormData) {
  const courseId = (formData.get("course_id") as string) || "cpp";
  const startLevel = parseInt(formData.get("start_level") as string) || 1;
  const questionLimit = formData.get("question_limit") ? parseInt(formData.get("question_limit") as string) : undefined;
  const timeLimit = formData.get("time_limit") ? parseInt(formData.get("time_limit") as string) : undefined;

  const res = await startAssessment({
    course_id: courseId,
    start_level: startLevel,
    config_question_limit: questionLimit,
    config_time_limit_min: timeLimit,
  });

  if (res.success && res.data?.token) {
    redirect(`/student/assessment/${res.data.token}`);
  }
  return { error: res.message || "创建测评失败" };
}