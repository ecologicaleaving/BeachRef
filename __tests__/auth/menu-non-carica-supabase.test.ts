/**
 * Il menu non deve trascinare Supabase nel chunk d'ingresso (issue #103).
 *
 * `@supabase/supabase-js` arriva con un `import()` dinamico apposta: "il costo
 * lo paga solo chi apre `/accedi` o `/iscrizione`" (commento in testa ad
 * `AccessService`, e sezione "Web bundle weight" in CLAUDE.md).
 *
 * Il menu laterale sta su OGNI pagina. La tentazione naturale, mostrando una
 * voce "Stats" a chi e' loggato, e' chiedere lo stato ad `AccessService.
 * statoAccesso()` — che costruisce il client, quindi risolve quell'`import()`,
 * quindi consegna l'SDK a ogni visitatore, loggato o no. La regressione non
 * darebbe nessun test rosso e nessun errore: solo un bundle piu' pesante per
 * tutti. Per questo la barriera e' qui.
 *
 * Cio' che viene congelato:
 *   1. i moduli che il menu importa STATICAMENTE per l'accesso non nominano
 *      l'SDK se non come tipo o dentro un `import()`;
 *   2. il menu non chiama `statoAccesso()`.
 */

import * as fs from 'fs';
import * as path from 'path';

const RADICE = path.resolve(__dirname, '..', '..');

const leggi = (relativo: string): string =>
  fs.readFileSync(path.join(RADICE, relativo), 'utf8');

/**
 * Il codice senza le note. Le barriere di questo file cercano nomi che i
 * commenti CITANO di proposito — `statoAccesso`, `/iscrizione` — per spiegare
 * perche' non vanno usati. Cercandoli nel sorgente grezzo, la spiegazione
 * stessa farebbe fallire il test, e l'unico rimedio sarebbe togliere la
 * spiegazione.
 */
const senzaCommenti = (sorgente: string): string =>
  sorgente
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(riga => !riga.trim().startsWith('//'))
    .join('\n');

/**
 * Occorrenze di `@supabase/supabase-js` che finirebbero nel bundle: si
 * escludono i commenti, gli `import type` e gli `import()` dinamici.
 */
function importiStatici(sorgente: string): string[] {
  return sorgente
    .split('\n')
    .map(riga => riga.trim())
    .filter(riga => riga.includes('@supabase/supabase-js'))
    .filter(riga => !riga.startsWith('*') && !riga.startsWith('//') && !riga.startsWith('/*'))
    .filter(riga => !riga.startsWith('import type'))
    .filter(riga => !riga.includes('import('));
}

describe('il menu laterale non carica Supabase', () => {
  const moduliStatici = [
    'components/navigation/GmailStyleSideMenu.tsx',
    'hooks/useAccessoRicordato.ts',
    'services/auth/statoRicordato.ts',
    'services/auth/AccessService.ts',
  ];

  it.each(moduliStatici)('%s non importa staticamente @supabase/supabase-js', file => {
    expect(importiStatici(leggi(file))).toEqual([]);
  });

  it('il menu non chiede lo stato ad AccessService', () => {
    const menu = leggi('components/navigation/GmailStyleSideMenu.tsx');

    // `esci` va bene: e' un riferimento a funzione, e il client arriva solo se
    // qualcuno preme il bottone. `statoAccesso` no: verrebbe chiamata al
    // montaggio, cioe' su ogni pagina.
    expect(senzaCommenti(menu)).not.toContain('statoAccesso');
  });

  it('il menu legge lo stato dalla copia locale', () => {
    const menu = leggi('components/navigation/GmailStyleSideMenu.tsx');
    expect(menu).toContain('useAccessoRicordato');
  });

  it('AccessService continua a caricare il client con un import dinamico', () => {
    const servizio = leggi('services/auth/AccessService.ts');
    expect(servizio).toContain("import('@supabase/supabase-js')");
  });
});

describe('nessun ingresso verso l\'iscrizione', () => {
  it('il menu non collega /iscrizione', () => {
    // Ci si iscrive solo con un indirizzo mandato a mano: autenticarsi con
    // Google e' alla portata di chiunque, l'autorizzazione e' un invito.
    expect(senzaCommenti(leggi('components/navigation/GmailStyleSideMenu.tsx'))).not.toContain('/iscrizione');
  });
});
