/**
 * Iscrizione su invito (issue #97).
 *
 * NON e' collegata da nessuna parte, e non deve esserlo: si arriva qui solo
 * con l'indirizzo, che Davide manda alle persone scelte.
 *
 *   /iscrizione?invito=<codice>
 *
 * Il codice non e' una password — viaggia in chiaro nel link, come deve.
 * Serve a limitare CHI puo' iscriversi: un indirizzo che circola senza codice
 * non apre niente, ogni codice e' revocabile, e si sa a chi era stato dato.
 *
 * Senza il codice, il segreto dell'URL sarebbe l'intero controllo d'accesso:
 * chi lo inoltra autorizza qualcun altro, e chi lo trova in una cronologia
 * condivisa si iscrive da solo.
 *
 * Tutta la validazione sta in `redeem_invite()` (migration 028): scadenza,
 * revoca, usi residui e il lock contro due iscrizioni simultanee. Qui non si
 * controlla nulla, perche' un controllo nel browser si aggira aprendo la
 * console.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../components/Typography/Text';
import { colors, spacing } from '../theme/tokens';
import {
  completaRitorno,
  entraConGoogle,
  esci,
  iscriviti,
  statoAccesso,
  type StatoAccesso,
} from '../services/auth/AccessService';

export default function Iscrizione() {
  const parametri = useLocalSearchParams<{ invito?: string }>();
  const [codice, setCodice] = useState('');
  const [stato, setStato] = useState<StatoAccesso | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    if (typeof parametri.invito === 'string') setCodice(parametri.invito);
  }, [parametri.invito]);

  const aggiorna = useCallback(async () => {
    try {
      setStato(await statoAccesso());
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Prima si chiude il giro su Google, poi si guarda chi siamo: al
      // contrario, la sessione non esisterebbe ancora e la pagina direbbe
      // "anonimo" a chi ha appena fatto l'accesso — che e' esattamente il
      // sintomo osservato al primo tentativo reale.
      const guasto = await completaRitorno();
      if (guasto) setErrore(guasto);
      await aggiorna();
    })();
  }, [aggiorna]);

  const entra = async () => {
    setErrore(null);
    setInCorso(true);
    try {
      // Il codice torna dall'indirizzo dopo il giro su Google, quindi va
      // rimesso nel link di ritorno: la sessione lo perderebbe.
      const q = codice ? `?invito=${encodeURIComponent(codice)}` : '';
      await entraConGoogle(`/iscrizione${q}`);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
      setInCorso(false);
    }
  };

  const riscatta = async () => {
    setErrore(null);
    setEsito(null);
    setInCorso(true);
    try {
      const r = await iscriviti(codice.trim());
      setEsito(r.motivo);
      if (r.ok) await aggiorna();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setInCorso(false);
    }
  };

  if (!stato) {
    return (
      <View style={stili.centro}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={stili.centro}>
      <View style={stili.riquadro}>
        <Text style={stili.titolo}>Iscrizione</Text>
        <Text style={stili.sottotitolo}>Statistiche arbitri BeachRef</Text>

        {stato.stato === 'non_configurato' && <Text style={stili.errore}>{stato.dettaglio}</Text>}

        {stato.stato === 'autorizzato' && (
          <>
            <Text style={stili.ok}>Sei iscritto.</Text>
            <Text style={stili.nota}>{stato.email}</Text>
            <Pressable style={stili.bottone} onPress={() => router.push('/referee-stats-lab')}>
              <Text style={stili.testoBottone}>Vai alle statistiche</Text>
            </Pressable>
          </>
        )}

        {stato.stato !== 'autorizzato' && stato.stato !== 'non_configurato' && (
          <>
            <Text style={stili.etichetta}>Codice di invito</Text>
            <TextInput
              style={stili.campo}
              value={codice}
              onChangeText={setCodice}
              placeholder="il codice che hai ricevuto"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
            />

            {stato.stato === 'anonimo' ? (
              <>
                <Pressable
                  style={[stili.bottone, !codice.trim() && stili.bottoneSpento]}
                  onPress={entra}
                  disabled={inCorso || !codice.trim()}
                >
                  <Text style={stili.testoBottone}>
                    {inCorso ? 'Apro Google…' : 'Continua con Google'}
                  </Text>
                </Pressable>
                <Text style={stili.nota}>
                  Serve un account Google. Dopo l&apos;accesso il codice viene verificato.
                </Text>
              </>
            ) : (
              <>
                <Text style={stili.nota}>
                  Accesso fatto come {stato.email}. Manca solo il codice.
                </Text>
                <Pressable
                  style={[stili.bottone, !codice.trim() && stili.bottoneSpento]}
                  onPress={riscatta}
                  disabled={inCorso || !codice.trim()}
                >
                  <Text style={stili.testoBottone}>
                    {inCorso ? 'Verifico…' : 'Iscrivimi'}
                  </Text>
                </Pressable>
                <Pressable style={stili.bottoneChiaro} onPress={async () => { await esci(); await aggiorna(); }}>
                  <Text style={stili.testoBottoneChiaro}>Usa un altro account</Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {esito && <Text style={stili.esito}>{esito}</Text>}
        {errore && <Text style={stili.errore}>{errore}</Text>}
      </View>
    </ScrollView>
  );
}

const stili = StyleSheet.create({
  centro: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  riquadro: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  titolo: { fontSize: 26, fontWeight: '700', color: colors.textPrimary },
  sottotitolo: { color: colors.textSecondary, marginBottom: spacing.xl },
  etichetta: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.xs },
  campo: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  bottone: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius,
    alignItems: 'center',
  },
  bottoneSpento: { opacity: 0.4 },
  testoBottone: { color: colors.onPrimary, fontWeight: '600', fontSize: 16 },
  bottoneChiaro: { marginTop: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' },
  testoBottoneChiaro: { color: colors.textSecondary },
  ok: { color: colors.success, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  esito: { color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' },
  nota: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  errore: { color: colors.error, marginTop: spacing.md },
});
