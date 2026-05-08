/**
 * Assessment questions seed for GESP C++ adaptive testing.
 *
 * Seeds 16 assessment questions (4 per level, L1-L4) into SQLite and LanceDB.
 *   - L1: basic I/O, variables
 *   - L2: conditionals, loops
 *   - L3: arrays, strings, functions
 *   - L4: recursion, sorting, structs
 *
 * Usage:
 *   - Called automatically during backend bootstrap (index.ts)
 *   - Idempotent: skips if questions already exist
 *
 * Requirements: ASSESS-02, D-11, D-12, D-13, D-16
 */

import { db } from "../db";
import { assessmentQuestions } from "../db/schema/assessment";
import type { VectorStore } from "../services/vector-store";
import type { EmbeddingProvider } from "../services/embedding";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Question data (16 questions, 4 per level)
// ---------------------------------------------------------------------------

interface SeedQuestion {
  course_id: string;
  level: number;
  knowledge_point: string;
  question_type: "objective" | "coding";
  difficulty: number;
  content: string;
  answer: string;
  explanation: string;
  status: string;
  created_by: string;
}

const QUESTIONS: SeedQuestion[] = [
  // ===== LEVEL 1: 基础输入输出与变量 =====
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "变量与数据类型",
    question_type: "objective",
    difficulty: 1,
    content:
      "在C++中，以下哪个关键字用于定义整数类型的变量？\nA. float\nB. int\nC. string\nD. bool",
    answer: "B",
    explanation:
      "int 是C++中用于定义整数类型变量的关键字。float用于浮点数，string用于字符串，bool用于布尔值。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "输入输出",
    question_type: "objective",
    difficulty: 1,
    content:
      "下列代码的输出是什么？\n```cpp\nint a = 5;\ncout << a + 3;\n```\nA. 5\nB. 3\nC. 8\nD. a+3",
    answer: "C",
    explanation: "变量a的值为5，5+3=8，cout输出8。所以正确答案是C。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "运算符与表达式",
    question_type: "objective",
    difficulty: 2,
    content:
      "表达式 `10 % 3` 的结果是多少？\nA. 3\nB. 1\nC. 0\nD. 10",
    answer: "B",
    explanation: "% 是取余运算符，10除以3商3余1，所以10%3=1。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "输入输出",
    question_type: "coding",
    difficulty: 2,
    content:
      "编写一个C++程序，从输入读取两个整数a和b，计算并输出它们的和。\n\n示例：\n输入：3 5\n输出：8",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int a, b;\n  cin >> a >> b;\n  cout << a + b;\n  return 0;\n}",
    explanation:
      "使用cin读取两个整数，使用cout输出它们的和。注意包含iostream头文件。",
    status: "active",
    created_by: "manual",
  },
  // ===== LEVEL 2: 条件判断与循环 =====
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "if条件判断",
    question_type: "objective",
    difficulty: 2,
    content:
      "以下代码输出什么？\n```cpp\nint x = 10;\nif (x > 5) {\n  cout << \"A\";\n} else {\n  cout << \"B\";\n}\n```\nA. A\nB. B\nC. AB\nD. 无输出",
    answer: "A",
    explanation: "x=10，10>5成立，执行if分支输出A。else分支不执行。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "for循环",
    question_type: "objective",
    difficulty: 2,
    content:
      "以下for循环执行多少次？\n```cpp\nfor (int i = 0; i < 5; i++) {\n  cout << i;\n}\n```\nA. 4次\nB. 5次\nC. 6次\nD. 无限次",
    answer: "B",
    explanation:
      "i从0开始，循环条件i<5，i取值为0,1,2,3,4共5次。当i=5时条件不成立，循环结束。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "switch语句",
    question_type: "objective",
    difficulty: 3,
    content:
      "switch语句中，用于结束每个case的的关键字是？\nA. stop\nB. end\nC. break\nD. exit",
    answer: "C",
    explanation:
      "break用于跳出switch语句，防止case穿透。如果不加break，程序会继续执行下一个case的代码。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "for循环",
    question_type: "coding",
    difficulty: 3,
    content:
      "编写程序，输入一个整数n，使用for循环输出1到n之间所有能被3整除的数，每个数占一行。\n\n示例：\n输入：10\n输出：\n3\n6\n9",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  for (int i = 1; i <= n; i++) {\n    if (i % 3 == 0) cout << i << endl;\n  }\n  return 0;\n}",
    explanation:
      "使用for循环遍历1到n，if判断i%3==0（能被3整除），满足条件则输出。",
    status: "active",
    created_by: "manual",
  },
  // ===== LEVEL 3: 数组、字符串与函数 =====
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "一维数组",
    question_type: "objective",
    difficulty: 3,
    content:
      "定义一个有5个整数元素的数组的正确写法是？\nA. int arr[5];\nB. int arr(5);\nC. array<int> arr[5];\nD. int arr = [5];",
    answer: "A",
    explanation:
      "C++中使用方括号定义数组：类型 数组名[大小]。int arr[5]定义了一个有5个int元素的数组。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "字符串操作",
    question_type: "objective",
    difficulty: 3,
    content:
      "string类型变量s的值为\"hello\"，s.length()的返回值是？\nA. 4\nB. 5\nC. 6\nD. \"hello\"",
    answer: "B",
    explanation:
      "s.length()返回字符串的长度（字符个数）。\"hello\"有5个字符，所以返回5。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "函数定义与调用",
    question_type: "objective",
    difficulty: 3,
    content:
      "以下函数定义正确的是？\nA. int add(a, b) { return a+b; }\nB. int add(int a, int b) { return a+b; }\nC. add(int a, int b) { return a+b; }\nD. int add(int a, b) { return a+b; }",
    answer: "B",
    explanation:
      "C++函数定义需要指定返回类型和每个参数的类型。B选项int add(int a, int b)是正确的完整定义。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "一维数组",
    question_type: "coding",
    difficulty: 4,
    content:
      "编写程序，输入5个整数存入数组，然后逆序输出这5个整数（从最后一个到第一个）。\n\n示例：\n输入：1 2 3 4 5\n输出：5 4 3 2 1",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int arr[5];\n  for (int i = 0; i < 5; i++) cin >> arr[i];\n  for (int i = 4; i >= 0; i--) cout << arr[i] << \" \";\n  return 0;\n}",
    explanation:
      "第一个for循环读取5个数存入数组。第二个for循环从下标4（最后一个元素）开始递减到0，逆序输出。",
    status: "active",
    created_by: "manual",
  },
  // ===== LEVEL 4: 递归、排序与结构体 =====
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "递归函数",
    question_type: "objective",
    difficulty: 4,
    content:
      "递归函数必须包含什么？\nA. 至少两个参数\nB. 一个终止条件（递归出口）\nC. 一个全局变量\nD. 一个for循环",
    answer: "B",
    explanation:
      "递归函数必须有一个终止条件（基准情况），否则会无限递归导致栈溢出。这是递归正确运行的保证。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "冒泡排序",
    question_type: "objective",
    difficulty: 4,
    content:
      "冒泡排序中，每一轮遍历后，下列哪个说法是正确的？\nA. 最小的元素会被移到最前面\nB. 最大的元素会被移到最后面\nC. 所有元素都会随机交换\nD. 数组顺序不变",
    answer: "B",
    explanation:
      "冒泡排序每轮通过相邻元素比较交换，将当前未排序部分的最大元素\"冒泡\"到最后位置。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "结构体定义",
    question_type: "objective",
    difficulty: 4,
    content:
      "以下定义结构体的正确语法是？\nA. struct Student { string name; int age; }\nB. struct Student { string name; int age; };\nC. class Student { string name; int age; };\nD. Student struct { string name; int age; };",
    answer: "B",
    explanation:
      "C++中使用struct关键字定义结构体，花括号后需要分号。B选项语法完整正确。结构体成员默认为public。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "递归函数",
    question_type: "coding",
    difficulty: 5,
    content:
      "用递归函数计算n的阶乘（n! = n × (n-1) × ... × 1）。要求编写一个函数`int factorial(int n)`，并在main中调用。保证输入n≥0，0的阶乘为1。\n\n示例：\n输入：5\n输出：120",
    answer:
      "#include <iostream>\nusing namespace std;\nint factorial(int n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}\nint main() {\n  int n;\n  cin >> n;\n  cout << factorial(n);\n  return 0;\n}",
    explanation:
      "递归函数factorial：终止条件n<=1返回1；递归式n * factorial(n-1)。这种自顶向下的分解是递归的经典应用。",
    status: "active",
    created_by: "manual",
  },
];

// ---------------------------------------------------------------------------
// Embedding helpers
// ---------------------------------------------------------------------------

const BATCH_SIZE = 32;

async function embedInBatches(
  embedder: EmbeddingProvider,
  texts: string[]
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    logger.info(
      {
        batch: Math.floor(i / BATCH_SIZE) + 1,
        total_batches: Math.ceil(texts.length / BATCH_SIZE),
        count: batch.length,
      },
      "Embedding batch"
    );
    const embeddings = await embedder.embedBatch(batch);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedAssessmentQuestions(
  vectorStore: VectorStore,
  embedder: EmbeddingProvider
): Promise<{ sqliteCount: number; lanceCount: number }> {
  logger.info("Seeding assessment questions...");

  // Idempotency check: find which questions already exist by content
  const existingRecords = await db.query.assessmentQuestions.findMany();
  const existingCount = existingRecords.length;

  if (existingCount >= QUESTIONS.length) {
    logger.info(
      { existing_count: existingCount, expected_count: QUESTIONS.length },
      "Assessment questions already seeded, skipping"
    );
    return { sqliteCount: 0, lanceCount: 0 };
  }

  // Build a set of existing question fingerprints for deduplication
  const existingFingerprints = new Set(
    existingRecords.map((r) => `${r.course_id}|${r.level}|${r.knowledge_point}|${r.question_type}|${r.content}`)
  );

  // Filter out questions that already exist
  const newQuestions = QUESTIONS.filter(
    (q) => !existingFingerprints.has(`${q.course_id}|${q.level}|${q.knowledge_point}|${q.question_type}|${q.content}`)
  );

  if (newQuestions.length === 0) {
    logger.info(
      { existing_count: existingCount },
      "All assessment questions already seeded, skipping"
    );
    return { sqliteCount: 0, lanceCount: 0 };
  }

  logger.info(
    { new_count: newQuestions.length, existing_count: existingCount },
    "Seeding new assessment questions"
  );

  // Insert into SQLite
  const inserted = await db
    .insert(assessmentQuestions)
    .values(
      newQuestions.map((q) => ({
        ...q,
        id: crypto.randomUUID(),
        created_at: new Date(),
        updated_at: new Date(),
      }))
    )
    .returning();

  logger.info(
    { count: inserted.length, levels: [1, 2, 3, 4] },
    "Assessment questions inserted into SQLite"
  );

  // Prepare LanceDB records with embeddings
  const texts = newQuestions.map(
    (q) => `${q.content} ${q.knowledge_point} ${q.explanation || ""}`
  );
  const embeddings = await embedInBatches(embedder, texts);

  const lanceRecords = inserted.map((row, i) => ({
    id: row.id,
    course_id: row.course_id,
    level: row.level,
    knowledge_point: row.knowledge_point,
    question_type: row.question_type,
    content: row.content,
    explanation: row.explanation || "",
    vector: embeddings[i],
  }));

  // Insert into LanceDB
  await vectorStore.insert("assessment_questions", lanceRecords);
  logger.info(
    { count: lanceRecords.length },
    "Assessment questions indexed in LanceDB"
  );

  return { sqliteCount: inserted.length, lanceCount: lanceRecords.length };
}