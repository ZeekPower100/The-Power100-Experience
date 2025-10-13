Awesome—thanks for the extra context + the guide. Here’s a clean, AWS-native blueprint that keeps PostgreSQL at the center, fixes the “event-in-real-time” brittleness, and sets you up for a future domain LLM without over-engineering.



---



\# 1) Diagnosis (why it feels unreliable right now)



From your guide, the AI does a lot of on-the-fly stitching: loading large knowledge bundles, conditionally injecting event context, then relying on the model to “do the right thing.” That creates three common failure modes:



1\. \*\*Event truth isn’t singular.\*\* “What’s live now?” is derived in app code, not a single authoritative query, so small drift causes wrong speaker/sponsor picks. 

2\. \*\*Context assembly is monolithic.\*\* One big “knowledge blob” means you can’t unit-test each slice of context (contractor profile vs. live schedule vs. sponsors) independently. 

3\. \*\*Write-backs aren’t gated by state.\*\* Functions like `capture\_event\_note`, `create\_action\_item` run, but the guardrails about \*when\* to run them live mostly in the prompt rather than a typed workflow. 



---



\# 2) Target architecture (AWS + PostgreSQL, thin and testable)



Think of two planes:



\* \*\*Deterministic data plane\*\* (PostgreSQL as source of truth + tiny helpers)

\* \*\*Thin LLM plane\*\* (planner/answerer that only consumes typed, pre-filtered context and calls a few safe actions)



\## 2.1 Deterministic data plane



\### A. PostgreSQL (RDS/Aurora) as the “event brain”



Use \*\*materialized views\*\* (MV) and \*\*LISTEN/NOTIFY\*\* to keep a single truth for “now” and “next”.



\*\*Tables you already have (simplified):\*\*



\* `events`, `event\_speakers`, `event\_sponsors`, `event\_attendees`

\* `contractors`, `strategic\_partners`, `contractor\_action\_items`, etc. 



\*\*Add / harden these:\*\*



```sql

-- Sessions that are happening now

CREATE MATERIALIZED VIEW mv\_sessions\_now AS

SELECT s.\*

FROM event\_speakers s

JOIN events e ON e.id = s.event\_id

WHERE NOW() AT TIME ZONE e.timezone BETWEEN s.session\_start AND s.session\_end;



CREATE INDEX ON mv\_sessions\_now (event\_id);



-- Sessions in the next 60 minutes filtered by attendee's objectives

CREATE MATERIALIZED VIEW mv\_sessions\_next\_60 AS

SELECT s.\*, c.id AS contractor\_id

FROM event\_speakers s

JOIN event\_attendees a ON a.event\_id = s.event\_id

JOIN contractors c ON c.id = a.contractor\_id

WHERE s.session\_start BETWEEN NOW() AND NOW() + INTERVAL '60 minutes';

```



\*\*Keep MVs fresh\*\*



\* Use \[`pg\_cron`] to `REFRESH MATERIALIZED VIEW CONCURRENTLY` every 15–30s for active events.

\* On updates to `event\_speakers`/`event\_attendees`, fire a trigger that `NOTIFY 'event\_refresh', event\_id`.



\*\*Reason this helps:\*\* the LLM never guesses “what’s live”; it reads from `mv\_sessions\_now`/`mv\_sessions\_next\_60`.



\### B. Hybrid retrieval in Postgres (no extra DB required on day 1)



Add \*\*pgvector\*\* + \*\*BM25\*\* (full-text) and do hybrid in one SQL:



```sql

WITH ft AS (

&nbsp; SELECT id, ts\_rank(to\_tsvector('english', doc\_text), plainto\_tsquery($1)) AS bm25

&nbsp; FROM ai\_docs

&nbsp; WHERE event\_id = $2

),

vs AS (

&nbsp; SELECT id, 1 - (embedding <=> $3::vector) AS vscore -- cosine sim

&nbsp; FROM ai\_docs

&nbsp; WHERE event\_id = $2

)

SELECT d.\*

FROM ai\_docs d

JOIN ft USING(id) JOIN vs USING(id)

ORDER BY (0.5 \* bm25 + 0.5 \* vscore) DESC

LIMIT 12;

```



> If you outgrow this, slot in OpenSearch k-NN or Qdrant later; the LLM plane stays unchanged.



\### C. Feature store “lite” (today) → Feast (later)



Right now, create a \*\*`contractor\_features`\*\* table (or view) keyed by `contractor\_id` with denormalized fields you \*always\* need (goal, revenue band, team size, region, tech stack). The context builder reads only this row.



Later, migrate those to \*\*Feast\*\* (offline = S3/Parquet via Glue; online = DynamoDB/ElastiCache). Your code path is identical either way—only the provider changes.



\### D. Queue + scheduler



You already use a Bull/Redis worker for follow-ups. Keep it, or move to \*\*SQS + EventBridge Scheduler\*\* for AWS-native durability. The application API remains the same:



\* `schedule\_followup()` → drops a message with `execute\_at`

\* Worker pulls due jobs and sends SMS via GHL pipeline

&nbsp; (Your four DB-write functions stay; they just publish side-effects more durably.) 



---



\## 2.2 Thin LLM plane (strong boundaries)



Introduce a \*\*Context Assembly Service\*\* that returns small, typed bundles:



```ts

type ConciergeContext = {

&nbsp; contractor: {

&nbsp;   id: number;

&nbsp;   features: Record<string, string | number | boolean>;

&nbsp; };

&nbsp; general: {

&nbsp;   top\_docs: Array<{id: string; title: string; snippet: string; url?: string}>;

&nbsp; };

&nbsp; event?: {

&nbsp;   status: 'pre\_event' | 'during\_event' | 'post\_event' | 'past\_event';

&nbsp;   now\_sessions: Session\[];

&nbsp;   next60\_sessions: Session\[];

&nbsp;   sponsor\_shortlist: Sponsor\[];

&nbsp; };

};

```



\*\*Three steps only:\*\*



1\. \*\*Context builder\*\* queries Postgres views + hybrid search (max N = 12 items per facet).

2\. \*\*Planner\*\* decides \*which tool to use\* (recommend sessions? sponsors? book demo? create action?).

3\. \*\*Answerer\*\* formats the response and \*optionally\* calls 1 of your 4 safe functions. 



> The prompt no longer contains huge raw tables. It only sees `ConciergeContext`, which is consistent and testable.



---



\# 3) “Event mode” made deterministic



\### Single query → single truth



At message time, your controller attaches:



```sql

SELECT \* FROM mv\_sessions\_now WHERE event\_id = $1 AND contractor\_id = $2;

SELECT \* FROM mv\_sessions\_next\_60 WHERE event\_id = $1 AND contractor\_id = $2;

```



Optional business filters (pre-LLM, not in the prompt):



\* `track IN (preferred\_tracks)`

\* `audience IN ('owner','ops','sales')`

\* `sponsor\_tier >= 'gold'`

\* `distance(booth\_location, attendee\_location) < X` (if you track zones)



\### Guardrails in code, not just prompts



\* Only allow `create\_action\_item()` when `event.status IN ('during\_event','post\_event')`.

\* Only allow `capture\_event\_note()` when message is classified “information” (you already do this—enforce with code switch). 



---



\# 4) Beyond events: “Concierge” everyday flow



Create three \*\*capability packs\*\* the LLM can request (each is a small SQL+business rule unit you can unit-test):



1\. \*\*Partner Match Pack\*\*

&nbsp;  Input: `contractor.features`

&nbsp;  Output: `top\_partners\[3..5]` with `why`, case studies, and a `book\_demo` affordance.



2\. \*\*Learning Pack (Books/Podcasts)\*\*

&nbsp;  Input: `goal`, `revenue\_band`, `role`

&nbsp;  Output: shortlist with chapters/timestamps (you already store ai\_\* fields—promote them into first-class rows). 



3\. \*\*Action Plan Pack\*\*

&nbsp;  Input: free-text goal (“break $5M ARR”)

&nbsp;  Output: a 3-step plan + `create\_action\_item()` calls with templated due dates (3/7/30 days) and a default follow-up schedule. 



Each pack is a tiny TypeScript module that runs SQL, applies rules, and returns 3–7 objects. The LLM never rummages through raw tables.



---



\# 5) Concrete SQL \& glue you can drop in



\### A. Rebuild “event context” in SQL



```sql

-- Who should \*this contractor\* see next?

CREATE OR REPLACE VIEW v\_recos\_next\_sessions AS

SELECT s.event\_id,

&nbsp;      a.contractor\_id,

&nbsp;      s.id AS session\_id,

&nbsp;      s.session\_title,

&nbsp;      s.session\_start,

&nbsp;      s.session\_end,

&nbsp;      s.track,

&nbsp;      match\_score(

&nbsp;        contractor\_features(a.contractor\_id),

&nbsp;        session\_tags(s.id)

&nbsp;      ) AS score

FROM event\_speakers s

JOIN event\_attendees a ON a.event\_id = s.event\_id

WHERE s.session\_start BETWEEN NOW() AND NOW() + INTERVAL '60 minutes';



-- Pick top 3 by score

```



(Implement `match\_score()` as a SQL or plpgsql function combining metadata + vector sim on tags.)



\### B. Hybrid RAG in one round-trip



\* Use the CTE shown earlier to combine BM25 + vector.

\* Always filter by `event\_id` (or `industry='home\_improvement'`) \*before\* vector search to keep it tight.



\### C. Fast refresh without Kafka (day 1)



\* `pg\_cron` refreshes MVs every 15–30s during event hours.

\* Add a trigger on `event\_speakers` that `NOTIFY 'event\_refresh'` and let your Node worker call `REFRESH MATERIALIZED VIEW CONCURRENTLY` immediately for that `event\_id` to get sub-10s staleness.



> If you later need true streaming, add \*\*Debezium → MSK (Kafka)\*\* and keep the SQL unchanged.



---



\# 6) Reliability \& evaluation (no regressions)



\* \*\*Golden traces:\*\* Save 20 real user messages from the last event + expected “top-3 sessions”/“top-3 sponsors.”

\* \*\*Automated eval:\*\* For each PR, run the context builder only (no model) and assert the candidate sets match expectations; then run a light RAG eval (Ragas/DeepEval) to ensure answer faithfulness ≥ your threshold.

\* \*\*Health checks:\*\* Every minute, run a canary that ensures `mv\_sessions\_now` isn’t empty during event hours when it should not be.



---



\# 7) Minimal repo layout (copy-paste this)



```

/apps

&nbsp; /api

&nbsp;   /routes/concierge.ts

&nbsp;   /services/context-builder/

&nbsp;     contractor.ts        # SELECT contractor\_features

&nbsp;     general.ts           # hybrid RAG (docs/books/podcasts)

&nbsp;     event.ts             # mv\_sessions\_now/next\_60 + sponsor shortlist

&nbsp;   /services/packs/

&nbsp;     partner-match.ts     # returns 3-5 partners (+ why)

&nbsp;     learning.ts          # books/podcasts with chapters/timestamps

&nbsp;     action-plan.ts       # 3-step plan + followups

&nbsp;   /services/actions/

&nbsp;     capture-event-note.ts

&nbsp;     create-action-item.ts

&nbsp;     schedule-followup.ts

&nbsp;     update-action-item-status.ts

&nbsp;   /services/llm/

&nbsp;     planner.ts           # chooses which pack/action

&nbsp;     answerer.ts          # formats response

&nbsp;     schema.ts            # JSON schemas for type-safety

&nbsp; /workers

&nbsp;   followups.ts           # Bull or SQS/EventBridge

/sql

&nbsp; mv\_sessions\_now.sql

&nbsp; mv\_sessions\_next\_60.sql

&nbsp; hybrid\_rag.sql

```



---



\# 8) Roadmap to “our own industry LLM” (practical and staged)



\*\*Stage 0: Today (RAG-first)\*\*



\* Capture every Q\&A + the exact context bundle used.

\* Start labeling a few hundred pairs for supervised fine-tuning targets (answer style, structure, tone).



\*\*Stage 1: SFT LoRA on top of a strong base\*\*



\* Use your labeled pairs to train a small \*\*instruction-tuned head\*\* (LoRA adapters) that learns \*how your concierge speaks and prioritizes\*.

\* Host adapters on \*\*SageMaker\*\*; keep retrieval unchanged.



\*\*Stage 2: Domain adapters for reasoning\*\*



\* Build “tool-use” traces (when to call `create\_action\_item`, how to rank sessions).

\* Train policy adapters that improve tool-choice; deploy with a router:



&nbsp; \* general → foundation

&nbsp; \* concierge → foundation + adapters



\*\*Stage 3: Continual improvement\*\*



\* Weekly offline evaluation on your golden traces.

\* Only promote an adapter when it beats the baseline on faithfulness + success rate (clicked recommendations, completed action items).



> You get 80–90% of the benefit with SFT + RAG, at a fraction of pretraining a model from scratch.



---



\# 9) “Do this now” checklist (1–2 sprints)



1\. \*\*Create `mv\_sessions\_now` and `mv\_sessions\_next\_60`\*\* + `pg\_cron` refresh (15–30s).

2\. \*\*Add pgvector\*\* and implement the hybrid SQL shown above.

3\. \*\*Build the Context Assembly Service\*\* that returns a small `ConciergeContext` object (contractor, general, event).

4\. \*\*Put hard guardrails\*\* around your 4 write functions (enable only in allowed states).

5\. \*\*Cut prompts by 80%\*\*: the LLM consumes just `ConciergeContext`.

6\. \*\*Golden traces + CI checks\*\* so event recommendations can’t silently regress.



If you want, I’ll draft the SQL for the two MVs, the `pg\_cron` job, and a TypeScript `context-builder/event.ts` that you can drop into your repo exactly as outlined above. 



