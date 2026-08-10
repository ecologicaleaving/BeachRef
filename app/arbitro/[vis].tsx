/**
 * La scheda di un arbitro (issue #91).
 *
 * Si arriva qui cliccando il NOME nella tabella; cliccando altrove si apre il
 * pannello in linea, che resta comodo per un'occhiata veloce senza perdere il
 * posto nell'elenco. Due gesti, due profondita' diverse.
 *
 * Riservata come tutto il resto: senza accesso e senza invito il database non
 * risponde, e la pagina lo dice invece di mostrare zeri.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/Typography/Text';
import { colors, spacing } from '../../theme/tokens';
import { statoAccesso, tokenCorrente, type StatoAccesso } from '../../services/auth/AccessService';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type Carriera = {
  vis_referee_no: string;
  referee_name: string | null;
  federation_code: string | null;
  matches: number;
  as_first: number;
  as_second: number;
  tournaments: number;
  seasons: number;
  first_match: string | null;
  last_match: string | null;
};

type PerStagione = {
  season: number;
  matches: number;
  as_first: number;
  as_second: number;
  tournaments: number;
};

type PerCategoria = {
  season: number;
  category: string;
  confederation: string | null;
  matches: number;
  rank: number | null;
};

type Partita = {
  match_no: string;
  season: number | null;
  local_date: string | null;
  phase: string | null;
  category: string | null;
  confederation: string | null;
  tournament_name: string | null;
  tournament_no: string | null;
  role: string | null;
  team_a_name: string | null;
  team_b_name: string | null;
};

/** L'ordine delle fasi. Lo stesso di `phase_rank` nel database — qui serve
 *  perche' il registro non porta il numero, solo il nome. */
const ORDINE_FASI = [
  'Finale',
  'Finale 3o posto',
  'Semifinale',
  'Quarti',
  'Ottavi',
  'Sedicesimi',
  'Tabellone',
  'Pool',
  'Turno preliminare',
  'Quota nazionale',
  'Piazzamento',
];

/** Le fasi che vale la pena mettere in evidenza: quelle che si raccontano. */
const FASI_IN_VISTA = ['Finale', 'Finale 3o posto', 'Semifinale', 'Quarti'];

async function leggi<T>(tabella: string, query: string): Promise<T[]> {
  const token = await tokenCorrente();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabella}?${query}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} su ${tabella}: ${(await r.text()).slice(0, 160)}`);
  return await r.json();
}

export default function SchedaArbitro() {
  const { vis } = useLocalSearchParams<{ vis: string }>();
  const [accesso, setAccesso] = useState<StatoAccesso | null>(null);
  const [carriera, setCarriera] = useState<Carriera | null>(null);
  const [stagioni, setStagioni] = useState<PerStagione[]>([]);
  const [categorie, setCategorie] = useState<PerCategoria[]>([]);
  const [partite, setPartite] = useState<Partita[]>([]);
  const [stagione, setStagione] = useState<number | 'carriera'>('carriera');
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    if (!vis) return;
    const filtro = `vis_referee_no=eq.${encodeURIComponent(String(vis))}`;
    try {
      const [c, s, k, p] = await Promise.all([
        leggi<Carriera>('referee_career_stats', `select=*&${filtro}`),
        leggi<PerStagione>('referee_season_stats', `select=*&${filtro}&order=season.desc`),
        leggi<PerCategoria>('referee_category_stats', `select=*&${filtro}&order=rank.asc`),
        leggi<Partita>('referee_match_log', `select=*&${filtro}&order=local_date.desc&limit=10000`),
      ]);
      setCarriera(c[0] ?? null);
      setStagioni(s);
      setCategorie(k);
      setPartite(p);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setCaricamento(false);
    }
  }, [vis]);

  useEffect(() => {
    (async () => {
      const a = await statoAccesso();
      setAccesso(a);
      if (a.stato === 'autorizzato') await carica();
      else setCaricamento(false);
    })();
  }, [carica]);

  const partiteVisibili = useMemo(
    () => (stagione === 'carriera' ? partite : partite.filter((p) => p.season === stagione)),
    [partite, stagione]
  );

  /** Quante partite per fase. E' il conteggio che l'utente cerca per primo —
   *  "quante finali ha fatto" — e dipende dalla normalizzazione della 036: i
   *  tabelloni di piazzamento hanno i nomi delle fasi vere. */
  const perFase = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of partiteVisibili) {
      const k = p.phase ?? 'Senza fase';
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => {
      const ia = ORDINE_FASI.indexOf(a[0]);
      const ib = ORDINE_FASI.indexOf(b[0]);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  }, [partiteVisibili]);

  /** Le fasi di vertice incrociate con la categoria: "tre finali, ma di che
   *  tipo" e' una domanda diversa da "tre finali". */
  const vertice = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const p of partiteVisibili) {
      if (!p.phase || !FASI_IN_VISTA.includes(p.phase)) continue;
      const cat = p.category ?? 'Altro';
      if (!m.has(p.phase)) m.set(p.phase, new Map());
      const q = m.get(p.phase)!;
      q.set(cat, (q.get(cat) ?? 0) + 1);
    }
    return FASI_IN_VISTA.filter((f) => m.has(f)).map((f) => ({
      fase: f,
      per: [...m.get(f)!.entries()].sort((a, b) => b[1] - a[1]),
      totale: [...m.get(f)!.values()].reduce((a, b) => a + b, 0),
    }));
  }, [partiteVisibili]);

  const categorieVisibili = useMemo(() => {
    const m = new Map<string, { n: number; rank: number }>();
    for (const c of categorie) {
      if (stagione !== 'carriera' && c.season !== stagione) continue;
      const v = m.get(c.category) ?? { n: 0, rank: c.rank ?? 9999 };
      v.n += c.matches;
      m.set(c.category, v);
    }
    return [...m.entries()].sort((a, b) => a[1].rank - b[1].rank);
  }, [categorie, stagione]);

  const perConfederazione = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of partiteVisibili) {
      const k = p.confederation ?? 'Non determinata';
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [partiteVisibili]);

  const anni = useMemo(() => stagioni.map((s) => s.season), [stagioni]);

  if (caricamento) {
    return (
      <View style={st.centro}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (accesso && accesso.stato !== 'autorizzato') {
    return (
      <ScrollView contentContainerStyle={st.centro}>
        <Text style={st.titoloErrore}>Serve l&apos;accesso</Text>
        <Pressable style={st.bottone} onPress={() => router.push('/accedi')}>
          <Text style={st.testoBottone}>Vai all&apos;accesso</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (errore || !carriera) {
    return (
      <ScrollView contentContainerStyle={st.centro}>
        <Text style={st.titoloErrore}>Arbitro non trovato</Text>
        <Text style={st.debole}>{errore ?? `Nessuna statistica per il VIS ${vis}.`}</Text>
        <Pressable style={st.bottone} onPress={() => router.push('/referee-stats-lab')}>
          <Text style={st.testoBottone}>Torna all&apos;elenco</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const sel = stagione === 'carriera' ? null : stagioni.find((s) => s.season === stagione);
  const partiteTot = sel ? sel.matches : carriera.matches;
  const primo = sel ? sel.as_first : carriera.as_first;
  const secondo = sel ? sel.as_second : carriera.as_second;
  const tornei = sel ? sel.tournaments : carriera.tournaments;

  return (
    <ScrollView style={st.pagina} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <Pressable onPress={() => router.push('/referee-stats-lab')} style={st.indietro}>
        <Text style={st.testoIndietro}>← Elenco arbitri</Text>
      </Pressable>

      <View style={st.testata}>
        <Text style={st.nome}>{carriera.referee_name ?? `#${carriera.vis_referee_no}`}</Text>
        <Text style={st.sottotitolo}>
          {carriera.federation_code ?? '—'} · VIS {carriera.vis_referee_no} ·{' '}
          {carriera.first_match} → {carriera.last_match}
        </Text>
      </View>

      <View style={st.pillole}>
        <Pressable
          style={[st.pillola, stagione === 'carriera' && st.pillolaAttiva]}
          onPress={() => setStagione('carriera')}
        >
          <Text style={[st.testoPillola, stagione === 'carriera' && st.testoPillolaAttiva]}>
            Carriera
          </Text>
        </Pressable>
        {anni.map((a) => (
          <Pressable
            key={a}
            style={[st.pillola, stagione === a && st.pillolaAttiva]}
            onPress={() => setStagione(a)}
          >
            <Text style={[st.testoPillola, stagione === a && st.testoPillolaAttiva]}>{a}</Text>
          </Pressable>
        ))}
      </View>

      <View style={st.numeroni}>
        <Numerone n={partiteTot} etichetta="partite" forte />
        <Numerone n={primo} etichetta="da 1° arbitro" />
        <Numerone n={secondo} etichetta="da 2° arbitro" />
        <Numerone n={tornei} etichetta="tornei" />
        {stagione === 'carriera' && <Numerone n={carriera.seasons} etichetta="stagioni" />}
      </View>

      <Sezione titolo="Fasi di vertice">
        {vertice.length === 0 ? (
          <Text style={st.debole}>
            Nessuna partita di vertice in questa selezione. I tabelloni di piazzamento — che nel
            VIS si chiamano anche loro &quot;semifinale&quot; o &quot;finale&quot; — non contano
            qui.
          </Text>
        ) : (
          vertice.map((v) => (
            <View key={v.fase} style={st.rigaVertice}>
              <Text style={st.faseNome}>{v.fase}</Text>
              <Text style={st.faseTotale}>{v.totale}</Text>
              <Text style={st.faseDettaglio} numberOfLines={2}>
                {v.per.map(([c, n]) => `${c} ${n}`).join(' · ')}
              </Text>
            </View>
          ))
        )}
      </Sezione>

      <Sezione titolo="Tutte le fasi">
        <View style={st.griglia}>
          {perFase.map(([f, n]) => (
            <View key={f} style={st.cella}>
              <Text style={st.cellaN}>{n}</Text>
              <Text style={st.cellaEtichetta}>{f}</Text>
            </View>
          ))}
        </View>
      </Sezione>

      <Sezione titolo="Per categoria">
        {categorieVisibili.map(([c, v]) => (
          <Barra key={c} etichetta={c} n={v.n} max={categorieVisibili[0]?.[1].n ?? 1} />
        ))}
      </Sezione>

      <Sezione titolo="Per confederazione">
        {perConfederazione.map(([c, n]) => (
          <Barra key={c} etichetta={c} n={n} max={perConfederazione[0]?.[1] ?? 1} />
        ))}
      </Sezione>

      <Sezione titolo={`Ultime partite (${partiteVisibili.length})`}>
        {partiteVisibili.slice(0, 60).map((p) => (
          <View key={p.match_no} style={st.partita}>
            <Text style={st.pData}>{p.local_date ?? '—'}</Text>
            <Text style={st.pFase}>{p.phase ?? '—'}</Text>
            <Text style={st.pRuolo}>{p.role === 'FIRST' ? '1°' : '2°'}</Text>
            <Text style={st.pTorneo} numberOfLines={1}>
              {p.tournament_name ?? `Torneo ${p.tournament_no}`}
            </Text>
            <Text style={st.pSquadre} numberOfLines={1}>
              {p.team_a_name ?? '—'} vs {p.team_b_name ?? '—'}
            </Text>
          </View>
        ))}
        {partiteVisibili.length > 60 && (
          <Text style={st.debole}>
            …e altre {partiteVisibili.length - 60}. L&apos;elenco si ferma a 60 per restare
            leggibile; i conteggi qui sopra le contano tutte.
          </Text>
        )}
      </Sezione>
    </ScrollView>
  );
}

function Numerone({ n, etichetta, forte }: { n: number; etichetta: string; forte?: boolean }) {
  return (
    <View style={st.numerone}>
      <Text style={[st.numeroneN, forte && st.numeroneForte]}>{n}</Text>
      <Text style={st.numeroneEtichetta}>{etichetta}</Text>
    </View>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <View style={st.sezione}>
      <Text style={st.sezioneTitolo}>{titolo}</Text>
      {children}
    </View>
  );
}

function Barra({ etichetta, n, max }: { etichetta: string; n: number; max: number }) {
  const quota = max > 0 ? Math.max(2, Math.round((100 * n) / max)) : 0;
  return (
    <View style={st.barraRiga}>
      <Text style={st.barraEtichetta} numberOfLines={1}>
        {etichetta}
      </Text>
      <View style={st.barraFondo}>
        <View style={[st.barraPieno, { width: `${quota}%` }]} />
      </View>
      <Text style={st.barraN}>{n}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colors.background },
  centro: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  indietro: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  testoIndietro: { color: colors.textSecondary },
  testata: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  nome: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  sottotitolo: { color: colors.textSecondary, marginTop: 2 },

  pillole: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  pillola: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillolaAttiva: { backgroundColor: colors.primary, borderColor: colors.primary },
  testoPillola: { color: colors.textSecondary, fontSize: 13 },
  testoPillolaAttiva: { color: colors.onPrimary, fontWeight: '600' },

  numeroni: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.lg, gap: spacing.lg },
  numerone: { minWidth: 96 },
  numeroneN: { fontSize: 26, fontWeight: '700', color: colors.textSecondary },
  numeroneForte: { color: colors.textPrimary },
  numeroneEtichetta: { color: colors.textTertiary, fontSize: 12 },

  sezione: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sezioneTitolo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  rigaVertice: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: spacing.sm },
  faseNome: { width: 130, color: colors.textPrimary, fontWeight: '600' },
  faseTotale: { width: 44, textAlign: 'right', color: colors.textPrimary, fontWeight: '700' },
  faseDettaglio: { flex: 1, color: colors.textTertiary, fontSize: 12 },

  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cella: { minWidth: 104, paddingVertical: 4 },
  cellaN: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  cellaEtichetta: { color: colors.textTertiary, fontSize: 12 },

  barraRiga: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  barraEtichetta: { width: 150, color: colors.textSecondary, fontSize: 13 },
  barraFondo: { flex: 1, height: 10, backgroundColor: colors.surfaceDisabled, borderRadius: 5 },
  barraPieno: { height: 10, backgroundColor: colors.accent, borderRadius: 5 },
  barraN: { width: 52, textAlign: 'right', color: colors.textPrimary, fontSize: 13 },

  partita: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  pData: { width: 92, color: colors.textSecondary, fontSize: 12 },
  pFase: { width: 110, color: colors.textTertiary, fontSize: 12 },
  pRuolo: { width: 26, color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  pTorneo: { width: 200, color: colors.textPrimary, fontSize: 13 },
  pSquadre: { flex: 1, color: colors.textSecondary, fontSize: 13 },

  titoloErrore: { fontSize: 20, fontWeight: '700', color: colors.error, marginBottom: spacing.sm },
  debole: { color: colors.textTertiary, fontSize: 13, lineHeight: 18 },
  bottone: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius,
  },
  testoBottone: { color: colors.onPrimary, fontWeight: '600' },
});
