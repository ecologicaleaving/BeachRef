# What the public key can reach, and why it could reach too much

Issue #77. This file is the answer to its AC5 — *why the policies of issue #22
did not produce the effect they declared* — and the reference for the access
model that replaced them.

The short version: **the #22 policies were applied, and they work exactly as
written. They were written for the wrong verb.** Nothing regressed, nothing was
skipped. What was missing was a measurement.

---

## 1. What was actually true on production

Measured with the public anon key alone, against `peofucnjgcrgswzqslpb`, with
`npm run verify:rls`. The anon key is public by design — it is inlined into any
`EXPO_PUBLIC_*` build and, in this repository, has been sitting in a tracked
build artifact on a public repo.

| Finding | Status | Evidence |
|---|---|---|
| `sync_status`, `sync_error_log`, `alert_rules`, `referee_analytics`, `analytics_events` are **readable** by anyone | **real** | rows and columns actually came back |
| `tournaments`, `events`, `matches`, `referees` are readable | **real, and never decided** | 18 / 13 / 32 / 12 columns, `referees` being personal data |
| `tournaments` accepts an anonymous **INSERT** | **real** | the empty row reached `23502 not-null`, which only happens *after* `WITH CHECK` has passed |
| "17 tables are writable" (UPDATE/DELETE) | **not established** | see §3 — the probe could not tell |
| "12 private tables are readable" | **5 established, 7 not** | the other seven returned an empty set, which a denial also does |
| two unexplained `PGRST204` | **a bug in the probe** | see §4 |

So the vulnerability was real and worth stopping the line for. It was a **read**
vulnerability plus one write vector, not a seventeen-table write vulnerability.

---

## 2. Why #22 did not close it (AC5)

Issue #22 shipped `016_security_hardening.sql`. That migration **is** on
production — provably, because the behaviour it introduced is observable: an
anonymous `INSERT` into `matches` is refused with `42501`, which is precisely
`matches_service_insert` (016 §3a) doing its job, and it replaced migration
015's `Allow anon cache insert`, which had permitted it.

What 016 did was restrict `INSERT` and `UPDATE`. What it did not do was touch
`SELECT` — and it says so, in a comment, in section 3c:

```sql
-- Keep read access, restrict writes to service_role
-- (read policy "Allow monitoring read" and service policy already exist from migration 004)
```

Every table still readable today is readable because of a `FOR SELECT USING
(true)` policy that 016 deliberately preserved or never considered:

| Table | The policy that keeps it open | Written in |
|---|---|---|
| `sync_error_log` | `"Allow monitoring read"` | 004, explicitly kept by 016 |
| `alert_rules` | `"Allow alert rules read"` | 004, kept by 016 |
| `sync_status` | `"anon_read"` / `"sync_status_monitoring_read"` | 001 / 002 / 009 / 010 |
| `referee_analytics` | `"anon_read"`, `"Allow public read access to referee_analytics"` | 009, 011 |
| `analytics_events` | `"anon_read"`, `"Allow public read access to analytics_events"` | 009, 011 |

Those policies were written for a monitoring dashboard that was never built.
Nothing has ever read them.

So the claim in #22 — *"restrictive policies on `matches`, `sync_error_log`,
`analytics_events`"* — was **true for writes and false for reads**, and the
issue said "policy" without saying which verb. There are four verbs, a policy
covers one of them (or `ALL`), and a `FOR SELECT USING (true)` policy sitting
next to a `FOR INSERT WITH CHECK (auth.role() = 'service_role')` policy on the
same table reads, at a glance, like a table that is protected.

### The failure mode, stated plainly

Three things had to line up, and they did:

1. **A declaration in the wrong units.** "Restrictive policies on table X" names
   a table; PostgreSQL grants a verb. The gap between those two sentences is
   where the whole hole lived.
2. **A default that opens.** In Supabase, `anon` and `authenticated` arrive with
   `GRANT ALL ON ALL TABLES IN SCHEMA public` *and* matching default privileges,
   so every new table is reachable until someone says otherwise. Migrations that
   "add security" are therefore always *subtracting* from an open state, and the
   thing they forget to subtract stays.
3. **No measurement.** #22 was closed against the Supabase Security Advisor's
   checklist — RLS enabled, views not `SECURITY DEFINER`, `search_path` set —
   none of which asks the only question that matters: *hold the public key, what
   comes back?* Nobody held the key until issue #54 phase 1.

There is a fourth thing, and it is the most uncomfortable one: **when someone
finally did measure, the measurement was wrong too** (§3). The first honest
answer this project got about its own database was an over-count.

### A related, separate problem: the migration folder is not the database

`supabase/migrations/` cannot be used to reason about production, and this
investigation kept tripping on that:

- there are two `009_*` and two `010_*` files, and both `010_create_sync_status_schema.sql`
  and `009_create_sync_status_schema.sql` redefine `sync_status` with an
  `id bigint` primary key. **Production has neither**: it has the `002.5` shape,
  keyed on `entity_type`.
- `007` declares `service_upsert` restricting `INSERT` on `tournaments` to
  `service_role`, and production accepts an anonymous `INSERT` into
  `tournaments` anyway.

There is no applied-migrations ledger here. Treat the folder as intent and the
probe as fact.

---

## 3. Why the first measurement over-counted

The AC1 script probed writes like this:

```ts
await client.from(table).update({ id: IMPOSSIBLE_ID }).eq('id', IMPOSSIBLE_ID);
await client.from(table).delete().eq('id', IMPOSSIBLE_ID);
```

filtering on an id that cannot exist so that nothing could be damaged. That
safety property is also what destroyed the measurement, because of how RLS
works:

> **RLS on `SELECT`, `UPDATE` and `DELETE` filters rows. It does not reject
> statements.** A statement that matches zero rows succeeds — with or without a
> policy permitting it.

So "statement accepted" was the only possible outcome, on every table, whatever
the policy said. `matches` was reported as deletable by anon while having **no
`DELETE` policy at all**.

The same applies to reads: an RLS-denied `SELECT` returns `[]`, not an error, so
`readable, no rows returned` — seven of the twelve "leaking" tables — meant
nothing either.

All of this is now pinned as executable assertions in
[`tests/rls_deny_all.test.sql`](tests/rls_deny_all.test.sql), which builds a
miniature of production on a throwaway PostgreSQL:

- **A2** — a zero-row `DELETE` succeeds on a table with no `DELETE` policy.
- **A3** — the same `DELETE` against a row that exists is silently filtered: the
  row survives. `matches` was never deletable.
- **A4** — an RLS-denied `SELECT` is an empty set, never an error.
- **A5** — `WITH CHECK` runs *before* the NOT NULL constraints, which is what
  makes `23502` on `tournaments` positive evidence that the insert was
  permitted, and `42501` on `matches` evidence that it was not.

`scripts/verify-rls-anon.ts` was rewritten around this. It now has a fourth
verdict, `inconclusive`, and **inconclusive fails the run**. Under the deny-all
model of §5 every refusal is a privilege error raised before any row is
considered, so the ambiguity disappears entirely: the check can demand an
explicit `42501` from every probe and get it.

---

## 4. The two `PGRST204` (AC4)

```
PGRST204: Could not find the 'id' column of 'sync_status' in the schema cache
PGRST204: Could not find the 'id' column of 'schema_versions' in the schema cache
```

Neither is a security result. The probe assumed every table has an `id` column;
these two do not. `sync_status` is keyed on `entity_type` and `schema_versions`
on `version` — see `002_create_database_schema.sql`. PostgREST rejected the
*filter*, so no statement ever reached the database and nothing was learned
about either table in either direction.

Fixed at the root: `verify-rls-anon.ts` now names the primary key per table and
filters with `<primary key> IS NULL`, which is false for every row of every
table and is type-agnostic — so it cannot raise `22P02` on a bigint key either,
which was the same bug wearing a different error code on eight more tables.

---

## 5. The model now: deny-all

`017_deny_all_public_api_roles.sql`.

**Nothing consumes this database through the public API.** The web app has no
Supabase variables configured; the Flutter app was never distributed. So there
is no consumer to preserve, and the correct starting point is not "tighter
policies" but *nothing*:

- `anon` and `authenticated` hold **no privilege** on any object in `public`;
- **RLS is enabled on every table**, with **every inherited policy dropped**;
- the only policy on any table is an explicit `FOR ALL TO service_role`;
- **default privileges are revoked**, so a table created tomorrow is closed the
  moment it exists;
- the migration **asserts its own result** and refuses to commit if any grant,
  any RLS-disabled table, or any policy applying to `anon`/`authenticated`/
  `public` survives.

`service_role` is unaffected — it holds `BYPASSRLS`, and now an explicit policy
as well. It is a server-side key and must never appear in a client bundle.

`authenticated` is closed alongside `anon` on purpose: wherever sign-up is open,
whoever holds the anon key can mint an authenticated session, so a hole left in
`authenticated` is the same hole one step further along. Migration 016 had
already moved `analytics_events` inserts from `anon` to `authenticated`, which
is a smaller opening but not a closed one.

### Re-opening something later

The recipe is at the bottom of `017_deny_all_public_api_roles.sql`. In short:
a **new** migration, naming the consumer, granting **columns** rather than
tables, with a policy for **one verb**; then the table's entry in
`scripts/verify-rls-anon.ts` gains a `publicColumns` list, so the recurring
check knows the opening was intended and still fails on anything beyond it.

`referees` holds personal data. It currently returns 12 columns to anyone. If it
is ever re-opened, the grant must enumerate columns.

---

## 6. Applying and verifying

The migrations are applied to production **by Davide**, not by CI and not by an
agent.

```bash
# 1. apply — Supabase Dashboard → SQL Editor, paste the file, Run.
#    Or, with the CLI linked to the project:
supabase db execute --file supabase/migrations/017_deny_all_public_api_roles.sql

# 2. verify against the real project, with the public key and nothing else
export SUPABASE_URL='https://peofucnjgcrgswzqslpb.supabase.co'
export SUPABASE_ANON_KEY='<anon key — Supabase → Settings → API>'
npm run verify:rls        # must exit 0 with "Gate: PASSED"
```

The migration prints a `NOTICE` for every step and raises an exception rather
than committing a partial result, so a successful run is itself a claim that the
end state holds. `npm run verify:rls` then checks that claim from the outside,
which is the part that was missing in 2025.

The SQL-level regression test needs only Docker:

```bash
docker run -d --name beachref-rls-test -e POSTGRES_PASSWORD=postgres postgres:15
docker cp supabase beachref-rls-test:/repo/supabase
docker exec beachref-rls-test psql -U postgres -v ON_ERROR_STOP=1 \
  -f /repo/supabase/tests/rls_deny_all.test.sql
docker rm -f beachref-rls-test
```

---

## 7. Keeping it that way (AC8)

`.github/workflows/rls-verify.yml` runs `npm run verify:rls` against the
project:

- **daily**, on a schedule, so a change made in the Supabase dashboard surfaces
  within a day rather than at the next security review;
- on **every pull request that touches** `supabase/**` or
  `scripts/verify-rls-anon.ts`;
- on demand (`workflow_dispatch`).

It needs two repository secrets, `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The
anon key is public by definition, so putting it there costs nothing; the
`service_role` key must **never** be added — the script refuses to run with it
anyway.

If the secrets are absent the job **fails**, it does not skip. A recurring check
that quietly stops running is how this issue happened in the first place.
