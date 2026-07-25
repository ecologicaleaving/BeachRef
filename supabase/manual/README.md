# SQL manuale

SQL che **non** è una migration: si esegue a mano dalla dashboard Supabase
(SQL Editor), quando serve, e non fa parte della sequenza applicata da
`supabase db push`.

Le migration versionate stanno in `supabase/migrations/` e sono l'unica
fonte di verità sullo schema. Non aggiungere qui SQL che modifica lo schema:
se cambia lo schema, è una migration.

| File | Cosa fa |
|---|---|
| `TRIGGER-SYNC-FUNCTION.sql` | Invoca a mano l'edge function `match-schedule-sync` via `net.http_post`. Legge la service_role key da Supabase Vault — non incollarci mai un segreto: questo repository è pubblico (vedi issue #56). |
