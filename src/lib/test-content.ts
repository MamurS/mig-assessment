import enContent from '@/locales/en.json';
import ruContent from '@/locales/ru.json';
import uzContent from '@/locales/uz.json';
import type { Lang, TestContent } from '@/types';

const tests: Record<Lang, TestContent> = {
  en: enContent as TestContent,
  ru: ruContent as TestContent,
  uz: uzContent as TestContent,
};

export function getTest(lang: Lang): TestContent {
  return tests[lang];
}

// Build a lookup of correct answers and rubrics indexed by question id.
// Same across all languages, so we use EN as the canonical source.
export function getAnswerKey(): Record<
  string,
  { correct?: string[]; rubric?: string; type: string; points: number }
> {
  const key: Record<string, { correct?: string[]; rubric?: string; type: string; points: number }> = {};
  for (const q of (enContent as TestContent).questions) {
    if (q.type === 'open') {
      key[q.id] = { rubric: q.rubric, type: q.type, points: q.points };
    } else {
      key[q.id] = { correct: q.correct, type: q.type, points: q.points };
    }
  }
  return key;
}

export const LANGUAGES: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'uz', label: "O'zbekcha" },
];

export const TEST_DURATION_MINUTES = 90;

export function shuffleQuestionOrder(questions: { id: string; part: string }[]): string[] {
  // Randomize WITHIN each part to keep section structure intact.
  // Trainees still see Part I first, then II, III, IV, but question order
  // within each part is shuffled.
  const byPart: Record<string, string[]> = {};
  for (const q of questions) {
    if (!byPart[q.part]) byPart[q.part] = [];
    byPart[q.part].push(q.id);
  }
  const result: string[] = [];
  for (const part of Object.keys(byPart).sort()) {
    const ids = byPart[part];
    // Fisher-Yates
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    result.push(...ids);
  }
  return result;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
