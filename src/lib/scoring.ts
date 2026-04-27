// MCQ scoring — runs server-side in the grade Pages Function, but
// kept in shared lib so it's testable.

export function scoreMCQ(
  type: 'mcq_single' | 'mcq_multi',
  correct: string[],
  response: string[],
  points: number
): number {
  if (!Array.isArray(response)) return 0;

  const normResp = [...new Set(response.map((s) => s.toUpperCase().trim()))].sort();
  const normCorrect = [...correct.map((s) => s.toUpperCase().trim())].sort();

  if (type === 'mcq_single') {
    // Exact match required
    if (normResp.length !== 1) return 0;
    return normResp[0] === normCorrect[0] ? points : 0;
  }

  // mcq_multi: full credit only if exact set match.
  // (Could be partial credit, but we keep it strict — easier to defend.)
  if (normResp.length !== normCorrect.length) return 0;
  for (let i = 0; i < normResp.length; i++) {
    if (normResp[i] !== normCorrect[i]) return 0;
  }
  return points;
}
