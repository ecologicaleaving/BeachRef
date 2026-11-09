/** Open Google registration. Legacy ?invito links remain valid and need no code. */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components/Typography/Text';
import { colors, spacing } from '../theme/tokens';
import { completaRitorno, entraConGoogle, esci, statoAccesso, type StatoAccesso } from '../services/auth/AccessService';

export default function Iscrizione() {
  const [stato, setStato] = useState<StatoAccesso | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const aggiorna = useCallback(async () => {
    try {
      const prossimo = await statoAccesso();
      setStato(prossimo);
      if (prossimo.stato === 'autorizzato') router.replace('/referee-stats-lab');
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const guasto = await completaRitorno();
        if (guasto) setErrore(guasto);
      } catch (e) {
        setErrore(e instanceof Error ? e.message : String(e));
      } finally {
        await aggiorna();
      }
    })();
  }, [aggiorna]);

  const entra = async () => {
    setErrore(null);
    setInCorso(true);
    try {
      await entraConGoogle('/iscrizione');
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setInCorso(false);
    }
  };

  if (!stato && !errore) {
    return <View style={stili.centro}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={stili.centro}>
      <View style={stili.riquadro}>
        <Text style={stili.titolo}>Create account</Text>
        <Text style={stili.sottotitolo}>BeachRef referee statistics</Text>
        <Text style={[stili.nota, stili.introduzione]}>Sign up with Google to view career and season statistics. Registration is open to everyone.</Text>

        {stato?.stato === 'non_configurato' && <Text style={stili.errore}>{stato.dettaglio}</Text>}
        {stato?.stato === 'anonimo' && (
          <Pressable style={[stili.bottone, inCorso && stili.bottoneSpento]} onPress={entra} disabled={inCorso}>
            <Text style={stili.testoBottone}>{inCorso ? 'Opening Google…' : 'Sign up with Google'}</Text>
          </Pressable>
        )}
        {stato?.stato === 'autorizzato' && <Text style={stili.ok}>Opening statistics…</Text>}
        {stato?.stato === 'autenticato_non_autorizzato' && (
          <>
            <Text style={stili.errore}>You are signed in as {stato.email ?? 'a Google user'}. Statistics are temporarily unavailable. Please try again in a moment.</Text>
            <Pressable style={stili.bottoneChiaro} onPress={async () => { await esci(); await aggiorna(); }}>
              <Text style={stili.testoBottoneChiaro}>Use another account</Text>
            </Pressable>
          </>
        )}
        {(!stato || stato.stato === 'autenticato_non_autorizzato') && (
          <Pressable style={stili.bottoneChiaro} onPress={aggiorna}>
            <Text style={stili.testoBottoneChiaro}>Try again</Text>
          </Pressable>
        )}
        <Pressable style={stili.bottoneChiaro} onPress={() => router.push('/accedi')}>
          <Text style={stili.testoBottoneChiaro}>Already have an account? Sign in</Text>
        </Pressable>
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
  introduzione: { marginTop: 0, marginBottom: spacing.lg },
  nota: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  errore: { color: colors.error, marginTop: spacing.md },
});
