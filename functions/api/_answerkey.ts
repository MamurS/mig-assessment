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
  q1:  { type: 'mcq_single', points: 5, correct: ['B'] },
  q2:  { type: 'mcq_single', points: 5, correct: ['C'] },
  q3:  { type: 'mcq_single', points: 5, correct: ['B'] },
  q4:  { type: 'mcq_single', points: 5, correct: ['B'] },
  q5:  { type: 'mcq_single', points: 5, correct: ['C'] },
  q6:  { type: 'mcq_single', points: 5, correct: ['B'] },
  q7:  { type: 'mcq_multi',  points: 5, correct: ['A', 'C'] },
  q8:  { type: 'mcq_single', points: 5, correct: ['B'] },
  q9:  { type: 'mcq_single', points: 5, correct: ['C'] },
  q10: { type: 'mcq_single', points: 5, correct: ['B'] },
  q11: { type: 'mcq_single', points: 5, correct: ['B'] },
  q12: { type: 'mcq_single', points: 5, correct: ['B'] },
  q13: { type: 'mcq_single', points: 5, correct: ['C'] },

  q14: {
    type: 'open', points: 9,
    questionText: 'CASE A — PROPERTY (MENA). Textile mill in Alexandria. TSI = USD 120M, EML = 40%, deductible USD 250K, rate 0.22%. Cedent retains 30% net, places 70% facultative. Max line USD 1M (100%). (a) Calculate EML in USD. (b) % share of 70% placement to fully use line. (c) TWO additional info requests beyond slip.',
    rubric: 'Full marks (9 pts). (a) EML = 40% × $120M = $48,000,000 (3 pts). (b) Line $1M as % of $84M (70% of TSI) = ~1.19%; OR if line measured against EML basis (70% × $48M = $33.6M) → 1M/33.6M ≈ 2.98%. Either interpretation correct if math shown (3 pts). (c) Acceptable: COPE info, 5-10 yr loss history, fire protection (sprinklers/hydrants/distance to fire brigade), separation between buildings, BI methodology and indemnity period, surveyor report, cedent retentions/treaties, neighboring exposures, BCP, EML methodology, finished goods storage. TWO sensible items (3 pts; 1.5 each).',
  },
  q15: {
    type: 'open', points: 9,
    questionText: 'CASE B — CONSTRUCTION (SE ASIA). Vietnam 450 MW gas power plant CAR+EAR, 28 months, $480M. 8km from coast, typhoon zone. Cedent wants $500K fac QS share. FOUR specific underwriting concerns + mitigant type (sub-limit/deductible/exclusion/warranty/loading) for each.',
    rubric: 'Full marks (9 pts; ~2.25 each). Acceptable: (1) Typhoon/windstorm at 8km coast → CAT sub-limit + windstorm deductible + cyclone preparedness warranty; (2) Storm surge/flood → flood sub-limit, separate flood deductible; (3) T&C of gas turbine → T&C sub-limit, higher T&C deductible, LEG2/LEG3 clause loading; (4) Maintenance period & defect liability → 12-month limit, DE clause; (5) Hot work/welding → hot work warranty; (6) Heavy lift cranes (turbine, generator) → lifting warranty, heavy lift sub-limit, named perils; (7) USD-EPC currency volatility → premium loading or escalation clause; (8) Subcontractor quality / Vietnam standards → surveyor warranty, PM qualifications. Reject vague answers like "weather" or "workers". Each concern needs specific mitigant type.',
  },
  q16: {
    type: 'open', points: 8,
    questionText: 'CASE C — CARGO. Rotterdam-Houston specialty resin shipment. ICC (A) + War + Strikes. $4.2M conveyance. 22-yr-old vessel, North Atlantic in February. (a) ICC (A) vs ICC (C) coverage. (b) TWO concerns + mitigants.',
    rubric: 'Full marks (8 pts). (a) ICC (A) = all-risks subject to listed exclusions; ICC (C) = named-perils only (fire, sinking/grounding/stranding/capsizing, collision, GA sacrifice, jettison, discharge at port of distress) — much narrower. (4 pts) (b) TWO needed: (i) Vessel age 22yr > 15-yr industry threshold → Class Society confirmation, IUMI Vessel Age Clause loading, or decline; (ii) North Atlantic Feb storm season → seaworthiness check, packaging/lashing, weather routing; (iii) Specialty resins may be temp-sensitive → stowage/temp requirements, inherent vice exclusion; (iv) $4.2M may exceed open cover per-bottom sub-limit → check accumulation. (4 pts; 2 each).',
  },
  q17: {
    type: 'open', points: 6,
    questionText: 'CASE D — PROPERTY (US). Florida 14 commercial buildings, $95M TSI, 60% in two coastal counties. Wind ded 2% per location, AOP $25K. Modeled 1-in-100 hurricane PML = 9% TSI. Premium $380K (100%). (i) Decline / (ii) accept w/ conditions / (iii) accept as offered? THREE specific reasons with figures.',
    rubric: 'Full marks (6 pts). Defensible: DECLINE or ACCEPT WITH CONDITIONS. Strong observations: (1) Premium $380K = 0.40% rate on TSI; PML = $8.55M (9% × $95M); rate-on-PML ~4.4% — borderline thin for cat-exposed FL wind; (2) 60% concentration in two coastal counties = severe accumulation, not diversified; (3) Wind ded 2% per LOCATION (not aggregated) — partial but layered exposure; (4) FL = hurricane belt; PML model assumptions need verification (RMS/AIR? vintage? demand surge?); (5) Per-risk and CAT limit — does cedent have CAT XL?; (6) AOP $25K low for commercial. THREE reasons with figures = 6 pts; vague without numbers = max 3. "Accept as offered" should lose ≥2 pts unless heavily justified.',
  },
  q18: {
    type: 'open', points: 3,
    questionText: 'In 1-2 sentences each: (a) PML vs EML; (b) facultative vs treaty; (c) coinsurance vs average clause.',
    rubric: 'Full marks (3 pts; 1 per pair). (a) PML = largest loss reasonably expected with safeguards working; EML = conservative figure assuming some safeguards fail. PML ≤ EML in most usage. (b) Facultative = risk-by-risk individually negotiated; treaty = automatic, all risks within agreed parameters under one contract. (c) Coinsurance (US) and average clause (UK/CIS) very similar in effect: when underinsured, claim payment reduced proportionally to ratio of insured value to actual value.',
  },
};
