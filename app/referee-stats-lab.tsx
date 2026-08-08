/**
 * Banco di lavoro delle statistiche arbitro (issue #91).
 *
 * NON e' collegata da nessuna parte: si raggiunge solo con l'indirizzo
 * diretto `/referee-stats-lab`. E' voluto — serve a guardare i dati aggregati
 * mentre il backfill li riempie, non a mostrarli agli utenti. La schermata per
 * gli utenti e' la issue #92, e passera' dai flag di `DbReadFlags`.
 *
 * Legge SOLO le quattro tabelle del modello di lettura. Partite, designazioni
 * e anagrafica restano chiuse: se questa pagina volesse mostrarle, non
 * potrebbe.
 *
 * **Dalla migration 028 servono un accesso e un invito.** La chiave anonima
 * non apre piu' queste tabelle: le letture viaggiano con il token della
 * sessione, e chi non e' in `app_users` riceve zero righe dal database — non
 * una schermata vuota decisa qui. Il controllo nella pagina serve a dire
 * perche' non si vede nulla, non a impedirlo: quello lo fa PostgREST.
 *
 * Usa `fetch` su PostgREST e non `@supabase/supabase-js` di proposito: sono
 * due GET senza autenticazione ne' realtime, e importare il client
 * trascinerebbe un chunk intero nel bundle web per nulla (vedi "Web bundle
 * weight" in CLAUDE.md).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components/Typography/Text';
import { colors, spacing } from '../theme/tokens';
import { statoAccesso, tokenCorrente, type StatoAccesso } from '../services/auth/AccessService';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type Riga = {
  vis_referee_no: string;
  referee_name: string | null;
  federation_code: string | null;
  season?: number;
  matches: number;
  as_first: number;
  as_second: number;
  tournaments: number;
  seasons?: number;
  first_match: string | null;
  last_match: string | null;
};

type Torneo = {
  tournament_no: string;
  tournament_name: string | null;
  country: string | null;
  gender: string | null;
  tournament_type: string | null;
  category: string | null;
  confederation: string | null;
  season: number | null;
  matches: number;
  as_first: number;
  as_second: number;
  first_match: string | null;
  last_match: string | null;
};

type Partita = {
  match_no: string;
  tournament_no: string | null;
  tournament_name: string | null;
  season: number | null;
  local_date: string | null;
  local_time: string | null;
  round_name: string | null;
  gender: string | null;
  category: string | null;
  confederation: string | null;
  role: string | null;
  team_a_name: string | null;
  team_b_name: string | null;
  match_points_a: number | null;
  match_points_b: number | null;
  status: string | null;
};

type Ordine = 'matches' | 'as_first' | 'as_second' | 'tournaments' | 'referee_name';

const COLONNE: { chiave: Ordine; etichetta: string; larghezza: number; numerica: boolean }[] = [
  { chiave: 'referee_name', etichetta: 'Arbitro', larghezza: 200, numerica: false },
  { chiave: 'matches', etichetta: 'Partite', larghezza: 80, numerica: true },
  { chiave: 'as_first', etichetta: '1°', larghezza: 60, numerica: true },
  { chiave: 'as_second', etichetta: '2°', larghezza: 60, numerica: true },
  { chiave: 'tournaments', etichetta: 'Tornei', larghezza: 70, numerica: true },
];

/** Il VIS parla per cifre; qui si parla a un umano. */
const ALTRO = 'Altro';
const ALTRA = 'Non determinata';

function etichettaGenere(g: string | null): string {
  if (g === 'M') return 'M';
  if (g === 'W') return 'F';
  // "M + W" e' l'etichetta che l'app usa gia' nella selezione tornei: non
  // vale la pena inventarne una seconda per la stessa cosa.
  if (g === 'MIXED') return 'M + W';
  return '';
}

async function leggi<T = Riga>(tabella: string, query: string): Promise<T[]> {
  // `apikey` resta la chiave anonima — identifica il progetto, non la persona.
  // E' `Authorization` a portare il token della sessione: senza, PostgREST
  // parla come `anon`, che dalla 028 non ha piu' nessun permesso qui.
  const token = await tokenCorrente();
  const risposta = await fetch(`${SUPABASE_URL}/rest/v1/${tabella}?${query}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
    },
  });
  if (!risposta.ok) {
    // Il 401/404 di PostgREST su una tabella chiusa e' silenzioso quanto un
    // risultato vuoto: va distinto, altrimenti "nessun dato" e "non ho il
    // permesso di vedere i dati" sembrano la stessa cosa.
    const corpo = await risposta.text();
    throw new Error(`HTTP ${risposta.status} su ${tabella}: ${corpo.slice(0, 200)}`);
  }
  return await risposta.json();
}

export default function RefereeStatsLab() {
  const [carriera, setCarriera] = useState<Riga[]>([]);
  const [stagionali, setStagionali] = useState<Riga[]>([]);
  const [stagione, setStagione] = useState<number | 'carriera'>('carriera');
  const [ordine, setOrdine] = useState<Ordine>('matches');
  const [crescente, setCrescente] = useState(false);
  const [cerca, setCerca] = useState('');
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [accesso, setAccesso] = useState<StatoAccesso | null>(null);

  // Il pannello di dettaglio. I dati NON si caricano insieme al resto: sono
  // decine di migliaia di righe una volta che lo storico sara' completo, e
  // servono solo per l'arbitro su cui si e' cliccato.
  const [aperto, setAperto] = useState<Riga | null>(null);
  const [tornei, setTornei] = useState<Torneo[]>([]);
  const [partite, setPartite] = useState<Partita[]>([]);
  const [torneoEspanso, setTorneoEspanso] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [confed, setConfed] = useState<string | null>(null);
  const [caricaDettaglio, setCaricaDettaglio] = useState(false);
  const [erroreDettaglio, setErroreDettaglio] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setErrore(null);
    try {
      const [c, s] = await Promise.all([
        leggi('referee_career_stats', 'select=*&order=matches.desc&limit=2000'),
        leggi('referee_season_stats', 'select=*&order=season.desc,matches.desc&limit=20000'),
      ]);
      setCarriera(c);
      setStagionali(s);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setCaricamento(false);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const a = await statoAccesso();
      if (!vivo) return;
      setAccesso(a);
      // Si carica solo se il database ci risponderebbe. Chiedere lo stesso
      // produrrebbe zero righe e un "nessun dato" indistinguibile da un
      // database vuoto.
      if (a.stato === 'autorizzato') await carica();
      else setCaricamento(false);
    })();
    return () => {
      vivo = false;
    };
  }, [carica]);

  const apriDettaglio = useCallback(
    async (riga: Riga) => {
      setAperto(riga);
      setTornei([]);
      setPartite([]);
      setTorneoEspanso(null);
      setErroreDettaglio(null);
      setCaricaDettaglio(true);
      try {
        const filtro = `vis_referee_no=eq.${encodeURIComponent(riga.vis_referee_no)}`;
        const [t, p] = await Promise.all([
          leggi<Torneo>(
            'referee_tournament_stats',
            `select=*&${filtro}&order=last_match.desc&limit=2000`
          ),
          leggi<Partita>(
            'referee_match_log',
            `select=*&${filtro}&order=local_date.desc&limit=5000`
          ),
        ]);
        setTornei(t);
        setPartite(p);
      } catch (e) {
        setErroreDettaglio(e instanceof Error ? e.message : String(e));
      } finally {
        setCaricaDettaglio(false);
      }
    },
    []
  );

  const partitePerTorneo = useMemo(() => {
    const per = new Map<string, Partita[]>();
    for (const p of partite) {
      const k = p.tournament_no ?? '—';
      if (!per.has(k)) per.set(k, []);
      per.get(k)!.push(p);
    }
    return per;
  }, [partite]);

  // Nel pannello si mostra la stagione selezionata, non tutta la carriera:
  // altrimenti cliccare su una riga del 2026 aprirebbe anche i tornei del 2025,
  // e il totale nel pannello non corrisponderebbe al numero appena cliccato.
  const perStagione = useMemo(
    () => (stagione === 'carriera' ? tornei : tornei.filter((t) => t.season === stagione)),
    [tornei, stagione]
  );

  // I due filtri si sommano: confederazione E categoria. Sono domande diverse
  // — "chi organizzava" e "che livello era" — e la piu' interessante e'
  // proprio l'intersezione: quanti Futures FIVB, quanti U18 CEV.
  const torneiVisibili = useMemo(
    () =>
      perStagione.filter(
        (t) =>
          // `null` e' un valore vero — "non determinata", "non classificato" —
          // e va filtrabile come gli altri, non confuso con "nessun filtro".
          (!confed || (t.confederation ?? ALTRA) === confed) &&
          (!categoria || (t.category ?? ALTRO) === categoria)
      ),
    [perStagione, confed, categoria]
  );

  /** Conteggi calcolati sull'ALTRO filtro gia' applicato: cosi' i numeri sulle
   *  pillole dicono cosa si otterrebbe cliccandole, non un totale generico. */
  const confederazioni = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of perStagione) {
      if (categoria && (t.category ?? ALTRO) !== categoria) continue;
      const k = t.confederation ?? ALTRA;
      m.set(k, (m.get(k) ?? 0) + t.matches);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [perStagione, categoria]);

  const categorie = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of perStagione) {
      if (confed && (t.confederation ?? ALTRA) !== confed) continue;
      const k = t.category ?? ALTRO;
      m.set(k, (m.get(k) ?? 0) + t.matches);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [perStagione, confed]);

  const stagioni = useMemo(() => {
    const viste = new Set<number>();
    for (const r of stagionali) if (r.season != null) viste.add(r.season);
    return [...viste].sort((a, b) => b - a);
  }, [stagionali]);

  const righe = useMemo(() => {
    const base =
      stagione === 'carriera' ? carriera : stagionali.filter((r) => r.season === stagione);

    const filtrate = cerca.trim()
      ? base.filter((r) =>
          (r.referee_name ?? '').toLowerCase().includes(cerca.trim().toLowerCase()) ||
          (r.federation_code ?? '').toLowerCase().includes(cerca.trim().toLowerCase())
        )
      : base;

    const segno = crescente ? 1 : -1;
    return [...filtrate].sort((a, b) => {
      if (ordine === 'referee_name') {
        return segno * (a.referee_name ?? '').localeCompare(b.referee_name ?? '');
      }
      return segno * ((a[ordine] as number) - (b[ordine] as number));
    });
  }, [carriera, stagionali, stagione, cerca, ordine, crescente]);

  const totali = useMemo(
    () => ({
      arbitri: righe.length,
      designazioni: righe.reduce((n, r) => n + r.matches, 0),
    }),
    [righe]
  );

  const cambiaOrdine = (c: Ordine) => {
    if (c === ordine) setCrescente((v) => !v);
    else {
      setOrdine(c);
      setCrescente(c === 'referee_name');
    }
  };

  if (accesso && accesso.stato !== 'autorizzato') {
    return (
      <ScrollView contentContainerStyle={stili.centro}>
        <Text style={stili.titoloErrore}>
          {accesso.stato === 'non_configurato'
            ? 'Accesso non configurato'
            : accesso.stato === 'anonimo'
              ? 'Serve l’accesso'
              : 'Account non abilitato'}
        </Text>
        <Text style={stili.testoErrore}>
          {accesso.stato === 'non_configurato'
            ? accesso.dettaglio
            : accesso.stato === 'anonimo'
              ? 'Le statistiche sono riservate. Entra con Google per vederle.'
              : `${accesso.email ?? 'Questo account'} ha fatto l’accesso, ma non è fra le persone autorizzate. Serve un invito.`}
        </Text>
        {accesso.stato !== 'non_configurato' && (
          <Pressable style={stili.bottone} onPress={() => router.push('/accedi')}>
            <Text style={stili.testoBottone}>Vai all&apos;accesso</Text>
          </Pressable>
        )}
      </ScrollView>
    );
  }

  if (caricamento) {
    return (
      <View style={stili.centro}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={stili.attesa}>Lettura delle statistiche aggregate…</Text>
      </View>
    );
  }

  if (errore) {
    return (
      <ScrollView contentContainerStyle={stili.centro}>
        <Text style={stili.titoloErrore}>Non riesco a leggere le statistiche</Text>
        <Text style={stili.testoErrore}>{errore}</Text>
        <Pressable style={stili.bottone} onPress={carica}>
          <Text style={stili.testoBottone}>Riprova</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={stili.pagina}
      refreshControl={<RefreshControl refreshing={false} onRefresh={carica} />}
    >
      <View style={stili.intestazione}>
        <Text style={stili.titolo}>Statistiche arbitro — banco di lavoro</Text>
        <Text style={stili.sottotitolo}>
          Dati aggregati da `match_referees`, collegati per identità VIS.{'\n'}
          Pagina non collegata al sito: solo indirizzo diretto.
        </Text>
      </View>

      <View style={stili.filtri}>
        <View style={stili.stagioni}>
          <Pressable
            style={[stili.pillola, stagione === 'carriera' && stili.pillolaAttiva]}
            onPress={() => setStagione('carriera')}
          >
            <Text style={[stili.testoPillola, stagione === 'carriera' && stili.testoPillolaAttiva]}>
              Carriera
            </Text>
          </Pressable>
          {stagioni.map((s) => (
            <Pressable
              key={s}
              style={[stili.pillola, stagione === s && stili.pillolaAttiva]}
              onPress={() => setStagione(s)}
            >
              <Text style={[stili.testoPillola, stagione === s && stili.testoPillolaAttiva]}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={stili.ricerca}
          placeholder="Cerca per nome o federazione…"
          placeholderTextColor={colors.textTertiary}
          value={cerca}
          onChangeText={setCerca}
        />

        <Text style={stili.riepilogo}>
          {totali.arbitri} arbitri · {totali.designazioni} designazioni
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={stili.rigaIntestazione}>
            {COLONNE.map((c) => (
              <Pressable
                key={c.chiave}
                style={[stili.cella, { width: c.larghezza }]}
                onPress={() => cambiaOrdine(c.chiave)}
              >
                <Text
                  style={[
                    stili.testoIntestazione,
                    c.numerica && stili.numerica,
                    ordine === c.chiave && stili.ordinata,
                  ]}
                >
                  {c.etichetta}
                  {ordine === c.chiave ? (crescente ? ' ▲' : ' ▼') : ''}
                </Text>
              </Pressable>
            ))}
            <View style={[stili.cella, { width: 70 }]}>
              <Text style={stili.testoIntestazione}>Fed.</Text>
            </View>
            <View style={[stili.cella, { width: 190 }]}>
              <Text style={stili.testoIntestazione}>Periodo</Text>
            </View>
          </View>

          {righe.map((r, i) => (
            <React.Fragment key={`${r.vis_referee_no}-${r.season ?? 'c'}`}>
            <Pressable
              style={[
                stili.riga,
                i % 2 === 1 && stili.rigaAlterna,
                aperto?.vis_referee_no === r.vis_referee_no && stili.rigaAperta,
              ]}
              onPress={() =>
                aperto?.vis_referee_no === r.vis_referee_no ? setAperto(null) : apriDettaglio(r)
              }
            >
              <View style={[stili.cella, { width: 200 }]}>
                <Text style={stili.nome} numberOfLines={1}>
                  {r.referee_name ?? `#${r.vis_referee_no}`}
                </Text>
              </View>
              <View style={[stili.cella, { width: 80 }]}>
                <Text style={[stili.valore, stili.numerica, stili.forte]}>{r.matches}</Text>
              </View>
              <View style={[stili.cella, { width: 60 }]}>
                <Text style={[stili.valore, stili.numerica]}>{r.as_first}</Text>
              </View>
              <View style={[stili.cella, { width: 60 }]}>
                <Text style={[stili.valore, stili.numerica]}>{r.as_second}</Text>
              </View>
              <View style={[stili.cella, { width: 70 }]}>
                <Text style={[stili.valore, stili.numerica]}>{r.tournaments}</Text>
              </View>
              <View style={[stili.cella, { width: 70 }]}>
                <Text style={stili.valore}>{r.federation_code ?? '—'}</Text>
              </View>
              <View style={[stili.cella, { width: 190 }]}>
                <Text style={stili.debole}>
                  {r.first_match ?? '—'} → {r.last_match ?? '—'}
                  {r.seasons != null ? `  (${r.seasons} st.)` : ''}
                </Text>
              </View>
            </Pressable>

            {aperto?.vis_referee_no === r.vis_referee_no && (
              <View style={stili.dettaglio}>
                {caricaDettaglio && (
                  <View style={stili.pannelloCentro}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                )}

                {erroreDettaglio && (
                  <Text style={stili.testoErrore}>{erroreDettaglio}</Text>
                )}

                {!caricaDettaglio && !erroreDettaglio && confederazioni.length > 1 && (
                  <View style={stili.categorie}>
                    <Text style={stili.etichettaFiltro}>Confederazione</Text>
                    <Pressable
                      style={[stili.pillolaPiccola, !confed && stili.pillolaAttiva]}
                      onPress={() => setConfed(null)}
                    >
                      <Text style={[stili.testoPillolaPiccola, !confed && stili.testoPillolaAttiva]}>
                        Tutte
                      </Text>
                    </Pressable>
                    {confederazioni.map(([nome, n]) => (
                      <Pressable
                        key={nome}
                        style={[stili.pillolaPiccola, confed === nome && stili.pillolaAttiva]}
                        onPress={() => setConfed(confed === nome ? null : nome)}
                      >
                        <Text
                          style={[
                            stili.testoPillolaPiccola,
                            confed === nome && stili.testoPillolaAttiva,
                          ]}
                        >
                          {nome} · {n}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {!caricaDettaglio && !erroreDettaglio && categorie.length > 1 && (
                  <View style={stili.categorie}>
                    <Text style={stili.etichettaFiltro}>Categoria</Text>
                    <Pressable
                      style={[stili.pillolaPiccola, !categoria && stili.pillolaAttiva]}
                      onPress={() => setCategoria(null)}
                    >
                      <Text style={[stili.testoPillolaPiccola, !categoria && stili.testoPillolaAttiva]}>
                        Tutte
                      </Text>
                    </Pressable>
                    {categorie.map(([nome, n]) => (
                      <Pressable
                        key={nome}
                        style={[stili.pillolaPiccola, categoria === nome && stili.pillolaAttiva]}
                        onPress={() => setCategoria(categoria === nome ? null : nome)}
                      >
                        <Text
                          style={[
                            stili.testoPillolaPiccola,
                            categoria === nome && stili.testoPillolaAttiva,
                          ]}
                        >
                          {nome} · {n}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {!caricaDettaglio && !erroreDettaglio && torneiVisibili.length === 0 && (
                  <Text style={stili.debole}>Nessun torneo per questa selezione.</Text>
                )}

                {!caricaDettaglio &&
                  !erroreDettaglio &&
                  torneiVisibili.map((t) => {
                    const espanso = torneoEspanso === t.tournament_no;
                    const sue = (partitePerTorneo.get(t.tournament_no) ?? []).filter(
                      (p) => stagione === 'carriera' || p.season === stagione
                    );
                    return (
                      <View key={t.tournament_no} style={stili.torneo}>
                        <Pressable
                          style={stili.torneoTesta}
                          onPress={() => setTorneoEspanso(espanso ? null : t.tournament_no)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={stili.torneoNome}>
                              {espanso ? '▾ ' : '▸ '}
                              {t.tournament_name ?? `Torneo VIS ${t.tournament_no}`}
                              {t.gender ? (
                                <Text style={stili.genere}>{`  ${etichettaGenere(t.gender)}`}</Text>
                              ) : null}
                              <Text style={stili.categoria}>
                                {`  ${t.confederation ?? ''}${t.confederation ? ' · ' : ''}${
                                  t.category ?? `${ALTRO} (tipo ${t.tournament_type ?? '?'})`
                                }`}
                              </Text>
                            </Text>
                            <Text style={stili.debole}>
                              {t.first_match ?? '—'} → {t.last_match ?? '—'}
                              {t.country ? ` · ${t.country}` : ''}
                              {t.season ? ` · ${t.season}` : ''}
                            </Text>
                          </View>
                          <Text style={stili.torneoConto}>
                            {t.matches}
                            <Text
                              style={stili.debole}
                            >{`  ${t.as_first}×1° ${t.as_second}×2°`}</Text>
                          </Text>
                        </Pressable>

                        {espanso &&
                          sue.map((p) => (
                            <View key={p.match_no} style={stili.partita}>
                              <Text style={stili.partitaData}>
                                {p.local_date ?? '—'}
                                {p.local_time ? ` ${p.local_time.slice(0, 5)}` : ''}
                              </Text>
                              <Text style={stili.partitaFase} numberOfLines={1}>
                                {p.round_name ?? '—'}
                              </Text>
                              <Text style={stili.partitaRuolo}>
                                {p.role === 'FIRST' ? '1°' : '2°'}
                              </Text>
                              <Text style={stili.partitaSquadre} numberOfLines={1}>
                                {p.team_a_name ?? '—'} vs {p.team_b_name ?? '—'}
                              </Text>
                              <Text style={stili.partitaPunti}>
                                {p.match_points_a != null && p.match_points_b != null
                                  ? `${p.match_points_a}–${p.match_points_b}`
                                  : '—'}
                              </Text>
                            </View>
                          ))}

                        {espanso && sue.length === 0 && (
                          <Text style={[stili.debole, stili.partitaVuota]}>
                            Nessuna partita registrata per questo torneo nella selezione corrente.
                          </Text>
                        )}
                      </View>
                    );
                  })}
              </View>
            )}
            </React.Fragment>
          ))}

          {righe.length === 0 && (
            <View style={stili.vuoto}>
              <Text style={stili.debole}>
                Nessuna riga. Se il backfill non ha ancora girato, o se
                `refresh_referee_stats()` non è mai stata eseguita, le tabelle sono vuote —
                il che è diverso dal non avere il permesso di leggerle.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={stili.piede}>
        <Text style={stili.debole}>
          Le statistiche non si aggiornano da sole: le ricalcola
          `refresh_referee_stats()` alla fine di ogni ciclo di backfill.
        </Text>
      </View>

    </ScrollView>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colors.background },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  attesa: { marginTop: spacing.md, color: colors.textSecondary },
  titoloErrore: { fontSize: 20, fontWeight: '700', color: colors.error, marginBottom: spacing.sm },
  testoErrore: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 560,
  },
  bottone: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius,
  },
  testoBottone: { color: colors.onPrimary, fontWeight: '600' },

  intestazione: { padding: spacing.lg, paddingBottom: spacing.md },
  titolo: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  sottotitolo: { marginTop: spacing.xs, color: colors.textSecondary, lineHeight: 20 },

  filtri: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  stagioni: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pillola: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillolaAttiva: { backgroundColor: colors.primary, borderColor: colors.primary },
  testoPillola: { color: colors.textSecondary, fontSize: 14 },
  testoPillolaAttiva: { color: colors.onPrimary, fontWeight: '600' },
  ricerca: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  riepilogo: { marginTop: spacing.sm, color: colors.textTertiary, fontSize: 13 },

  rigaIntestazione: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  riga: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  rigaAlterna: { backgroundColor: colors.surface },
  cella: { paddingVertical: spacing.sm, paddingRight: spacing.sm, justifyContent: 'center' },
  testoIntestazione: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  ordinata: { color: colors.textPrimary },
  numerica: { textAlign: 'right' },
  nome: { color: colors.textPrimary, fontSize: 15 },
  valore: { color: colors.textSecondary, fontSize: 15 },
  forte: { color: colors.textPrimary, fontWeight: '700' },
  debole: { color: colors.textTertiary, fontSize: 13, lineHeight: 18 },
  vuoto: { padding: spacing.lg, maxWidth: 560 },
  piede: { padding: spacing.lg },

  // Il dettaglio si apre SOTTO la riga, dentro la tabella: cosi' resta
  // visibile chi si sta guardando e quali sono i suoi numeri, che un pannello
  // sovrapposto nascondeva.
  rigaAperta: { backgroundColor: '#F4F4F5' },
  dettaglio: {
    width: 730,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  pannelloCentro: { padding: spacing.lg, alignItems: 'center' },
  genere: { color: colors.textTertiary, fontSize: 13, fontWeight: '400' },
  // La categoria non e' un ornamento: e' cio' che distingue un Futures da un
  // Elite16 quando il nome del torneo e' solo il nome della citta'.
  categoria: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  categorie: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  etichettaFiltro: {
    color: colors.textTertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    width: 96,
  },
  pillolaPiccola: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  testoPillolaPiccola: { color: colors.textSecondary, fontSize: 12 },

  torneo: { marginBottom: spacing.sm },
  torneoTesta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  torneoNome: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  torneoConto: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },

  partita: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: spacing.md,
    gap: spacing.sm,
  },
  partitaData: { width: 110, color: colors.textSecondary, fontSize: 13 },
  partitaFase: { width: 90, color: colors.textTertiary, fontSize: 13 },
  partitaRuolo: { width: 28, color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  partitaSquadre: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  partitaPunti: { width: 50, textAlign: 'right', color: colors.textPrimary, fontSize: 14 },
  partitaVuota: { paddingLeft: spacing.md, paddingVertical: spacing.sm },
});
