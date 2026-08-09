-- Migration 033: i livelli del World Tour, l'era prima del Beach Pro Tour (#91)
--
-- =============================================================================
-- COSA HANNO PORTATO LE STAGIONI 2018-2021
-- =============================================================================
--
-- 15.477 partite senza categoria, concentrate in sei codici che prima non
-- comparivano: 38, 39, 40, 41, 42 e 33. Sono i livelli del **FIVB World Tour**,
-- il circuito sostituito dal Beach Pro Tour nel 2022.
--
-- I nomi non aiutano — "Ostrava", "Gstaad", "Sofia" — e nemmeno i codici
-- torneo, che sono citta' piu' anno (`WGST2020`, `MROM2019`). Serviva un'altra
-- prova.
--
-- =============================================================================
-- LA PROVA: LA PIRAMIDE
-- =============================================================================
--
-- Il World Tour aveva pochi eventi di vertice e molti di base. Contando i
-- tornei per tipo e per stagione (M e W insieme, quindi il doppio degli
-- eventi):
--
--   tipo   2017  2018  2019
--     33      2     2     2   -> un evento l'anno: World Tour Finals
--     38     10     8     6   -> 3-5 eventi: i Major, 5 stelle
--     39      8    21    24   -> ~12 eventi: 4 stelle
--     40     12    12    15   -> ~7 eventi:  3 stelle
--     41      6    11    11   -> ~6 eventi:  2 stelle
--     42     14    49    45   -> ~22 eventi: 1 stella
--
-- La forma combacia con il circuito reale, e i nomi la confermano dove sono
-- riconoscibili: il tipo 33 e' "Rome (World Tour Finals)" e Amburgo, il 38 e'
-- Gstaad, Vienna, Roma, Amburgo — i Major.
--
-- La distinzione fra 41 e 42 e' l'unica che il nome non avrebbe mai dato: due
-- livelli minori, entrambi in citta' qualsiasi. La danno i conteggi, e la
-- danno in modo netto — 45 contro 11.
--
-- Aggiunto anche il tipo 10: i suoi nomi dicono "CEV Baden Masters", "CEV
-- Alanya Masters", "CEV Pelhrimov Masters". Quello non aveva bisogno di
-- piramidi.
--
-- Restano senza etichetta l'8 e il 9, per le ragioni gia' scritte nella 030.

BEGIN;

CREATE OR REPLACE FUNCTION public.tournament_category(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    -- Beach Pro Tour (dal 2022)
    WHEN '51' THEN 'BPT Elite16'
    WHEN '52' THEN 'BPT Challenge'
    WHEN '53' THEN 'BPT Futures'
    WHEN '54' THEN 'BPT Finals'
    WHEN '50' THEN 'King of the Court'
    -- World Tour (fino al 2021)
    WHEN '33' THEN 'World Tour Finals'
    WHEN '38' THEN 'World Tour 5 stelle'
    WHEN '39' THEN 'World Tour 4 stelle'
    WHEN '40' THEN 'World Tour 3 stelle'
    WHEN '41' THEN 'World Tour 2 stelle'
    WHEN '42' THEN 'World Tour 1 stella'
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
    WHEN '10' THEN 'CEV Masters'
    WHEN '34' THEN 'Zonale'
    WHEN '15' THEN 'Tour nazionale'
    -- Altro
    WHEN '44' THEN 'Giochi multisport'
    WHEN '36' THEN 'Snow Volleyball'
    WHEN '35' THEN 'Test / formazione'
    ELSE NULL
  END;
$$;

-- Il World Tour era FIVB, come il Beach Pro Tour che lo ha sostituito. Senza
-- questa aggiunta 15.000 partite finirebbero in "confederazione non
-- determinata" pur essendo il circuito mondiale per definizione.
CREATE OR REPLACE FUNCTION public.tournament_confederation(
  p_category TEXT,
  p_name     TEXT
) RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_category IN ('BPT Elite16', 'BPT Challenge', 'BPT Futures', 'BPT Finals',
                        'King of the Court',
                        'World Tour Finals', 'World Tour 5 stelle', 'World Tour 4 stelle',
                        'World Tour 3 stelle', 'World Tour 2 stelle', 'World Tour 1 stella',
                        'Campionati del Mondo', 'Giochi Olimpici',
                        'Mondiali U21', 'Mondiali U19', 'Mondiali U18',
                        'Qualificazione olimpica', 'Youth Olympic Games')
      THEN 'FIVB'
    WHEN upper(p_name) LIKE '%NEVZA%'    THEN 'CEV'
    WHEN upper(p_name) LIKE '%EEVZA%'    THEN 'CEV'
    WHEN upper(p_name) LIKE '%MEVZA%'    THEN 'CEV'
    WHEN upper(p_name) LIKE '%CEV%'      THEN 'CEV'
    WHEN upper(p_name) LIKE '%CAVB%'     THEN 'CAVB'
    WHEN upper(p_name) LIKE '%AVC%'      THEN 'AVC'
    WHEN upper(p_name) LIKE '%NORCECA%'  THEN 'NORCECA'
    WHEN upper(p_name) LIKE '%ECVA%'     THEN 'NORCECA'
    WHEN upper(p_name) LIKE '%AFECAVOL%' THEN 'CSV'
    WHEN upper(p_name) LIKE '%CSV%'      THEN 'CSV'
    WHEN upper(p_name) LIKE '%FIVB%'     THEN 'FIVB'
    WHEN upper(p_name) LIKE '%EUROPEAN%'       THEN 'CEV'
    WHEN upper(p_name) LIKE '%ASIAN%'          THEN 'AVC'
    WHEN upper(p_name) LIKE '%SEA ZONE%'       THEN 'AVC'
    WHEN upper(p_name) LIKE '%AFRICAN%'        THEN 'CAVB'
    WHEN upper(p_name) LIKE '%SOUTH AMERICAN%' THEN 'CSV'
    WHEN upper(p_name) LIKE '%SUDAMERICANO%'   THEN 'CSV'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.tournament_category(TEXT) IS
  'Traduce `tournaments.type` (codice VIS) in una categoria leggibile: Beach '
  'Pro Tour dal 2022, World Tour fino al 2021, piu'' vertice, giovanili e '
  'circuiti. I codici 8 e 9 restano NULL — vedi 030. Migration 029/030/033.';

INSERT INTO public.schema_versions (version, description)
SELECT '4.9.1',
       'Issue #91: i livelli del World Tour (Finals, 5/4/3/2/1 stelle) e i CEV '
       'Masters. I tier sono stati distinti contando i tornei per stagione: la '
       'piramide del circuito e'' l''unica prova che i nomi non davano.'
WHERE NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = '4.9.1');

COMMIT;
