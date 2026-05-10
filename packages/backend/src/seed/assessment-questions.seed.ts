/**
 * Assessment questions seed for GESP C++ adaptive testing.
 *
 * Seeds assessment questions into SQLite and LanceDB.
 * Question bank requirements (per D-16):
 *   - 1-8 levels, no gaps
 *   - 5 questions per level (3 objective + 2 coding), Levels 1-4 expanded to 10
 *   - All questions production-ready (no placeholders)
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
// Question types and data (exported for test validation)
// ---------------------------------------------------------------------------

export interface SeedQuestion {
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

export const ASSESSMENT_QUESTIONS: SeedQuestion[] = [
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
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "运算符与表达式",
    question_type: "coding",
    difficulty: 2,
    content:
      "编写程序，输入一个整数n，输出n的绝对值（如果n为负数，输出-n；否则输出n）。不允许使用abs函数。\n\n示例：\n输入：-5\n输出：5",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  if (n < 0) cout << -n;\n  else cout << n;\n  return 0;\n}",
    explanation:
      "使用条件判断处理负数情况：如果n<0，输出-n（负负得正）；否则直接输出n。",
    status: "active",
    created_by: "manual",
  },
  // --- Level 1 扩充 (difficulty 1-3) ---
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "常量定义",
    question_type: "objective",
    difficulty: 1,
    content:
      "在C++中，定义一个不可修改的常量应该使用哪个关键字？\nA. let\nB. const\nC. final\nD. static",
    answer: "B",
    explanation:
      "const关键字定义常量，常量在程序运行期间不能被修改。例如 const int PI = 3.14; 定义后PI的值不能再改变。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "类型转换",
    question_type: "objective",
    difficulty: 2,
    content:
      "以下代码输出什么？\n```cpp\nint a = 7, b = 2;\ncout << a / b;\n```\nA. 3.5\nB. 3\nC. 4\nD. 3.0",
    answer: "B",
    explanation:
      "两个整数相除，结果仍为整数，小数部分直接丢弃（截断）。7/2=3，不是3.5。要得到3.5需要至少一个操作数是浮点数。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "运算符优先级",
    question_type: "objective",
    difficulty: 3,
    content:
      "表达式 `2 + 3 * 4` 的结果是多少？\nA. 20\nB. 14\nC. 24\nD. 9",
    answer: "B",
    explanation:
      "乘法优先级高于加法，先算3*4=12，再加2得到14。要改变顺序需用括号：(2+3)*4=20。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "变量赋值",
    question_type: "coding",
    difficulty: 2,
    content:
      "编写程序，输入两个整数a和b，交换它们的值后输出。要求交换后先输出a再输出b，用空格分隔。\n\n示例：\n输入：3 5\n输出：5 3",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int a, b;\n  cin >> a >> b;\n  int temp = a;\n  a = b;\n  b = temp;\n  cout << a << \" \" << b;\n  return 0;\n}",
    explanation:
      "使用临时变量temp保存a的值，然后将b赋给a，再将temp赋给b，完成两个变量的值交换。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 1,
    knowledge_point: "输入输出",
    question_type: "coding",
    difficulty: 3,
    content:
      "编写程序，输入一个三位数的整数，分别输出它的百位、十位和个位数字，每个数字占一行。\n\n示例：\n输入：365\n输出：\n3\n6\n5",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  cout << n / 100 << endl;\n  cout << n / 10 % 10 << endl;\n  cout << n % 10 << endl;\n  return 0;\n}",
    explanation:
      "百位：n/100（整除得到百位数字）；十位：n/10%10（先去掉个位再取余）；个位：n%10（直接取余）。",
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
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "while循环",
    question_type: "coding",
    difficulty: 3,
    content:
      "编写程序，输入一个正整数n，使用while循环计算1到n的和（即1+2+...+n），输出结果。\n\n示例：\n输入：5\n输出：15",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int n, sum = 0;\n  cin >> n;\n  int i = 1;\n  while (i <= n) {\n    sum += i;\n    i++;\n  }\n  cout << sum;\n  return 0;\n}",
    explanation:
      "使用while循环累加1到n，初始化i=1和sum=0，每次循环加i到sum，i自增，直到i>n。",
    status: "active",
    created_by: "manual",
  },
  // --- Level 2 扩充 (difficulty 4-5) ---
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "嵌套if",
    question_type: "objective",
    difficulty: 4,
    content:
      "以下代码输出什么？\n```cpp\nint x = 5, y = 10;\nif (x > 3) {\n  if (y > 8) {\n    cout << \"A\";\n  } else {\n    cout << \"B\";\n  }\n} else {\n  cout << \"C\";\n}\n```\nA. A\nB. B\nC. C\nD. AB",
    answer: "A",
    explanation:
      "x=5>3成立进入外层if，y=10>8成立进入内层if，输出A。嵌套if需要逐层判断条件。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "逻辑运算符",
    question_type: "objective",
    difficulty: 4,
    content:
      "以下代码输出什么？\n```cpp\nint a = 3, b = 5;\nif (a > 0 && b > 0) {\n  cout << \"正\";\n} else {\n  cout << \"非\";\n}\n```\nA. 正\nB. 非\nC. 无输出\nD. 正非",
    answer: "A",
    explanation:
      "&&是逻辑与运算符，两个条件都为真时结果为真。a=3>0且b=5>0，两个都成立，输出\"正\"。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "嵌套循环",
    question_type: "objective",
    difficulty: 5,
    content:
      "以下代码输出多少个\"*\"？\n```cpp\nfor (int i = 1; i <= 3; i++) {\n  for (int j = 1; j <= 2; j++) {\n    cout << \"*\";\n  }\n}\n```\nA. 5\nB. 6\nC. 8\nD. 9",
    answer: "B",
    explanation:
      "外层循环3次（i=1,2,3），每次内层循环2次（j=1,2），总共3*2=6次，输出6个\"*\"。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "条件分支",
    question_type: "coding",
    difficulty: 4,
    content:
      "编写程序，输入一个整数成绩（0-100），输出对应等级：90及以上输出\"A\"，80-89输出\"B\"，70-79输出\"C\"，60-69输出\"D\"，低于60输出\"E\"。\n\n示例：\n输入：85\n输出：B",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int score;\n  cin >> score;\n  if (score >= 90) cout << \"A\";\n  else if (score >= 80) cout << \"B\";\n  else if (score >= 70) cout << \"C\";\n  else if (score >= 60) cout << \"D\";\n  else cout << \"E\";\n  return 0;\n}",
    explanation:
      "使用多分支if-else判断成绩范围，注意判断顺序从高分到低分，避免条件重叠。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 2,
    knowledge_point: "循环累加",
    question_type: "coding",
    difficulty: 5,
    content:
      "编写程序，输入一个正整数n，计算并输出n以内（包括n）所有偶数的和。\n\n示例：\n输入：10\n输出：30（即2+4+6+8+10）",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  int sum = 0;\n  for (int i = 2; i <= n; i += 2) {\n    sum += i;\n  }\n  cout << sum;\n  return 0;\n}",
    explanation:
      "从2开始每次加2遍历所有偶数，累加求和。也可以用i%2==0判断偶数。",
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
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "函数定义与调用",
    question_type: "coding",
    difficulty: 4,
    content:
      "编写一个函数int max(int a, int b)，返回两个整数中的较大值。然后在main中读取两个整数，调用该函数并输出结果。\n\n示例：\n输入：7 3\n输出：7",
    answer:
      "#include <iostream>\nusing namespace std;\nint max(int a, int b) {\n  if (a > b) return a;\n  else return b;\n}\nint main() {\n  int a, b;\n  cin >> a >> b;\n  cout << max(a, b);\n  return 0;\n}",
    explanation:
      "函数max使用条件判断返回较大值。main函数读取输入并调用max函数。",
    status: "active",
    created_by: "manual",
  },
  // --- Level 3 扩充 (difficulty 5-6) ---
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "数组查找",
    question_type: "objective",
    difficulty: 5,
    content:
      "以下代码输出什么？\n```cpp\nint arr[5] = {10, 20, 30, 40, 50};\nint target = 30;\nfor (int i = 0; i < 5; i++) {\n  if (arr[i] == target) {\n    cout << i;\n    break;\n  }\n}\n```\nA. 2\nB. 3\nC. 30\nD. 10",
    answer: "A",
    explanation:
      "线性查找：从下标0开始遍历数组，找到第一个等于目标值30的元素时输出其下标2并跳出循环。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "字符串处理",
    question_type: "objective",
    difficulty: 5,
    content:
      "string变量s的值为\"abcde\"，s.substr(1, 3)的结果是？\nA. \"abc\"\nB. \"bcd\"\nC. \"cde\"\nD. \"abcd\"",
    answer: "B",
    explanation:
      "substr(pos, len)从位置pos开始取len个字符。s.substr(1,3)从下标1（字符'b'）开始取3个字符，得到\"bcd\"。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "函数参数传递",
    question_type: "objective",
    difficulty: 6,
    content:
      "以下哪个函数定义可以修改传入变量的值？\nA. void add(int a) { a = a + 1; }\nB. void add(int& a) { a = a + 1; }\nC. void add(const int a) { a = a + 1; }\nD. void add(int* a) { a = a + 1; }",
    answer: "B",
    explanation:
      "引用参数（int&）可以直接修改传入变量的值。普通参数只是复制值，修改不影响原变量。const参数不能修改。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "数组统计",
    question_type: "coding",
    difficulty: 5,
    content:
      "编写程序，输入n（n≤100）和n个整数，找出数组中最大值和最小值，先输出最大值再输出最小值，用空格分隔。\n\n示例：\n输入：5 3 7 1 9 4\n输出：9 1",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  int arr[100];\n  for (int i = 0; i < n; i++) cin >> arr[i];\n  int maxVal = arr[0], minVal = arr[0];\n  for (int i = 1; i < n; i++) {\n    if (arr[i] > maxVal) maxVal = arr[i];\n    if (arr[i] < minVal) minVal = arr[i];\n  }\n  cout << maxVal << \" \" << minVal;\n  return 0;\n}",
    explanation:
      "初始化maxVal和minVal为第一个元素，遍历数组更新最大值和最小值。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 3,
    knowledge_point: "字符串计数",
    question_type: "coding",
    difficulty: 6,
    content:
      "编写程序，输入一个字符串（不含空格），统计其中大写字母、小写字母和数字字符的个数，分别输出，用空格分隔。\n\n示例：\n输入：Abc123Xyz\n输出：2 5 3",
    answer:
      "#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n  string s;\n  cin >> s;\n  int upper = 0, lower = 0, digit = 0;\n  for (int i = 0; i < s.length(); i++) {\n    if (s[i] >= 'A' && s[i] <= 'Z') upper++;\n    else if (s[i] >= 'a' && s[i] <= 'z') lower++;\n    else if (s[i] >= '0' && s[i] <= '9') digit++;\n  }\n  cout << upper << \" \" << lower << \" \" << digit;\n  return 0;\n}",
    explanation:
      "遍历字符串每个字符，使用ASCII范围判断：A-Z是大写字母，a-z是小写字母，0-9是数字。",
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
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "冒泡排序",
    question_type: "coding",
    difficulty: 5,
    content:
      "编写程序，输入n（n≤100）和n个整数，使用冒泡排序将数组从小到大排序，然后输出排序后的数组。\n\n示例：\n输入：5 3 1 4 5 2\n输出：1 2 3 4 5",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int n, arr[100];\n  cin >> n;\n  for (int i = 0; i < n; i++) cin >> arr[i];\n  for (int i = 0; i < n-1; i++) {\n    for (int j = 0; j < n-i-1; j++) {\n      if (arr[j] > arr[j+1]) swap(arr[j], arr[j+1]);\n    }\n  }\n  for (int i = 0; i < n; i++) cout << arr[i] << \" \";\n  return 0;\n}",
    explanation:
      "冒泡排序双重循环：外层控制轮数，内层控制每轮比较次数。相邻元素比较交换，每轮将最大值移到末尾。",
    status: "active",
    created_by: "manual",
  },
  // --- Level 4 扩充 (difficulty 6-8) ---
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "选择排序",
    question_type: "objective",
    difficulty: 6,
    content:
      "选择排序每轮遍历后，哪个元素会被放到正确位置？\nA. 当前未排序部分的最小元素\nB. 当前未排序部分的最大元素\nC. 数组的第一个元素\nD. 随机一个元素",
    answer: "A",
    explanation:
      "选择排序每轮从未排序部分找到最小元素，放到已排序部分的末尾（当前轮次的起始位置）。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "结构体数组",
    question_type: "objective",
    difficulty: 6,
    content:
      "以下代码输出什么？\n```cpp\nstruct Point { int x, y; }; \nPoint p[2] = {{1, 2}, {3, 4}};\ncout << p[1].x;\n```\nA. 1\nB. 2\nC. 3\nD. 4",
    answer: "C",
    explanation:
      "p[1]是数组第二个元素（下标1），其x坐标为3。结构体数组通过下标访问元素，再通过.访问成员。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "递归原理",
    question_type: "objective",
    difficulty: 7,
    content:
      "调用factorial(3)时，函数调用的顺序是？（factorial函数定义：if (n<=1) return 1; return n*factorial(n-1);）\nA. factorial(3) → factorial(2) → factorial(1)\nB. factorial(1) → factorial(2) → factorial(3)\nC. factorial(3) → factorial(1) → factorial(2)\nD. factorial(3) 只调用一次",
    answer: "A",
    explanation:
      "递归调用顺序：factorial(3)调用factorial(2)，后者再调用factorial(1)。factorial(1)返回1结束递归，然后逐层返回计算结果。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "结构体与函数",
    question_type: "coding",
    difficulty: 7,
    content:
      "定义一个表示学生信息的结构体Student，包含姓名（string）和成绩（int）。编写程序，输入3个学生的姓名和成绩，输出成绩最高的学生的姓名。\n\n示例：\n输入：\nTom 85\nJerry 92\nAlice 88\n输出：Jerry",
    answer:
      "#include <iostream>\n#include <string>\nusing namespace std;\nstruct Student { string name; int score; }; \nint main() {\n  Student s[3];\n  for (int i = 0; i < 3; i++) {\n    cin >> s[i].name >> s[i].score;\n  }\n  int maxIdx = 0;\n  for (int i = 1; i < 3; i++) {\n    if (s[i].score > s[maxIdx].score) maxIdx = i;\n  }\n  cout << s[maxIdx].name;\n  return 0;\n}",
    explanation:
      "结构体数组存储学生信息，遍历数组找到成绩最高的学生，记录其下标后输出姓名。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 4,
    knowledge_point: "递归斐波那契",
    question_type: "coding",
    difficulty: 8,
    content:
      "用递归函数计算斐波那契数列的第n项（fib(1)=1, fib(2)=1, fib(n)=fib(n-1)+fib(n-2)）。输入n（n≤20），输出fib(n)。\n\n示例：\n输入：10\n输出：55",
    answer:
      "#include <iostream>\nusing namespace std;\nint fib(int n) {\n  if (n <= 2) return 1;\n  return fib(n - 1) + fib(n - 2);\n}\nint main() {\n  int n;\n  cin >> n;\n  cout << fib(n);\n  return 0;\n}",
    explanation:
      "斐波那契递归定义：终止条件n<=2返回1；递归式fib(n-1)+fib(n-2)。fib(10)=55。",
    status: "active",
    created_by: "manual",
  },
  // ===== LEVEL 5: 指针、动态内存与文件I/O =====
  {
    course_id: "cpp",
    level: 5,
    knowledge_point: "指针基础",
    question_type: "objective",
    difficulty: 5,
    content:
      "以下关于指针的说法正确的是？\nA. 指针存储变量的值\nB. 指针存储变量的地址\nC. 指针只能指向整数\nD. 指针不能指向数组",
    answer: "B",
    explanation:
      "指针是一种特殊的变量，存储的是另一个变量的内存地址，而不是值本身。通过指针可以间接访问指向的变量。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 5,
    knowledge_point: "动态内存分配",
    question_type: "objective",
    difficulty: 5,
    content:
      "C++中用于动态分配内存的关键字是？\nA. malloc\nB. new\nC. alloc\nD. create",
    answer: "B",
    explanation:
      "C++使用new关键字进行动态内存分配，malloc是C语言的方式。new返回指向分配内存的指针，需要用delete释放。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 5,
    knowledge_point: "文件输入输出",
    question_type: "objective",
    difficulty: 5,
    content:
      "要读取文件内容，应该使用哪个类？\nA. ofstream\nB. ifstream\nC. fstream\nD. filestream",
    answer: "B",
    explanation:
      "ifstream（input file stream）用于从文件读取数据。ofstream用于写入文件，fstream可同时读写。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 5,
    knowledge_point: "指针与数组",
    question_type: "coding",
    difficulty: 6,
    content:
      "编写程序，输入n（n≤100），使用动态内存分配创建一个大小为n的整数数组，读取n个整数，计算并输出它们的平均值（保留小数）。\n\n示例：\n输入：3 1 2 3\n输出：2",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  int* arr = new int[n];\n  for (int i = 0; i < n; i++) cin >> arr[i];\n  int sum = 0;\n  for (int i = 0; i < n; i++) sum += arr[i];\n  cout << sum / n;\n  delete[] arr;\n  return 0;\n}",
    explanation:
      "使用new动态分配数组，计算平均值后必须用delete[]释放动态数组内存，避免内存泄漏。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 5,
    knowledge_point: "文件输入输出",
    question_type: "coding",
    difficulty: 6,
    content:
      "编写程序，从input.txt读取一个整数n，然后写入n的平方到output.txt。假设input.txt已存在且包含一个整数。\n\n示例：\ninput.txt内容：5\noutput.txt内容：25",
    answer:
      "#include <iostream>\n#include <fstream>\nusing namespace std;\nint main() {\n  ifstream fin(\"input.txt\");\n  ofstream fout(\"output.txt\");\n  int n;\n  fin >> n;\n  fout << n * n;\n  fin.close();\n  fout.close();\n  return 0;\n}",
    explanation:
      "使用ifstream读取文件，ofstream写入文件。操作完成后关闭文件流确保数据写入磁盘。",
    status: "active",
    created_by: "manual",
  },
  // ===== LEVEL 6: STL容器与迭代器 =====
  {
    course_id: "cpp",
    level: 6,
    knowledge_point: "vector容器",
    question_type: "objective",
    difficulty: 6,
    content:
      "vector相比数组的主要优势是？\nA. 运行速度更快\nB. 内存占用更小\nC. 大小可以动态改变\nD. 只能存储整数",
    answer: "C",
    explanation:
      "vector是动态数组，大小可以在运行时改变（push_back、resize等），而普通数组大小固定。vector提供灵活的容器操作。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 6,
    knowledge_point: "map容器",
    question_type: "objective",
    difficulty: 6,
    content:
      "map容器的主要特点是？\nA. 存储单一类型元素\nB. 键值对存储，自动按键排序\nC. 只能用整数作为键\nD. 元素顺序固定不变",
    answer: "B",
    explanation:
      "map是关联容器，存储键值对（key-value），内部自动按键排序，支持快速查找。键可以是多种类型，如int、string等。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 6,
    knowledge_point: "迭代器",
    question_type: "objective",
    difficulty: 6,
    content:
      "迭代器的作用是？\nA. 替代循环语句\nB. 提供统一的容器元素访问方式\nC. 只能用于vector\nD. 必须从0开始遍历",
    answer: "B",
    explanation:
      "迭代器提供统一的访问容器元素的方式，可用于vector、list、map等多种容器，是STL算法与容器之间的桥梁。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 6,
    knowledge_point: "vector容器",
    question_type: "coding",
    difficulty: 7,
    content:
      "编写程序，输入n和n个整数，使用vector存储，然后使用迭代器遍历vector，输出所有元素的平方。\n\n示例：\n输入：3 1 2 3\n输出：1 4 9",
    answer:
      "#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  vector<int> v;\n  for (int i = 0; i < n; i++) {\n    int x;\n    cin >> x;\n    v.push_back(x);\n  }\n  for (auto it = v.begin(); it != v.end(); it++) {\n    cout << (*it) * (*it) << \" \";\n  }\n  return 0;\n}",
    explanation:
      "使用vector的push_back动态添加元素，用迭代器begin/end遍历，*it获取当前元素值。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 6,
    knowledge_point: "map容器",
    question_type: "coding",
    difficulty: 7,
    content:
      "编写程序，输入若干单词（以\"end\"结束），使用map统计每个单词出现的次数，然后输出每个单词及其出现次数。\n\n示例：\n输入：apple banana apple end\n输出：apple: 2 banana: 1",
    answer:
      "#include <iostream>\n#include <map>\n#include <string>\nusing namespace std;\nint main() {\n  map<string, int> cnt;\n  string word;\n  while (cin >> word && word != \"end\") {\n    cnt[word]++;\n  }\n  for (auto& p : cnt) {\n    cout << p.first << \": \" << p.second << endl;\n  }\n  return 0;\n}",
    explanation:
      "map自动统计键出现次数，cnt[word]++递增计数。使用范围for遍历map，p.first是键，p.second是值。",
    status: "active",
    created_by: "manual",
  },
  // ===== LEVEL 7: 高级算法与面向对象基础 =====
  {
    course_id: "cpp",
    level: 7,
    knowledge_point: "二分查找",
    question_type: "objective",
    difficulty: 7,
    content:
      "二分查找的前提条件是？\nA. 数组元素必须是整数\nB. 数组必须已排序\nC. 数组大小必须为偶数\nD. 数组不能有重复元素",
    answer: "B",
    explanation:
      "二分查找通过不断缩小搜索范围快速定位目标，前提是数组必须有序。每次比较中间元素，根据结果缩小到左半或右半。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 7,
    knowledge_point: "类的定义",
    question_type: "objective",
    difficulty: 7,
    content:
      "C++类的成员默认访问权限是？\nA. public\nB. private\nC. protected\nD. static",
    answer: "B",
    explanation:
      "C++类（class）的成员默认为private（私有），只能在类内部访问。struct默认为public（公开）。这是封装原则的基础。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 7,
    knowledge_point: "构造函数",
    question_type: "objective",
    difficulty: 7,
    content:
      "构造函数的作用是？\nA. 销毁对象\nB. 初始化对象成员变量\nC. 复制对象\nD. 静态方法调用",
    answer: "B",
    explanation:
      "构造函数在创建对象时自动调用，用于初始化对象的成员变量。析构函数用于销毁对象时清理资源。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 7,
    knowledge_point: "二分查找",
    question_type: "coding",
    difficulty: 8,
    content:
      "编写程序，输入n和n个已排序的整数，再输入目标值x，使用二分查找判断x是否在数组中，输出\"found\"或\"not found\"。\n\n示例：\n输入：5 1 3 5 7 9 5\n输出：found",
    answer:
      "#include <iostream>\nusing namespace std;\nint main() {\n  int n, arr[100], x;\n  cin >> n;\n  for (int i = 0; i < n; i++) cin >> arr[i];\n  cin >> x;\n  int left = 0, right = n - 1;\n  while (left <= right) {\n    int mid = (left + right) / 2;\n    if (arr[mid] == x) { cout << \"found\"; return 0; }\n    else if (arr[mid] < x) left = mid + 1;\n    else right = mid - 1;\n  }\n  cout << \"not found\";\n  return 0;\n}",
    explanation:
      "二分查找维护左右边界，每次比较mid位置。等于目标返回，小于目标左边界右移，大于目标右边界左移。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 7,
    knowledge_point: "类的定义",
    question_type: "coding",
    difficulty: 8,
    content:
      "定义一个Student类，包含name（string）和score（int）两个私有成员，提供公有方法setName、setScore和display。在main中创建对象并测试。\n\n示例：\n输出：Name: Tom, Score: 95",
    answer:
      "#include <iostream>\n#include <string>\nusing namespace std;\nclass Student {\nprivate:\n  string name;\n  int score;\npublic:\n  void setName(string n) { name = n; }\n  void setScore(int s) { score = s; }\n  void display() {\n    cout << \"Name: \" << name << \", Score: \" << score;\n  }\n};\nint main() {\n  Student s;\n  s.setName(\"Tom\");\n  s.setScore(95);\n  s.display();\n  return 0;\n}",
    explanation:
      "类封装私有成员，通过公有方法访问。setName/setScore修改成员，display输出信息。体现封装原则。",
    status: "active",
    created_by: "manual",
  },
  // ===== LEVEL 8: 复杂数据结构与算法 =====
  {
    course_id: "cpp",
    level: 8,
    knowledge_point: "树的遍历",
    question_type: "objective",
    difficulty: 8,
    content:
      "二叉树的前序遍历顺序是？\nA. 左子树 → 根 → 右子树\nB. 根 → 左子树 → 右子树\nC. 左子树 → 右子树 → 根\nD. 右子树 → 根 → 左子树",
    answer: "B",
    explanation:
      "前序遍历先访问根节点，再递归遍历左子树，最后遍历右子树。中序是左-根-右，后序是左-右-根。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 8,
    knowledge_point: "图的表示",
    question_type: "objective",
    difficulty: 8,
    content:
      "图的邻接表相比邻接矩阵的优势是？\nA. 查找任意两点关系更快\nB. 存储稀疏图更节省空间\nC. 实现更简单\nD. 只能用于无向图",
    answer: "B",
    explanation:
      "邻接表只存储存在的边，对于稀疏图（边很少）比邻接矩阵节省大量空间。邻接矩阵需要O(V²)空间。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 8,
    knowledge_point: "动态规划",
    question_type: "objective",
    difficulty: 8,
    content:
      "动态规划的核心思想是？\nA. 贪心选择\nB. 分治递归\nC. 记忆化避免重复计算\nD. 随机尝试",
    answer: "C",
    explanation:
      "动态规划通过保存子问题的解（记忆化）避免重复计算，将复杂问题分解为重叠子问题，显著提升效率。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 8,
    knowledge_point: "树的遍历",
    question_type: "coding",
    difficulty: 9,
    content:
      "给定二叉树的前序和中序遍历序列，编写程序输出后序遍历序列。前序第一个元素为根，在中序中找到根可分割左右子树。\n\n示例：\n前序：1 2 4 5 3\n中序：4 2 5 1 3\n输出：4 5 2 3 1",
    answer:
      "#include <iostream>\nusing namespace std;\nstring preorder, inorder;\nvoid postorder(int pleft, int pright, int ileft, int iright) {\n  if (pleft > pright) return;\n  char root = preorder[pleft];\n  int pos = inorder.find(root);\n  int leftsize = pos - ileft;\n  postorder(pleft+1, pleft+leftsize, ileft, pos-1);\n  postorder(pleft+leftsize+1, pright, pos+1, iright);\n  cout << root << \" \";\n}\nint main() {\n  cin >> preorder >> inorder;\n  postorder(0, preorder.size()-1, 0, inorder.size()-1);\n  return 0;\n}",
    explanation:
      "递归重建树：前序首元素是根，在中序找到根位置，分割左右子树范围，递归处理左右子树，最后输出根（后序）。",
    status: "active",
    created_by: "manual",
  },
  {
    course_id: "cpp",
    level: 8,
    knowledge_point: "动态规划",
    question_type: "coding",
    difficulty: 9,
    content:
      "使用动态规划解决0-1背包问题。输入物品数量n、背包容量W、每个物品的重量和价值，输出背包能装的最大总价值。\n\n示例：\n输入：3 5\n重量：2 3 4\n价值：3 4 5\n输出：7",
    answer:
      "#include <iostream>\nusing namespace std;\nint n, W, w[100], v[100], dp[100][100];\nint main() {\n  cin >> n >> W;\n  for (int i = 1; i <= n; i++) cin >> w[i];\n  for (int i = 1; i <= n; i++) cin >> v[i];\n  for (int i = 1; i <= n; i++) {\n    for (int j = 0; j <= W; j++) {\n      dp[i][j] = dp[i-1][j];\n      if (j >= w[i]) dp[i][j] = max(dp[i][j], dp[i-1][j-w[i]] + v[i]);\n    }\n  }\n  cout << dp[n][W];\n  return 0;\n}",
    explanation:
      "dp[i][j]表示前i个物品、容量j的最大价值。每个物品决策：不选（dp[i-1][j]）或选（dp[i-1][j-w[i]]+v[i]）。取最大值。",
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

  if (existingCount >= ASSESSMENT_QUESTIONS.length) {
    logger.info(
      { existing_count: existingCount, expected_count: ASSESSMENT_QUESTIONS.length },
      "Assessment questions already seeded, skipping"
    );
    return { sqliteCount: 0, lanceCount: 0 };
  }

  // Build a set of existing question fingerprints for deduplication
  const existingFingerprints = new Set(
    existingRecords.map((r) => `${r.course_id}|${r.level}|${r.knowledge_point}|${r.question_type}|${r.content}`)
  );

  // Filter out questions that already exist
  const newQuestions = ASSESSMENT_QUESTIONS.filter(
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
    { count: inserted.length, levels: [1, 2, 3, 4, 5, 6, 7, 8] },
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