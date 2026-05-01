# MIG Trainee Assessment

A web-based insurance underwriting test for trainees at Mosaic Insurance Group.

- **Frontend**: React + TypeScript + Vite + Tailwind, deployed on Cloudflare Pages
- **Database**: Supabase (Postgres + Auth)
- **AI grading**: Claude API (Anthropic) via Cloudflare Pages Functions
- **3 languages**: English, Russian, Uzbek (Latin)

## What it does

- Candidates open the link, choose a language (EN/RU/UZ), enter name + email, take the test (90 min, 18 questions, 100 pts).
- MCQs (Q1–Q13) are auto-scored deterministically.
- Open-ended questions (Q14–Q18, the cases) are auto-graded by Claude against your internal rubric.
- One attempt per email — re-attempts are blocked.
- Question order is randomized within each part.
- Admin signs in at `/admin/login`, sees all attempts, can adjust scores and add comments per question, and prints/PDFs an assessment report.

## Project structure

```
.
├── src/                   # React frontend
│   ├── pages/             # LandingPage, TestPage, SubmittedPage, Admin pages
│   ├── components/        # BrandHeader, RequireAdmin, QuestionRenderer
│   ├── locales/           # en.json, ru.json, uz.json — test content + rubrics
│   ├── lib/               # supabase client, scoring, test-content loader
│   └── types/             # shared TypeScript types
├── functions/api/         # Cloudflare Pages Functions (server-side)
│   ├── start-attempt.ts   # creates attempt, blocks duplicates
│   ├── submit-attempt.ts  # auto-grades MCQs + AI-grades open questions
│   ├── _answerkey.ts      # answer key + rubrics (sync with en.json)
│   └── _shared.ts         # shared helpers
└── supabase/schema.sql    # database schema with RLS policies
```

---

## Deployment

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the entire contents of `supabase/schema.sql` → run.
3. Go to **Authentication → Users** → click **Add user** → create an admin account (e.g. `mamur@mosaic.uz`) with a password.
4. Copy the user's UUID, then run in SQL Editor:
   ```sql
   insert into admins (user_id, email)
     values ('<paste-user-id-here>', 'mamur@mosaic.uz');
   ```
5. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon public key** (long JWT, safe to expose)
   - **service_role key** (long JWT, **never expose** — Pages Functions only)

### 2. GitHub

```bash
cd mig-assessment
git init
git add .
git commit -m "Initial commit"
gh repo create mig-assessment --private --source=. --push
```

### 3. Cloudflare Pages

1. Go to Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the `mig-assessment` repo.
3. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: (leave blank)
4. **Environment variables** — add all of these (Production):

   Plain (visible) variables:
   ```
   VITE_SUPABASE_URL          = https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY     = <anon key>
   ```

   Secret (encrypted) variables — click "Encrypt" before saving:
   ```
   SUPABASE_URL               = https://YOUR-PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY  = <service role key>
   ANTHROPIC_API_KEY          = sk-ant-...
   ```

5. Click **Save and Deploy**. First build takes ~2 minutes.

### 4. Supabase Auth → redirect URLs

In Supabase **Authentication → URL Configuration**, add your Cloudflare Pages URL (e.g. `https://mig-assessment.pages.dev`) to:
- Site URL
- Additional Redirect URLs

This lets the admin login flow work properly.

---

## Using it

### As a trainer (admin)

1. Visit `https://your-domain.pages.dev/admin/login`.
2. Sign in with the admin account you created.
3. Dashboard shows all attempts, filter by status, search by name/email, export CSV.
4. Click any attempt to review:
   - See candidate's responses for every question.
   - For MCQs: their selection vs the correct answer.
   - For open-ended: their text + Claude's auto-grade and feedback.
   - Adjust points (any 0.5 increment up to the max) and add a comment per question.
   - Click **Print / Save PDF** for a printable report.
   - Click **Finalize grading** to lock the final score and mark the attempt as graded.

### Sharing the test with a candidate

Just send them: `https://your-domain.pages.dev/`

They enter their name and email, choose a language, and start. They have 90 minutes. Their answers autosave. Once submitted, they see a confirmation screen — no score is shown to them.

---

## Editing test content

All questions live in `src/locales/{en,ru,uz}.json`. Each language file has the same 18 question IDs (`q1`–`q18`); IDs must match across languages so randomization works.

If you change a **correct answer or rubric**, you must update **two** files:
1. `src/locales/en.json` (the canonical source)
2. `functions/api/_answerkey.ts` (the server-side grading copy)

The two are kept in sync manually for simplicity. If this becomes a problem you can add a small build script to generate `_answerkey.ts` from `en.json`.

The Q10 (statutory retention %) and Q11 (regulator name) answers should be verified against the current text of the Law of the Republic of Uzbekistan "On Insurance Activity" before the first real test — these were drafted from general knowledge.

---

## Local development

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Note: the `/api/*` Pages Functions don't run under `vite dev`. To test them locally, install Wrangler and run:

```bash
npm install -g wrangler
npm run build
wrangler pages dev dist --compatibility-date=2024-01-01
```

Set the server-side env vars in `.dev.vars` (gitignored):
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
```

---

## Cost estimate

Per fully completed test (1 candidate, all 5 open questions AI-graded with Claude Sonnet):
- ~5 API calls × ~1.5K input tokens + ~400 output tokens each
- ≈ **$0.03–$0.06 per test** at current Sonnet 4.5 pricing

Supabase and Cloudflare Pages free tiers are more than enough for 100s of trainees per month.

---

## Security notes

- The Supabase **anon key** is exposed to the browser by design. RLS policies in `schema.sql` restrict it to:
  - Inserting attempts and answers
  - Updating an attempt by its UUID while in_progress
  - Reading data only via the authenticated admin role
- The **service_role key** and **Anthropic API key** live only on the Cloudflare edge as encrypted environment variables. They are never sent to the browser.
- Attempts are uniquely identified by UUID — that UUID is the candidate's "ticket" to write answers. Knowing someone else's email isn't enough to interfere with their attempt.
