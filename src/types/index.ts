// Test content types — these mirror the JSON in src/locales/

export type Lang = 'en' | 'ru' | 'uz';

export type QuestionType = 'mcq_single' | 'mcq_multi' | 'open';

export interface MCQOption {
  letter: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface QuestionBase {
  id: string;          // stable id, language-independent (e.g. "q1", "q14")
  number: number;      // display number
  type: QuestionType;
  points: number;
  part: string;        // section label, localized
  text: string;        // localized prompt
}

export interface MCQQuestion extends QuestionBase {
  type: 'mcq_single' | 'mcq_multi';
  options: MCQOption[];
  correct: string[];   // letters: ['B'] for single, ['A','C'] for multi
}

export interface OpenQuestion extends QuestionBase {
  type: 'open';
  rubric: string;      // model answer / grading rubric (used by AI grader)
  // No correct answer; AI grades against rubric.
}

export type Question = MCQQuestion | OpenQuestion;

export interface TestContent {
  lang: Lang;
  title: string;
  subtitle: string;
  org: string;
  instructions: string;
  partLabels: Record<string, string>;
  ui: {
    candidate_name: string;
    candidate_email: string;
    start: string;
    next: string;
    prev: string;
    submit: string;
    submit_confirm: string;
    time_remaining: string;
    select_lang: string;
    welcome: string;
    welcome_body: string;
    open_answer_placeholder: string;
    submitting: string;
    submitted_title: string;
    submitted_body: string;
    error: string;
    required: string;
    invalid_email: string;
    already_taken: string;
    page_label: string;
  };
  questions: Question[];
}

// Database-shaped types

export interface Attempt {
  id: string;
  candidate_name: string;
  candidate_email: string;
  lang: Lang;
  started_at: string;      // ISO
  submitted_at: string | null;
  auto_score: number | null;       // sum of MCQ + AI-graded
  manual_score: number | null;     // admin-adjusted final
  status: 'in_progress' | 'submitted' | 'graded';
  question_order: string[]; // randomized order of question ids
}

export interface AnswerRecord {
  id: string;
  attempt_id: string;
  question_id: string;
  question_type: QuestionType;
  // For MCQ: array of selected letters
  // For open: candidate's free text
  response: string[] | string;
  // Auto/AI score for this question
  auto_points: number | null;
  // Admin override
  manual_points: number | null;
  // AI feedback / admin comment
  ai_feedback: string | null;
  admin_comment: string | null;
}
