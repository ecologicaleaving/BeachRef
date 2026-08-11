/**
 * Accesso (issue #97).
 *
 * Un bottone solo: Google. **Nessun bottone di iscrizione**, di proposito —
 * ci si iscrive da `/iscrizione`, che non e' collegata da nessuna parte e il
 * cui indirizzo viene mandato a mano.
 *
 * Chi arriva qui senza essere stato invitato si autentica benissimo e non vede
 * niente: e' la distinzione fra "chi sei" e "se puoi", e la decide il database
 * (vedi migration 028).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components/Typography/Text';
import { colors, spacing } from '../theme/tokens';
import {
  completaRitorno,
  entraConGoogle,
  esci,
  statoAccesso,
  type StatoAccesso,
} from '../services/auth/AccessService';

export default function Accedi() {
  const [stato, setStato] = useState<StatoAccesso | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

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
      // Non c'e' nulla dopo: il browser se ne va su Google e torna qui.
      await entraConGoogle('/accedi');
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
      setInCorso(false);
    }
  };

  const disconnetti = async () => {
    await esci();
    await aggiorna();
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
        <Text style={stili.titolo}>BeachRef</Text>
        <Text style={stili.sottotitolo}>Statistiche arbitri</Text>

        {stato.stato === 'non_configurato' && (
          <Text style={stili.errore}>{stato.dettaglio}</Text>
        )}

        {stato.stato === 'anonimo' && (
          <>
            <Pressable style={stili.bottone} onPress={entra} disabled={inCorso}>
              <Text style={stili.testoBottone}>
                {inCorso ? 'Apro Google…' : 'Accedi con Google'}
              </Text>
            </Pressable>
            <Text style={stili.nota}>
              L&apos;accesso è riservato. Se non hai ancora un account, serve un invito.
            </Text>
          </>
        )}

        {stato.stato === 'autenticato_non_autorizzato' && (
          <>
            <Text style={stili.rifiuto}>Questo account non è abilitato.</Text>
            <Text style={stili.nota}>
              {stato.email ?? 'Account'} ha fatto l&apos;accesso, ma non è fra le persone
              autorizzate a vedere le statistiche. Serve un invito.
            </Text>
            <Pressable style={stili.bottoneChiaro} onPress={disconnetti}>
              <Text style={stili.testoBottoneChiaro}>Esci</Text>
            </Pressable>
          </>
        )}

        {stato.stato === 'autorizzato' && (
          <>
            <Text style={stili.benvenuto}>Ciao {stato.nome ?? stato.email}</Text>
            <Pressable
              style={stili.bottone}
              onPress={() => router.push('/referee-stats-lab')}
            >
              <Text style={stili.testoBottone}>Vai alle statistiche</Text>
            </Pressable>
            <Pressable style={stili.bottoneChiaro} onPress={disconnetti}>
              <Text style={stili.testoBottoneChiaro}>Esci</Text>
            </Pressable>
          </>
        )}

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
    alignItems: 'center',
  },
  titolo: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  sottotitolo: { color: colors.textSecondary, marginBottom: spacing.xl },
  benvenuto: { color: colors.textPrimary, fontSize: 18, marginBottom: spacing.lg },
  rifiuto: { color: colors.error, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  bottone: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius,
    minWidth: 240,
    alignItems: 'center',
  },
  testoBottone: { color: colors.onPrimary, fontWeight: '600', fontSize: 16 },
  bottoneChiaro: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  testoBottoneChiaro: { color: colors.textSecondary },
  nota: {
    color: colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  errore: { color: colors.error, marginTop: spacing.md, textAlign: 'center' },
});
