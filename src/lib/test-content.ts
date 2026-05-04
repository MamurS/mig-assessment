import reinsuranceEn from '@/locales/reinsurance/en.json';
import reinsuranceRu from '@/locales/reinsurance/ru.json';
import reinsuranceUz from '@/locales/reinsurance/uz.json';
import healthEn from '@/locales/health/en.json';
import healthRu from '@/locales/health/ru.json';
import healthUz from '@/locales/health/uz.json';
import type { Lang, TestContent, Version } from '@/types';

const tests: Record<Version, Record<Lang, TestContent>> = {
  reinsurance: {
    en: reinsuranceEn as TestContent,
    ru: reinsuranceRu as TestContent,
    uz: reinsuranceUz as TestContent,
  },
  health: {
    en: healthEn as TestContent,
    ru: healthRu as TestContent,
    uz: healthUz as TestContent,
  },
};

export function getTest(version: Version, lang: Lang): TestContent {
  return tests[version][lang];
}

// Build a lookup of correct answers and rubrics indexed by question id, for a given version.
// Same content across all three languages of a version, so we use EN as the canonical source.
export function getAnswerKey(
  version: Version
): Record<
  string,
  { correct?: string[]; rubric?: string; type: string; points: number }
> {
  const key: Record<string, { correct?: string[]; rubric?: string; type: string; points: number }> = {};
  const source = tests[version].en;
  for (const q of source.questions) {
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

// Test versions presented to the candidate on the landing page.
// `label` is shown in the dropdown; `description` is shown below as helper text.
// These strings are intentionally English-only — they describe the role/track,
// not the test content (which is fully localized per version).
export const VERSIONS: { value: Version; label: string; description: string }[] = [
  {
    value: 'reinsurance',
    label: 'Reinsurance (Trainee)',
    description: 'Standard reinsurance underwriting test (16 questions).',
  },
  {
    value: 'health',
    label: 'Health (Assistant Manager)',
    description: 'Health insurance / ДМС underwriting test (16 questions).',
  },
];

export const TEST_DURATION_MINUTES = 90;

export function shuffleQuestionOrder(questions: { id: string; part: string }[]): string[] {
  // Randomize WITHIN each part to keep section structure intact.
  // Candidates still see Part I first, then II, III, IV, but question order
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
