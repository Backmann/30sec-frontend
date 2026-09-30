# 30sec

A platform for intellectual quiz tournaments, built around one idea that
automated quiz apps cannot do: **a human judges the answers.** Players type
what they mean, in their own words, and a host decides whether that counts.

Production: [30sec.org](https://30sec.org) · Closed beta

*Читать по-русски: [README.ru.md](README.ru.md)*

| Repository | Role |
|---|---|
| [`30sec`](https://github.com/Backmann/30sec) | API, game engine, database, realtime, infrastructure |
| [`30sec-frontend`](https://github.com/Backmann/30sec-frontend) | Web client |

---

## How a tournament works

A tournament is a live match of **23 questions**, run by a host in real
time. Every player plays against "the system" rather than against each
other, so any number of players can share one match.

**Scoring.** Each question awards exactly one point: to the player if the
judge accepts their answer, to the system if it is rejected. No answer
counts as a rejection — the server writes an empty answer with reason code
`NO_ANSWER` when the timer expires. There are no draws on a question.

**Winning.** The match runs to **12 points**. First to 12 wins or loses
accordingly; if all 23 questions are used, the higher score wins and an
exact tie ends as `FINISHED`. Because 23 questions and a threshold of 12
make 11:11 the last possible state, a **decisive question** is not a
special entity — it is what the score looks like when everything rides on
the final answer. Both the player's screen and the host console raise a
banner when it happens.

**Question phases**, driven from absolute deadlines on the server:

| Phase | Duration | What happens |
|---|---|---|
| `reading` | 20 s | The question is shown. Answers are not accepted yet. The host can add 10 s while this phase runs. |
| `answering` | 30 s | One answer per player, up to 50 characters, Enter submits. |
| `judging` | — | Answers are locked, non-responders auto-rejected, the host rules on each answer. |

**Judging and the synchronised reveal.** The host sees each answer the
moment it arrives and rules accept or reject, with an optional reason code;
any ruling can be undone. Players see none of this while it happens. A
player who submits gets a private acknowledgement on their own sockets
only; everyone else sees just a dot next to that player's avatar. All
rulings are buffered server-side and released **together**, in a single
`judgements_revealed` event carrying the correct answer, once every active
player has been judged or the timer runs out. Nobody learns the answer
early, and nobody learns it late.

**Spectators** watch the same match and may type their own answers for
themselves. Those are stored separately (`SpectatorAnswer`), never scored,
and never affect the match.

---

## What you can do

### As a player

- Register with e-mail and password, or sign in with Google; verify your
  address with a 6-digit code
- Apply for an upcoming tournament and see your application move through
  pending → approved
- Enter the lobby 5 minutes before the start and watch the countdown
- Play the match: read the question with its images, answer, then see the
  verdict, the correct answer and the answer images at the reveal
- Resume mid-match after a reload or a lost connection — the server hands
  back the current question, your own answer, its verdict, the phase and
  the score
- Join the **queue** for a future tournament, stating preferred language,
  days, time slot and themes, and see how many people are queued for the
  same language
- Vote for the best question of a tournament, for 48 hours after it ends —
  one vote, changeable and revocable
- Track yourself: a year-long activity heatmap, weekly accuracy, answer and
  tournament history, ranks and achievements
- Browse global and accuracy leaderboards, and other players' public
  profiles
- Control what a public profile shows — real name, city, country, age
- Export everything held about you as JSON, or delete the account

### As a spectator

- `/watch/:id` — follow a live match, type answers for yourself, react to
  questions (👍 🤔 🔥 😮), and see the correct answer for 7 seconds at the
  reveal, in step with the players
- `/live/:id` — a spoiler-free broadcast layout for OBS or a projector: a
  200 px timer, no answer text during reading, a QR code pointing viewers to
  the interactive page, and a winner screen with fireworks.
  `?mode=projector` enlarges everything for a hall

### As a host or administrator

- Dashboard: what needs attention right now — applications awaiting a
  decision, tournaments short of 23 questions, live matches, recent activity
- Question library: three languages per question, up to 10 question images
  and 10 answer images, full-text search, played / in-upcoming / free
  badges, drag-and-drop ordering inside a tournament, auto-fill from the
  free pool, and an archive showing how each question performed when it was
  played
- Translation coverage: a per-language health view showing what exists,
  what is free, how many tournaments that allows, and which translations
  are missing
- Run a match from `/admin/live/:id` — launch questions, extend reading by
  10 s, judge with ✓/✗ (or keys `1` and `2`), undo a ruling, advance with
  `Space`, go fullscreen with `F`, with generated sound cues for the last
  five seconds, each incoming answer and a victory
- Copy the OBS link and the spectator link to the clipboard in one click
- After the match: a summary with the winner, whether it was decided at
  11:11, per-question results, and the best-question vote
- Players registry with search, activity filters and per-player detail —
  sessions, devices, locations, tournament history
- Tournament queue, feedback inbox and a system health panel

---

## Architecture

```
                        Cloudflare
                            │
                         nginx
                            │
            ┌───────────────┴───────────────┐
            │                               │
      Next.js 14                        NestJS 10
     (web client)                          API
            │                               │
            └────── Socket.IO ──────────────┤
                                            │
                              ┌─────────────┼─────────────┐
                              │             │             │
                        PostgreSQL 16    Redis 7    Cloudflare R2
                          (Prisma 6)   state+queues    (images)
```

**Backend** — NestJS 10, TypeScript 5.7, Prisma 6, PostgreSQL 16, Redis 7,
BullMQ, Socket.IO, argon2, nodemailer, Sentry.
**Frontend** — Next.js 14 (App Router, standalone output), React 18,
TypeScript 5.7, Tailwind 3, Zustand, socket.io-client 4, @dnd-kit.
**Infrastructure** — Docker Compose, nginx as reverse proxy, Cloudflare in
front of the origin, Cloudflare R2 for image storage.

Roughly: 26 database models, 19 controllers, ~95 HTTP endpoints, a
WebSocket gateway with 16 client-facing events, 18 pages and 21 components
on the client.

**Realtime rooms.** `dashboard` for everyone, `tournament:<id>` for players
and spectators, `admin:<id>` for hosts and judges. Answer text goes only to
the admin room; the public room gets `{ userId, answered: true }` and
nothing more.

**Images** are uploaded straight from the browser to R2 through a presigned
PUT valid for 5 minutes, after being resized in-browser to 1200 px at JPEG
q85. Only JPEG, PNG and WebP, max 5 MB. Avatars are centre-cropped to
400×400.

**Background jobs** run on two BullMQ queues: `email` (verification codes
and notifications, 3 attempts with exponential backoff) and `reminder`
(a notification 15 minutes before a tournament starts, with a deterministic
job id so rescheduling a tournament reschedules the reminder).

---

## Security and privacy

**Passwords** use argon2. Accounts created through Google have no password
hash at all and are told to use Google rather than being given a vague
failure.

**Tokens.** Access tokens live 15 minutes, refresh tokens 30 days. Every
user row carries a `tokenVersion` which travels in the JWT as `tv` and is
checked on refresh. Logout, password reset and account deletion each
increment it, which invalidates every refresh token issued earlier — the
reason being that without it, a stolen refresh token stayed valid for a
month even after the owner changed their password.

**Verification codes** are 6 digits, held in Redis for 15 minutes, with a
5-attempt limit after which the code is burned and a new one must be
requested. Password recovery answers identically whether or not the address
exists, so the endpoint cannot be used to enumerate accounts.

**Rate limiting** is 60 requests per minute globally, tightened per
endpoint — registration 3 per 5 minutes, login 5 per minute, code resend
3 per 5 minutes. Crucially, the limiter is keyed on the real client IP; see
the engineering notes below for why that is not as simple as it sounds.

**Roles** are `USER`, `JUDGE`, `ADMIN`, `SUPERADMIN`, checked by a guard on
controllers and re-checked inside services that return sensitive data. What
a request may see is decided per role: correct answers are stripped from
every response a non-admin receives.

**GDPR.** Consent to terms and privacy is mandatory at registration and
stored with timestamps. Data export produces a JSON file with the password
hash removed. Deletion anonymises rather than destroys: the profile is
wiped, sessions and notifications are deleted, feedback loses its e-mail
and IP, and `tokenVersion` is bumped — while match results and judgements
survive, because they belong to other players' histories too.

**Validation** is global and strict: unknown fields are rejected outright
rather than ignored.

---

## Engineering notes

The parts where behaviour is not obvious. Most of them are the trace of a
real failure.

**The rate limiter deliberately ignores `X-Forwarded-For` and
`CF-Connecting-IP`.** nginx *appends* to `X-Forwarded-For`, so a client can
prepend a value of its own and rotate it. `CF-Connecting-IP` can be forged
by connecting to the origin directly, bypassing Cloudflare. And plain
`req.ip`, without `trust proxy`, returns the nginx container's address for
every request — which meant five failed logins by one person locked out the
entire site. The only trustworthy source is `X-Real-IP`, which nginx sets
itself from `$remote_addr`.

**Live game state survives a restart.** Phase timers are in-process
`setTimeout` closures, but the question state is mirrored into Redis
(`game:state:<id>`, 6 h TTL) with **absolute deadlines** rather than
"seconds remaining". On boot the module restores active tournaments and
re-arms the timers — or closes the question immediately if both deadlines
have already passed. The same absolute-deadline approach is what lets a
client join mid-phase and get the correct remaining time.

**Player statistics are derived, not accumulated.** Every counted answer
has a judgement — including the automatic rejections — so the whole stats
row can be rebuilt from the judgements table. Incremental counters had
drifted, and deleting a tournament removed answers and judgements while
leaving the totals behind. A mismatch is now fixed by recomputing, not by
editing numbers.

**Question reordering shifts by a safe offset.** The database enforces
unique `[tournamentId, orderIndex]`, so a naive swap violates the
constraint mid-update. Reordering runs in two passes through an offset of
10000.

**Schema changes go through raw SQL only.** `prisma migrate reset` would
destroy production data here. Structural changes are applied by hand and
`schema.prisma` is brought in line separately.

**Files on disk are not files in the container.** After editing sources you
need `docker compose build`, or the image still runs the previous version.
This is especially treacherous for `prisma/seed.ts`: running the seed
without rebuilding executes the old code, and the seed upserts reference
tables — an outdated copy once overwrote every rank threshold in
production.

**Recreating the API container requires an nginx reload.** Docker gives the
new container a different internal address while nginx keeps the old one in
its resolver cache, answering `502 connect() failed (111: Connection
refused)`. Fix: `docker exec 30sec-nginx nginx -s reload`.

**The API writes no HTTP request log.** An absence of entries in the API
logs does not prove a request never arrived. Requests are visible in the
nginx logs.

**Literal routes must precede `@Get(':id')`.** Otherwise `free-count` is
parsed as an id. Noted in the controllers where it bit.

**Test questions carry `theme: 'TEST'`** and status `DRAFT`, so a
tournament can be filled for mechanics testing without polluting the
authored library.

**There are no default passwords in this code.** The repository is public,
so any placeholder literal would be a publicly known credential.
`docker-compose.yml` demands `POSTGRES_PASSWORD` and `REDIS_PASSWORD` via
`${VAR:?...}`, and the seed refuses to create an administrator without an
`ADMIN_PASSWORD` of at least 12 characters. Failing loudly beats starting
quietly with a password anyone can read here.

**PostgreSQL and Redis bind to `127.0.0.1`.** Only 80 and 443 are exposed.
Secrets live solely in `.env` on the server (`chmod 600`) — not in git, and
not in git history. The `GOOGLE_CLIENT_ID` in the frontend is hardcoded on
purpose: in OAuth it is a public identifier, not a secret.

---

## Status and known gaps

The project runs but is not open yet: it is deliberately kept out of search
engines while the logic and the security work are finished. Development is
heading towards solo quiz games between tournaments, and later
on-location quests.

Being honest about what is defined but not yet wired up, so nobody reads
this as a promise:

- **Achievements** — 21 are defined across 9 categories and displayed with
  locked/unlocked state, but only three are currently granted (first
  question authored, ten authored, first vote). The remaining hooks are
  written and not yet called.
- **Seasonal finals counters** appear on the profile and are never written.
- **Turnstile (CAPTCHA)** is implemented as a guard but not applied to any
  endpoint.
- **AI answer assistance** exists as a data model; the host console's
  "AI: match" hint is plain normalised string comparison on the client, not
  a model.
- **No scheduler.** Delayed work is BullMQ only; queue entries carry a
  30-day TTL that nothing currently enforces.
- **No automated tests** in either repository, and no OpenAPI/Swagger UI
  despite the dependency being present.
- **Push notifications** exist in the channel enum only. Delivery is in-app
  and e-mail.
- Client pages are all client-rendered, so public pages are empty to
  crawlers; SEO metadata beyond title and description is not set up yet.

---

## This repository: the web client

Next.js 14 on the App Router, `output: 'standalone'`, served on port 3001.
The Docker environment and nginx live in the
[`30sec`](https://github.com/Backmann/30sec) repository — this container is
started from there.

### Pages

| Route | What it is |
|---|---|
| `/` | Landing page with a language switcher and a "how it works" walkthrough |
| `/auth/login` · `/auth/register` | Password and Google sign-in; registration with consent checkboxes |
| `/auth/verify-email` | Six separate digit boxes with auto-advance, paste handling and auto-submit; 60-second resend cooldown |
| `/auth/forgot-password` | Two-step recovery: request a code, then set a new password |
| `/dashboard` | Upcoming tournaments with countdowns, live matches, last week's finished ones, queue widget, notifications |
| `/game/[id]` | Playing a match: lobby, question, answer, reveal, final score, tournament standings |
| `/watch/[id]` | Interactive spectator view: personal answers, reactions, the correct answer for 7 s at the reveal |
| `/live/[id]` | Spoiler-free broadcast for OBS or a projector; `?mode=projector` enlarges everything, `?qr=0` hides the QR code |
| `/vote/[id]` | Best-question voting, questions in match order, live tallies |
| `/leaderboard` | Top players, accuracy ranking, rank ladder |
| `/player/[nickname]` | Public profile with statistics, heatmap, weekly accuracy, achievements |
| `/profile` | Five tabs: statistics, achievements, answers, tournaments, settings |
| `/admin` | Nine sections: dashboard, tournaments, questions, library coverage, players, queue, feedback, health, audit log |
| `/admin/live/[id]` | The host console — see below |
| `/privacy` · `/terms` · `/contact` | Legal pages, full text in three languages |

### The host console

`/admin/live/[id]` is built to be driven during a live match without
looking at the mouse:

- `Space` launches the next question, `1` accepts and `2` rejects the first
  unjudged answer, `F` toggles fullscreen
- a 120 px timer and the current phase, with the question text and the
  correct answer alongside
- each answer appears as it arrives, with a normalised string-match hint
- one-click copying of the OBS link and the spectator link
- generated sound cues (Web Audio, no audio files): a tick on each of the
  last five seconds, a ding per incoming answer, a fanfare on a win
- after the match, a summary dashboard with the winner, per-question
  results and the best-question vote

### Realtime

The socket wrapper is `src/hooks/useSocket.ts`. It joins
`tournament:<id>`, plus `admin:<id>` for hosts, and handles 16 events —
among them `question_started`, `phase_changed`, `timer_tick`,
`answer_status`, `judgements_revealed`, `score_updated`, `match_finished`
and `game_state_restore`.

State is restored three ways, which matters because a reload in the middle
of a 30-second answer window must not cost the player their answer: the
server pushes `game_state_restore`, the page also pulls an HTTP snapshot,
and a guard on the restored question id stops a racing socket event from
wiping what was just restored. HTTP polling runs alongside the socket as a
safety net.

A connection dot in the header shows green when the socket is live and a
pulsing red when it is not.

### Internationalisation

Three interface languages — Russian, German, English — without an i18n
library. There is a shared dictionary in `src/lib/i18n.ts` and per-page
dictionaries alongside the components that use them. The language is chosen
from `localStorage`, falling back to the browser's language and then to
Russian.

`HtmlLangSync` exists because `layout.tsx` is a server component and cannot
know the visitor's choice: it corrects `document.documentElement.lang`
after hydration and listens for `storage` events so a change in another tab
is picked up. A correct `lang` matters for screen readers, browser
translation prompts and search engines.

Coverage is not complete: the admin pages and the broadcast view are
Russian-only.

### State and the API client

Auth state lives in a single Zustand store (`src/lib/store.ts`); everything
else is local page state. `src/lib/api.ts` is one client class with around
90 methods and holds the two behaviours worth knowing:

**Refresh is deduplicated.** A single shared promise means several
concurrent 401s trigger one refresh rather than a race — without it, the
server issued a new refresh token per call and slow responses overwrote
fresh tokens with stale ones, which with token versioning could drop the
whole session.

**Logout clears tokens synchronously**, before the server call, because
callers do not await it. Clearing only the access token used to leave the
refresh token valid for its full lifetime, so anyone holding a copy could
carry on.

Tokens are kept in `localStorage`. Images are validated and resized in the
browser before being uploaded straight to R2 through a presigned URL.

### Components

21 components in `src/components/`. The ones carrying real logic:
`TournamentCardCTA` (a state matrix that always renders exactly one
button), `ReorderableQuestions` (drag-and-drop with played questions
locked, optimistic save with rollback), `ActivityHeatmap`, `WeeklyChart`,
`AchievementsGrid`, `ImageUploader` and `AvatarUploader` (client-side
resize and presigned upload), `ImageLightbox` (keyboard navigation),
`LiveBanner` (hidden on the broadcast routes so it cannot appear on air),
`NotificationBell`, `QueueJoinWidget`, `CookieBanner`, `ErrorBoundary`.

### Design

Dark theme only, blue and amber accents on a near-black background.
Mobile-first with hamburger navigation on the dashboard and the admin area;
the broadcast view scales up instead of down. Animations are CSS
keyframes — phase reveals, answer slide-ins, a celebratory bounce on a
correct answer, fireworks on the projector's winner screen.

### Running locally

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL
npm run dev
```

Both variables are compiled into the client bundle and are public by
design — no secrets belong there. A running API is required; see the
[`30sec`](https://github.com/Backmann/30sec) repository.
