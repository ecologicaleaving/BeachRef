/**
 * La copia locale dello stato di accesso (issue #103).
 *
 * Serve al menu per sapere quali voci mostrare senza caricare Supabase. Non e'
 * un controllo di autorizzazione — quello vive in `is_authorized` sul database
 * — e i test qui sotto lo dicono esplicitamente, perche' la tentazione di
 * appoggiarci una decisione di accesso e' la sola cosa che renderebbe questo
 * file pericoloso.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { dimentica, ricorda, statoRicordato } from '../../services/auth/statoRicordato';

describe('statoRicordato', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('non sa niente finche nessuno ha ricordato', async () => {
    // `null` non e' "anonimo": e' "non l'ho ancora chiesto a nessuno". Il menu
    // ripiega sulla voce di accesso, che e' il comportamento giusto per un
    // visitatore appena arrivato.
    expect(await statoRicordato()).toBeNull();
  });

  it('ricorda un accesso autorizzato', async () => {
    await ricorda({ stato: 'autorizzato', email: 'arbitro@example.com', nome: 'Arbitro' });

    expect(await statoRicordato()).toEqual({
      stato: 'autorizzato',
      email: 'arbitro@example.com',
    });
  });

  it('distingue autenticato da autorizzato', async () => {
    await ricorda({ stato: 'autenticato_non_autorizzato', email: 'chiunque@example.com' });

    const letto = await statoRicordato();
    expect(letto?.stato).toBe('autenticato_non_autorizzato');
  });

  it('ricorda uno stato senza email senza inventarne una', async () => {
    await ricorda({ stato: 'anonimo' });

    expect(await statoRicordato()).toEqual({ stato: 'anonimo', email: null });
  });

  it('dimentica', async () => {
    await ricorda({ stato: 'autorizzato', email: 'a@b.c', nome: 'A' });
    await dimentica();

    expect(await statoRicordato()).toBeNull();
  });

  it('un contenuto corrotto vale come "non so niente", non come un errore', async () => {
    // Se questa lettura sollevasse, il menu — che sta su ogni pagina — si
    // romperebbe per tutti a causa di una chiave di storage malformata.
    await AsyncStorage.setItem('beachref-accesso-ricordato', 'non-e-json');

    expect(await statoRicordato()).toBeNull();
  });
});
