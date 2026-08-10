/**
 * La scheda di un arbitro (issue #91).
 *
 * Si arriva qui cliccando il NOME nella tabella; cliccando altrove si apre il
 * pannello in linea, che resta comodo per un'occhiata veloce senza perdere il
 * posto nell'elenco. Due gesti, due profondita'.
 *
 * ## Il disegno, e cosa ha guidato le scelte
 *
 * La domanda che una scheda arbitro deve saper rispondere in tre secondi non
 * e' "quante partite ha fatto" — quella e' facile e la sa gia' la tabella. E':
 * **a che livello arbitra questa persona, e da quanto**. Da qui:
 *
 * 1. **Le finali stanno in cima**, con il livello del torneo accanto. "Tre
 *    finali" non dice nulla finche' non sai se erano Futures o Elite16, ed e'
 *    la prima cosa che un designatore guarda.
 * 2. **La linea del tempo prima dei totali.** Una carriera e' una forma: chi
 *    cresce, chi si e' fermato, chi torna. Un totale di 600 partite nasconde
 *    tutte e tre.
 * 3. **Le categorie in ordine di importanza, non di volume** (`category_rank`,
 *    migration 035). Ordinarle per numero metterebbe i Futures in cima a ogni
 *    scheda, che e' vero e inutile.
 * 4. **Niente colore dove non significa.** L'oro (`colors.accent`) e' riservato
 *    a cio' che e' di vertice: finali e barra piu' alta. Se colorassi tutto,
 *    non guiderebbe piu' l'occhio da nessuna parte.
 *
 * Riservata come il resto: senza accesso e senza invito il database non
 * risponde, e la pagina lo dice invece di mostrare zeri.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/Typography/Text';
import { colors, spacing, brandBlue, neutrals } from '../../theme/tokens';
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
  gender: string | null;
  role: string | null;
  team_a_name: string | null;
  team_b_name: string | null;
  match_points_a: number | null;
  match_points_b: number | null;
};

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

/** Le fasi che raccontano qualcosa di una carriera. */
const FASI_DI_VERTICE = ['Finale', 'Finale 3o posto', 'Semifinale', 'Quarti'];

/**
 * L'anno da cui il VIS pubblica gli identificativi degli arbitri.
 *
 * Prima di questo confine le partite portano un nome abbreviato
 * ("Oliveira, E.") e nessun numero: verificato sul VIS con tre richieste
 * diverse, incluso il roster dell'evento, che per il 2013 torna vuoto e per il
 * 2026 torna popolato. Non e' un buco nel backfill, ed e' scritto in pagina
 * perche' una carriera che sembra iniziare nel 2014 non venga letta come tale.
 */
const PRIMO_ANNO_CON_IDENTIFICATIVI = 2014;

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
  const { width } = useWindowDimensions();
  const stretto = width < 760;

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
    const f = `vis_referee_no=eq.${encodeURIComponent(String(vis))}`;
    try {
      const [c, s, k, p] = await Promise.all([
        leggi<Carriera>('referee_career_stats', `select=*&${f}`),
        leggi<PerStagione>('referee_season_stats', `select=*&${f}&order=season.asc`),
        leggi<PerCategoria>('referee_category_stats', `select=*&${f}&order=rank.asc`),
        leggi<Partita>('referee_match_log', `select=*&${f}&order=local_date.desc&limit=10000`),
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

  const inSelezione = useMemo(
    () => (stagione === 'carriera' ? partite : partite.filter((p) => p.season === stagione)),
    [partite, stagione]
  );

  const vertice = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const p of inSelezione) {
      if (!p.phase || !FASI_DI_VERTICE.includes(p.phase)) continue;
      const cat = p.category ?? 'Altro';
      if (!m.has(p.phase)) m.set(p.phase, new Map());
      const q = m.get(p.phase)!;
      q.set(cat, (q.get(cat) ?? 0) + 1);
    }
    return FASI_DI_VERTICE.map((f) => ({
      fase: f,
      totale: m.has(f) ? [...m.get(f)!.values()].reduce((a, b) => a + b, 0) : 0,
      per: m.has(f) ? [...m.get(f)!.entries()].sort((a, b) => b[1] - a[1]) : [],
    }));
  }, [inSelezione]);

  const perFase = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of inSelezione) m.set(p.phase ?? 'Senza fase', (m.get(p.phase ?? 'Senza fase') ?? 0) + 1);
    return [...m.entries()].sort((a, b) => {
      const i = ORDINE_FASI.indexOf(a[0]);
      const j = ORDINE_FASI.indexOf(b[0]);
      return (i < 0 ? 999 : i) - (j < 0 ? 999 : j);
    });
  }, [inSelezione]);

  const perCategoria = useMemo(() => {
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
    for (const p of inSelezione) m.set(p.confederation ?? 'n.d.', (m.get(p.confederation ?? 'n.d.') ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [inSelezione]);

  const maxStagione = useMemo(
    () => stagioni.reduce((a, s) => Math.max(a, s.matches), 0),
    [stagioni]
  );

  if (caricamento) {
    return (
      <View style={st.centro}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (accesso && accesso.stato !== 'autorizzato') {
    return (
      <View style={st.centro}>
        <Text style={st.vuotoTitolo}>Serve l&apos;accesso</Text>
        <Text style={st.vuotoTesto}>Le statistiche sono riservate a chi è stato invitato.</Text>
        <Pressable style={st.bottone} onPress={() => router.push('/accedi')}>
          <Text style={st.testoBottone}>Vai all&apos;accesso</Text>
        </Pressable>
      </View>
    );
  }

  if (errore || !carriera) {
    return (
      <View style={st.centro}>
        <Text style={st.vuotoTitolo}>Arbitro non trovato</Text>
        <Text style={st.vuotoTesto}>{errore ?? `Nessuna statistica per il VIS ${vis}.`}</Text>
        <Pressable style={st.bottone} onPress={() => router.push('/referee-stats-lab')}>
          <Text style={st.testoBottone}>Torna all&apos;elenco</Text>
        </Pressable>
      </View>
    );
  }

  const sel = stagione === 'carriera' ? null : stagioni.find((s) => s.season === stagione);
  const nPartite = sel ? sel.matches : carriera.matches;
  const nPrimo = sel ? sel.as_first : carriera.as_first;
  const nSecondo = sel ? sel.as_second : carriera.as_second;
  const nTornei = sel ? sel.tournaments : carriera.tournaments;
  const quotaPrimo = nPartite > 0 ? Math.round((100 * nPrimo) / nPartite) : 0;
  const iniziato = Number((carriera.first_match ?? '').slice(0, 4));
  const troncato = iniziato > 0 && iniziato <= PRIMO_ANNO_CON_IDENTIFICATIVI;

  return (
    <ScrollView style={st.pagina} contentContainerStyle={st.contenuto}>
      <View style={st.colonna}>
        <Pressable onPress={() => router.push('/referee-stats-lab')} hitSlop={8}>
          <Text style={st.indietro}>← Elenco arbitri</Text>
        </Pressable>

        {/* ---- Testata ---------------------------------------------------- */}
        <View style={st.testata}>
          <View style={st.medaglione}>
            <Text style={st.iniziali}>{iniziali(carriera.referee_name)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text style={st.nome}>{carriera.referee_name ?? `#${carriera.vis_referee_no}`}</Text>
            <View style={st.targhette}>
              <Targhetta testo={carriera.federation_code ?? '—'} forte />
              <Targhetta testo={`VIS ${carriera.vis_referee_no}`} />
              <Targhetta
                testo={`${(carriera.first_match ?? '').slice(0, 4)} – ${(carriera.last_match ?? '').slice(0, 4)}`}
              />
              <Targhetta testo={`${carriera.seasons} stagioni`} />
            </View>
          </View>
        </View>

        {/* ---- Selettore stagione ----------------------------------------- */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.selettore}>
          <Chip attivo={stagione === 'carriera'} onPress={() => setStagione('carriera')}>
            Carriera
          </Chip>
          {[...stagioni].reverse().map((s) => (
            <Chip key={s.season} attivo={stagione === s.season} onPress={() => setStagione(s.season)}>
              {String(s.season)}
            </Chip>
          ))}
        </ScrollView>

        {/* ---- Le finali, per prime --------------------------------------- */}
        <Sezione titolo="Fasi di vertice" nota="Escluse le finali e semifinali di piazzamento">
          <View style={st.vertice}>
            {vertice.map((v) => (
              <View key={v.fase} style={[st.cartaVertice, v.fase === 'Finale' && st.cartaOro]}>
                <Text style={[st.verticeN, v.fase === 'Finale' && st.verticeNOro]}>{v.totale}</Text>
                <Text style={st.verticeFase}>{v.fase}</Text>
                {v.per.length > 0 && (
                  <Text style={st.verticeDettaglio} numberOfLines={3}>
                    {v.per.map(([c, n]) => `${n} ${c}`).join('\n')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Sezione>

        {/* ---- La forma della carriera ------------------------------------ */}
        {stagione === 'carriera' && stagioni.length > 1 && (
          <Sezione titolo="La carriera nel tempo" nota="Partite per stagione">
            <View style={st.timeline}>
              {stagioni.map((s) => (
                <Pressable key={s.season} style={st.annoCol} onPress={() => setStagione(s.season)}>
                  <Text style={st.annoN}>{s.matches}</Text>
                  <View style={st.annoFondo}>
                    <View
                      style={[
                        st.annoBarra,
                        { height: Math.max(3, Math.round((72 * s.matches) / (maxStagione || 1))) },
                      ]}
                    />
                  </View>
                  <Text style={st.annoEtichetta}>{String(s.season).slice(2)}</Text>
                </Pressable>
              ))}
            </View>
            {troncato && (
              <Text style={st.avviso}>
                Il VIS pubblica gli identificativi degli arbitri solo dal {PRIMO_ANNO_CON_IDENTIFICATIVI}.
                Prima di allora le partite portano un nome abbreviato e nessun numero: se questa
                carriera è cominciata prima, la parte precedente non è ricostruibile.
              </Text>
            )}
          </Sezione>
        )}

        {/* ---- I numeri --------------------------------------------------- */}
        <Sezione titolo={stagione === 'carriera' ? 'In carriera' : `Stagione ${stagione}`}>
          <View style={st.numeri}>
            <Numero n={nPartite} etichetta="partite" grande />
            <Numero n={nTornei} etichetta="tornei" />
            <Numero n={nPrimo} etichetta="da 1° arbitro" sotto={`${quotaPrimo}%`} />
            <Numero n={nSecondo} etichetta="da 2° arbitro" sotto={`${100 - quotaPrimo}%`} />
          </View>
        </Sezione>

        {/* ---- Livello e area --------------------------------------------- */}
        <View style={[st.duecolonne, stretto && st.unacolonna]}>
          <View style={st.mezza}>
            <Sezione titolo="Livello dei tornei" nota="In ordine di importanza">
              {perCategoria.map(([c, v], i) => (
                <Barra
                  key={c}
                  etichetta={c}
                  n={v.n}
                  max={Math.max(...perCategoria.map(([, x]) => x.n), 1)}
                  evidenzia={i === 0}
                />
              ))}
            </Sezione>
          </View>
          <View style={st.mezza}>
            <Sezione titolo="Confederazione">
              {perConfederazione.map(([c, n], i) => (
                <Barra
                  key={c}
                  etichetta={c}
                  n={n}
                  max={perConfederazione[0]?.[1] ?? 1}
                  evidenzia={i === 0}
                />
              ))}
            </Sezione>
          </View>
        </View>

        {/* ---- Tutte le fasi ---------------------------------------------- */}
        <Sezione titolo="Tutte le fasi">
          <View style={st.fasi}>
            {perFase.map(([f, n]) => (
              <View key={f} style={st.fasePillola}>
                <Text style={st.fasePillolaN}>{n}</Text>
                <Text style={st.fasePillolaT}>{f}</Text>
              </View>
            ))}
          </View>
        </Sezione>

        {/* ---- Partite ----------------------------------------------------- */}
        <Sezione titolo={`Partite (${inSelezione.length})`}>
          {inSelezione.slice(0, 50).map((p) => (
            <View key={p.match_no} style={st.riga}>
              <Text style={st.rData}>{p.local_date ?? '—'}</Text>
              {!stretto && (
                <Text style={st.rTorneo} numberOfLines={1}>
                  {p.tournament_name ?? `Torneo ${p.tournament_no}`}
                  {p.gender ? ` · ${p.gender === 'W' ? 'F' : p.gender === 'M' ? 'M' : 'M+W'}` : ''}
                </Text>
              )}
              <Text
                style={[st.rFase, FASI_DI_VERTICE.includes(p.phase ?? '') && st.rFaseVertice]}
                numberOfLines={1}
              >
                {p.phase ?? '—'}
              </Text>
              <Text style={st.rRuolo}>{p.role === 'FIRST' ? '1°' : '2°'}</Text>
              <Text style={st.rSquadre} numberOfLines={1}>
                {p.team_a_name ?? '—'} vs {p.team_b_name ?? '—'}
              </Text>
              <Text style={st.rPunti}>
                {p.match_points_a != null && p.match_points_b != null
                  ? `${p.match_points_a}–${p.match_points_b}`
                  : ''}
              </Text>
            </View>
          ))}
          {inSelezione.length > 50 && (
            <Text style={st.nota}>
              …e altre {inSelezione.length - 50}. L&apos;elenco si ferma a 50 per restare leggibile;
              i conteggi qui sopra le contano tutte.
            </Text>
          )}
        </Sezione>
      </View>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------------- */

function iniziali(nome: string | null): string {
  if (!nome) return '?';
  // `split` non restituisce mai un array vuoto, ma con `noUncheckedIndexedAccess`
  // TypeScript non lo sa — e ha ragione a non fidarsi: una stringa di soli spazi
  // darebbe `['']`, e `''[0]` e' undefined.
  const p = nome.trim().split(/\s+/).filter(Boolean);
  const primo = p[0]?.[0] ?? '';
  const ultimo = p.length > 1 ? (p[p.length - 1]?.[0] ?? '') : '';
  return (primo + ultimo).toUpperCase() || '?';
}

function Targhetta({ testo, forte }: { testo: string; forte?: boolean }) {
  return (
    <View style={[st.targhetta, forte && st.targhettaForte]}>
      <Text style={[st.targhettaT, forte && st.targhettaTForte]}>{testo}</Text>
    </View>
  );
}

function Chip({
  children,
  attivo,
  onPress,
}: {
  children: React.ReactNode;
  attivo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[st.chip, attivo && st.chipAttivo]} onPress={onPress}>
      <Text style={[st.chipT, attivo && st.chipTAttivo]}>{children}</Text>
    </Pressable>
  );
}

function Sezione({
  titolo,
  nota,
  children,
}: {
  titolo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={st.sezione}>
      <View style={st.sezioneTestata}>
        <Text style={st.sezioneTitolo}>{titolo}</Text>
        {nota ? <Text style={st.sezioneNota}>{nota}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Numero({
  n,
  etichetta,
  sotto,
  grande,
}: {
  n: number;
  etichetta: string;
  sotto?: string;
  grande?: boolean;
}) {
  return (
    <View style={st.numero}>
      <Text style={[st.numeroN, grande && st.numeroNGrande]}>{n.toLocaleString('it-IT')}</Text>
      <Text style={st.numeroE}>{etichetta}</Text>
      {sotto ? <Text style={st.numeroS}>{sotto}</Text> : null}
    </View>
  );
}

function Barra({
  etichetta,
  n,
  max,
  evidenzia,
}: {
  etichetta: string;
  n: number;
  max: number;
  evidenzia?: boolean;
}) {
  const quota = max > 0 ? Math.max(2, Math.round((100 * n) / max)) : 0;
  return (
    <View style={st.barraRiga}>
      <Text style={st.barraE} numberOfLines={1}>
        {etichetta}
      </Text>
      <View style={st.barraFondo}>
        <View style={[st.barraPieno, evidenzia && st.barraPienoOro, { width: `${quota}%` }]} />
      </View>
      <Text style={st.barraN}>{n}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------------- */

const st = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colors.background },
  contenuto: { paddingBottom: spacing.xxl, alignItems: 'center' },
  colonna: { width: '100%', maxWidth: 960, paddingHorizontal: spacing.lg },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },

  indietro: { color: colors.textSecondary, paddingVertical: spacing.md, fontSize: 14 },

  testata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  medaglione: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniziali: { color: colors.onPrimary, fontSize: 24, fontWeight: '700', letterSpacing: 0.5 },
  nome: { fontSize: 32, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.25 },
  targhette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  targhetta: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#F4F4F5',
  },
  targhettaForte: { backgroundColor: brandBlue[900] },
  targhettaT: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  targhettaTForte: { color: neutrals.bgSurface },

  selettore: { marginTop: spacing.lg, marginBottom: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 6,
  },
  chipAttivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipT: { color: colors.textSecondary, fontSize: 13 },
  chipTAttivo: { color: colors.onPrimary, fontWeight: '600' },

  sezione: { marginTop: spacing.xl },
  sezioneTestata: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.md },
  sezioneTitolo: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sezioneNota: { fontSize: 12, color: colors.textTertiary },

  vertice: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cartaVertice: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 108,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cartaOro: { borderColor: colors.accent, borderWidth: 2 },
  verticeN: { fontSize: 34, fontWeight: '700', color: colors.textPrimary, lineHeight: 38 },
  verticeNOro: { color: colors.accent },
  verticeFase: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  verticeDettaglio: { marginTop: 6, fontSize: 11, color: colors.textTertiary, lineHeight: 15 },

  timeline: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, flexWrap: 'wrap' },
  annoCol: { alignItems: 'center', width: 40 },
  annoN: { fontSize: 10, color: colors.textTertiary, marginBottom: 2 },
  annoFondo: { height: 76, justifyContent: 'flex-end' },
  annoBarra: { width: 22, backgroundColor: brandBlue[600], borderRadius: 3 },
  annoEtichetta: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  avviso: {
    marginTop: spacing.md,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textTertiary,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    paddingLeft: spacing.sm,
  },

  numeri: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  numero: { minWidth: 92 },
  numeroN: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  numeroNGrande: { fontSize: 40, lineHeight: 44, letterSpacing: -0.5 },
  numeroE: { fontSize: 12, color: colors.textTertiary },
  numeroS: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  duecolonne: { flexDirection: 'row', gap: spacing.xl },
  unacolonna: { flexDirection: 'column', gap: 0 },
  mezza: { flex: 1, minWidth: 260 },

  barraRiga: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  barraE: { width: 148, color: colors.textSecondary, fontSize: 13 },
  barraFondo: { flex: 1, height: 8, backgroundColor: '#F4F4F5', borderRadius: 4 },
  barraPieno: { height: 8, backgroundColor: brandBlue[600], borderRadius: 4 },
  barraPienoOro: { backgroundColor: colors.accent },
  barraN: { width: 48, textAlign: 'right', color: colors.textPrimary, fontSize: 13, fontWeight: '600' },

  fasi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fasePillola: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 96,
  },
  fasePillolaN: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  fasePillolaT: { fontSize: 11, color: colors.textTertiary },

  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rData: { width: 88, color: colors.textTertiary, fontSize: 12 },
  rTorneo: { width: 190, color: colors.textPrimary, fontSize: 13 },
  rFase: { width: 104, color: colors.textTertiary, fontSize: 12 },
  rFaseVertice: { color: colors.accent, fontWeight: '700' },
  rRuolo: { width: 24, color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  rSquadre: { flex: 1, color: colors.textSecondary, fontSize: 13 },
  rPunti: { width: 44, textAlign: 'right', color: colors.textPrimary, fontSize: 13 },

  nota: { marginTop: spacing.md, fontSize: 12, color: colors.textTertiary, lineHeight: 17 },
  vuotoTitolo: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  vuotoTesto: { color: colors.textSecondary, textAlign: 'center', maxWidth: 420 },
  bottone: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius,
  },
  testoBottone: { color: colors.onPrimary, fontWeight: '600' },
});
