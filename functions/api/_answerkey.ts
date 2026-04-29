// Answer key for server-side grading.
// MUST be kept in sync with src/locales/en.json (canonical source).
// If you change a question's correct answer or rubric in en.json,
// update it here too. (Could be auto-generated in a build step if desired.)

export interface AnswerKeyEntry {
  type: 'mcq_single' | 'mcq_multi' | 'open';
  points: number;
  correct?: string[];
  rubric?: string;
  questionText?: string; // included so AI grader has full context
}

export const ANSWER_KEY: Record<string, AnswerKeyEntry> = {
  q1:  { type: 'mcq_single', points: 6, correct: ['B'] },
  q2:  { type: 'mcq_single', points: 6, correct: ['C'] },
  q3:  { type: 'mcq_single', points: 6, correct: ['B'] },
  q4:  { type: 'mcq_single', points: 6, correct: ['B'] },
  q5:  { type: 'mcq_single', points: 6, correct: ['C'] },
  q6:  { type: 'mcq_single', points: 6, correct: ['B'] },
  q7:  { type: 'mcq_multi',  points: 6, correct: ['A', 'C'] },
  q8:  { type: 'mcq_single', points: 6, correct: ['B'] },
  q9:  { type: 'mcq_single', points: 6, correct: ['C'] },
  q10: { type: 'mcq_single', points: 6, correct: ['B'] },
  q11: { type: 'mcq_single', points: 6, correct: ['B'] },
  q12: { type: 'mcq_single', points: 6, correct: ['B'] },
  q13: { type: 'mcq_single', points: 6, correct: ['C'] },

  q14: {
    type: 'open', points: 9,
    questionText: 'CASE A — PROPERTY (MENA). Textile mill in Alexandria, Egypt. TSI = USD 120M, EML = 40% of TSI. (a) Calculate EML in USD. (b) Insurer max line = USD 1M; cedent places 70% on fac market — what % share of that 70% placement to fully use the line? Hint: line ÷ (70% of TSI) × 100. (c) Beyond the slip, name TWO additional info requests with brief justification (loss history, fire protection, separation, BI methodology, surveyor reports, neighboring exposures).',
    rubric: 'Full marks (9 pts). (a) EML = 40% × $120M = $48,000,000 (3 pts; 1 pt for correct method even if arithmetic wrong). (b) Line / (70% of TSI) = 1,000,000 / 84,000,000 ≈ 1.19%. Award full 3 pts. Also accept 1M/(70%×EML) = 1M/33.6M ≈ 2.98% if reasoning shown. 1 pt for correct setup with arithmetic error. (c) Acceptable: COPE info, 5-10 yr loss history, fire protection (sprinklers/hydrants/distance to brigade), separation between buildings, BI methodology and indemnity period, surveyor report, cedent retentions/treaties, neighbouring exposures, BCP, EML methodology. TWO sensible items with brief justification = 3 pts (1.5 each).',
  },
  q15: {
    type: 'open', points: 9,
    questionText: 'CASE B — CONSTRUCTION (SE Asia). Vietnam 450 MW gas power plant CAR+EAR, 28 months, $480M. 8km from coast, typhoon zone. Identify THREE specific underwriting concerns with mitigants (sub-limit, deductible, exclusion, warranty, premium loading). Use any THREE of: natural perils (typhoon, surge, flood), T&C of gas turbine, heavy lifts, hot work, subcontractor quality.',
    rubric: 'Full marks (9 pts; 3 per concern). Each concern must be (1) specific to this risk and (2) paired with one mitigant type. Acceptable: (1) Typhoon/windstorm at 8km coast → CAT sub-limit + windstorm % deductible + cyclone-preparedness warranty; (2) Storm surge / flood given coastal proximity → flood sub-limit, separate flood deductible; (3) T&C of gas turbine → T&C sub-limit, higher T&C deductible, LEG2/LEG3 defects clause; (4) Heavy lifts → lifting warranty, transit-to-site sub-limit, named perils for heavy lift; (5) Hot work → hot work warranty; (6) Subcontractor quality / Vietnamese local construction standards → surveyor warranty, PM qualifications. Reject vague answers like "weather" or "workers". Each concern without a specific mitigant loses ~half its marks.',
  },
  q18: {
    type: 'open', points: 4,
    questionText: 'In 1-2 sentences each: (a) PML vs EML; (b) facultative vs treaty reinsurance; (c) coinsurance clause vs average clause.',
    rubric: 'Full marks (4 pts). (a) PML = largest loss reasonably expected with safeguards working; EML = more conservative figure assuming some safeguards fail. PML ≤ EML in most usage (1.5 pts). (b) Facultative = risk-by-risk individually negotiated; treaty = automatic, all risks within agreed parameters under one contract (1.5 pts). (c) Coinsurance (US) and average clause (UK/CIS) similar in effect: when underinsured, claim payment reduced proportionally to ratio insured-value / actual-value (1 pt).',
  },
};
