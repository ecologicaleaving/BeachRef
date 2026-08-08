-- Migration 030: le categorie che la 029 non aveva potuto dimostrare (#91)
--
-- =============================================================================
-- PERCHE' ORA SI PUO', E PRIMA NO
-- =============================================================================
--
-- La 029 ha stabilito i codici incrociandoli con le parole nei nomi su tutti i
-- 9.260 tornei dell'archivio, e per quattordici di essi non e' emersa nessuna
-- parola dominante. Erano righe come "Berlino", "Gstaad", "Roma": citta' e
-- nient'altro.
--
-- Il campione era sbagliato. Guardando **soltanto i tornei che compaiono nelle
-- nostre statistiche** — 417 allora, oltre 500 adesso — gli stessi codici
-- diventano leggibili, perche' gli eventi internazionali portano il nome per
-- esteso mentre quelli locali no:
--
--   tipo  4  FIVB Beach Volleyball World Championships · World Championships 2023
--   tipo  5  Olympic Games Paris 2024 - Beach Volleyball
--   tipo  7  CEV European Championships - Vienna · 2023 Asian Senior
--   tipo 12  AVC Beach Tour Samila Open · AVC Beach Tour Pingtung
--   tipo 14  FIVB BVB U18 WCHs The Hague · FIVB BVB U18 WCHs - Doha
--   tipo 15  Austrian Beachvolleyball Tour Pro Litzlberg · Austrian BVB Championship
--   tipo 26  FIVB BVB U21 WCHS · FIVB BVB U21 WCHs - Puebla
--   tipo 27  FIVB BVB U19 WCHS Shangluo
--
-- Il codice 12 e' quello che la 029 aveva escluso di proposito: la parola
-- "Continental Tour" ricorreva nel 25% dei nomi dell'archivio. Nei nostri dati
-- sono tutti "AVC Beach Tour", cioe' il tour continentale asiatico. La cautela
-- era giusta allora e non serve piu' ora: e' cambiata la prova, non il criterio.
--
-- =============================================================================
-- COSA RESTA ANCORA SENZA
-- =============================================================================
--
-- Il codice 8 (96 partite): nei nostri dati un solo nome, "Banjul". Non basta.
--
-- Il codice 9 (223 partite): nell'archivio e' "Goodwill Games", "Long Beach
-- Presidents Cup", "USAV Collegiate Beach Championship"; nei nostri dati e'
-- "COMMONWEALTH YOUTH GAMES" e "African Youth Games". I due campioni **non
-- concordano**, ed e' esattamente il segnale per astenersi: un codice che
-- significa cose diverse a seconda di dove guardi non ha una sola etichetta.
--
-- Copertura attesa dopo questa migration: dal 84% al 99,3% delle partite.

BEGIN;

CREATE OR REPLACE FUNCTION public.tournament_category(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    -- Beach Pro Tour
    WHEN '51' THEN 'BPT Elite16'
    WHEN '52' THEN 'BPT Challenge'
    WHEN '53' THEN 'BPT Futures'
    WHEN '54' THEN 'BPT Finals'
    WHEN '50' THEN 'King of the Court'
    -- Vertice
    WHEN '5'  THEN 'Giochi Olimpici'
    WHEN '4'  THEN 'Campionati del Mondo'
    WHEN '7'  THEN 'Campionati continentali'
    WHEN '49' THEN 'Qualificazione olimpica'
    -- Giovanili
    WHEN '26' THEN 'Mondiali U21'
    WHEN '27' THEN 'Mondiali U19'
    WHEN '14' THEN 'Mondiali U18'
    WHEN '22' THEN 'U22'
    WHEN '23' THEN 'U20'
    WHEN '24' THEN 'U18'
    WHEN '47' THEN 'U21'
    WHEN '48' THEN 'U19'
    WHEN '55' THEN 'Qualificazione giovanile'
    WHEN '43' THEN 'Youth Olympic Games'
    -- Circuiti
    WHEN '12' THEN 'Continental Tour'
    WHEN '11' THEN 'Continental Cup'
    WHEN '34' THEN 'Zonale'
    WHEN '15' THEN 'Tour nazionale'
    -- Altro
    WHEN '44' THEN 'Giochi multisport'
    WHEN '36' THEN 'Snow Volleyball'
    WHEN '35' THEN 'Test / formazione'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.tournament_category(TEXT) IS
  'Traduce `tournaments.type` (codice VIS) in una categoria leggibile. '
  'I codici 8 e 9 restano NULL: per l''uno c''e'' un solo nome, per l''altro '
  'i campioni non concordano. Una categoria sbagliata non si distingue da una '
  'giusta, una assente si vede. Migration 029, estesa dalla 030.';

INSERT INTO public.schema_versions (version, description)
SELECT '4.7.1',
       'Issue #91: categorie per i codici che la 029 non aveva potuto '
       'dimostrare — mondiali, olimpiadi, continentali, tour nazionali. '
       'Restano senza etichetta i codici 8 e 9.'
WHERE NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = '4.7.1');

COMMIT;
