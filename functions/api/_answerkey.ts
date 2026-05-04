// Answer key for server-side grading.
// MUST be kept in sync with src/locales/<version>/en.json (canonical source per version).
// If you change a question's correct answer or rubric in EN locale, update it here too.

export type Version = 'reinsurance' | 'health';

export interface AnswerKeyEntry {
  type: 'mcq_single' | 'mcq_multi' | 'open';
  points: number;
  correct?: string[];
  rubric?: string;
  questionText?: string; // included so AI grader has full context
}

// ---------------------------------------------------------------------------
// REINSURANCE — 16 questions, 100 pts (current/legacy test, unchanged)
// Mirrors the prior single-test answer key verbatim.
// ---------------------------------------------------------------------------
const REINSURANCE_KEY: Record<string, AnswerKeyEntry> = {
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

// ---------------------------------------------------------------------------
// HEALTH — 16 questions, 100 pts.
// Part I (q1-q3) shared verbatim with reinsurance — logical reasoning.
// Part II + III + IV are health-specific (qh1-qh13).
// ---------------------------------------------------------------------------
const HEALTH_KEY: Record<string, AnswerKeyEntry> = {
  // Part I — shared logical reasoning (verbatim copy of reinsurance q1-q3)
  q1: { type: 'mcq_single', points: 6, correct: ['B'] },
  q2: { type: 'mcq_single', points: 6, correct: ['C'] },
  q3: { type: 'mcq_single', points: 6, correct: ['B'] },

  // Part II — Health Insurance Principles (39 pts)
  qh1: { type: 'mcq_single', points: 7, correct: ['C'] },
  qh2: { type: 'mcq_single', points: 6, correct: ['B'] },
  qh3: { type: 'mcq_single', points: 6, correct: ['C'] },
  qh4: { type: 'mcq_single', points: 7, correct: ['C'] },
  qh5: { type: 'mcq_single', points: 7, correct: ['D'] },
  qh6: { type: 'mcq_single', points: 6, correct: ['B'] },

  // Part III — Uzbekistan Market & Legislation (27 pts)
  qh7:  { type: 'mcq_single', points: 7, correct: ['B'] },
  qh8:  { type: 'mcq_single', points: 6, correct: ['B'] },
  qh9:  { type: 'mcq_single', points: 7, correct: ['B'] },
  qh10: { type: 'mcq_single', points: 7, correct: ['B'] },

  // Part IV — Health Insurance Underwriting Cases (16 pts)
  qh11: {
    type: 'open', points: 6,
    questionText: 'CASE A: Underwriting a corporate programme. "AlmazStroy" LLC (a construction company, 240 employees) has applied for a corporate voluntary health insurance policy. From the application: Age composition 38% are aged 40+, average age 42; 55% of employees are construction site workers (welders, fitters, general labourers); 45% are administrative staff (Tashkent office); the company changed insurers twice last year; requested programme: "Premium" (including dental and planned hospitalisation); per-insured limit: 50 million UZS. (a) Name THREE specific risk factors that increase the expected loss ratio of this group, and justify each. (3 points) (b) Suggest TWO structural measures (deductible, co-payment, exclusion, sub-limit, splitting the programme by employee category, etc.) you would recommend implementing, and explain how each measure affects loss ratio. (3 points)',
    rubric: 'Full marks (6 pts). (a) [3 pts] Acceptable factors include: (1) high share of construction-site workers — elevated injury risk (welders, fitters, work at height, with welding equipment); (2) average age 42 and 38% aged 40+ — higher chronic disease prevalence (cardiovascular, musculoskeletal); (3) two insurer changes in one year — sign of anti-selection / accumulated unsettled claims / dissatisfaction; (4) "Premium" programme with dental and planned hospitalisation — high frequency + high average cost; (5) 50M UZS limit — high catastrophic exposure. THREE specific factors with justification = 3 pts (1 per factor). Without justification — 0.5 per factor. (b) [3 pts] Acceptable: (1) splitting the programme by category — site workers on a programme without dental or with reduced dental sub-limit; (2) 10–20% co-payment on planned services; (3) deductible on planned hospitalisation; (4) exclusion or sub-limit on pre-existing conditions; (5) 2–3 month waiting period on planned hospitalisation and dental. TWO specific measures with explanation of mechanism = 3 pts (1.5 each). Without explaining the mechanism — 0.5 per measure. Vague answers ("raise the rate") — 0 pts.',
  },
  qh12: {
    type: 'open', points: 6,
    questionText: 'CASE B: Claims handling. An insured under a corporate voluntary health insurance policy approached a partner clinic complaining of back pain. The clinic performed an MRI and proposed surgery (L4-L5 disc herniation) costing 28M UZS. The policyholder applied to the insurer for confirmation of whether this case is covered. Claims review found: patient did not declare back issues at intake 3 years ago; outpatient records show consultations for back pain BEFORE the contract was signed; contract signed 4 months ago; standard pre-existing conditions exclusion clause exists. (a) What decision should the claims department make and on what legal/contractual basis? (3 pts) (b) Which TWO documents/actions must the insurer prepare to make the decision legally defensible if appealed? (3 pts)',
    rubric: 'Full marks (6 pts). (a) [3 pts] Correct answer: DECLINE the payment (or qualify the case as non-insurable) on the basis of the pre-existing conditions exclusion clause, since outpatient records show consultations for back pain BEFORE the contract\'s effective date. Legal basis — articles of the Civil Code of Uzbekistan on insurance (freedom of contract, binding nature of contractual conditions) + the specific clause of the contract. Full 3 pts for: (1) stating decision "decline"/"non-insurable", (2) referencing the contract\'s pre-existing exclusion clause, (3) referencing the legal basis (contract/Civil Code). 2 pts if 2 of 3 elements. 1 pt if only "decline" without justification. (b) [3 pts] Acceptable: (1) written motivated denial letter to insured and policyholder, citing the specific contract clause and attaching supporting medical documents; (2) copy of the outpatient medical record showing consultations BEFORE the contract date; (3) report/opinion of the insurer\'s medical expert on causation; (4) internal incident investigation report; (5) notification of the employer-policyholder of the decision. TWO specific documents/actions = 3 pts (1.5 each). Vague answers ("prepare a denial") without specifying HOW — 1 pt.',
  },
  qh13: {
    type: 'open', points: 4,
    questionText: 'CASE C: Loss ratio calculation and rate recommendation. A corporate client is in their second year of insurance. First-year data: net premium paid by policyholder 480M UZS; medical claims paid by insurer 612M UZS; acquisition/operating expenses 12% of premium. (a) Calculate the loss ratio and combined ratio for the first year. Show your calculation. (2 pts) (b) Based on the result, give a justified rate recommendation for year two — a specific percentage increase AND at least TWO additional measures you would propose beyond the rate increase. (2 pts)',
    rubric: 'Full marks (4 pts). (a) [2 pts] Loss ratio = claims / premium = 612 / 480 = 127.5%. Combined ratio = loss ratio + expense ratio = 127.5% + 12% = 139.5%. Full 2 pts for both metrics with calculation shown. 1 pt if only one metric correct or correct method with arithmetic error. 0 pts if calculation not shown or both metrics wrong. (b) [2 pts] Justified recommendation: rate increase of approximately 40–50% (range 30–60% with justification accepted). Additional measures (at least 2 of): (1) introducing/raising deductible or co-payment; (2) revising the partner-clinic list to less expensive ones; (3) excluding the most expensive services (e.g. planned dental); (4) waiting period for planned procedures; (5) sub-limits on specific services (e.g. MRI, CT); (6) claims audit; (7) analysis for anti-selection. Full 2 pts for specific percentage AND 2 specific measures. 1 pt if only rate increase OR only measures. 0 pts if neither.',
  },
};

// ---------------------------------------------------------------------------
// Combined export — keyed by version, then by question id.
// ---------------------------------------------------------------------------
export const ANSWER_KEY: Record<Version, Record<string, AnswerKeyEntry>> = {
  reinsurance: REINSURANCE_KEY,
  health: HEALTH_KEY,
};

export function getAnswerKey(version: Version): Record<string, AnswerKeyEntry> {
  return ANSWER_KEY[version] ?? ANSWER_KEY.reinsurance;
}
