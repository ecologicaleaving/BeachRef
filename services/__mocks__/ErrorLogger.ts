/**
 * Mock manuale di `ErrorLogger` (issue #94).
 *
 * ## Perche' non basta l'automock
 *
 * Tre suite scrivono `jest.mock('.../ErrorLogger')` senza fabbrica. Su una
 * classe normale l'automock funziona: ogni metodo diventa una `jest.fn()`. Su
 * un **singleton** no — `ErrorLogger.getInstance()` diventa anch'essa una
 * `jest.fn()` che restituisce `undefined`, quindi:
 *
 *     this.errorLogger = ErrorLogger.getInstance();   // undefined
 *     await this.errorLogger.logError({ ... });       // TypeError
 *
 * Il guasto e' invisibile finche' non passa da un `catch`, e allora sostituisce
 * l'errore vero con "Cannot read properties of undefined (reading 'logError')".
 * Dieci fallimenti nella suite venivano da qui, e nessuno di quei dieci
 * mostrava il problema che il test stava davvero cercando.
 *
 * E' la stessa famiglia dei mock che mentono gia' incontrata in questa issue:
 * un doppio che dichiara di esistere e non regge la forma dell'originale.
 *
 * Questo file lo ripara per tutti: `jest.mock()` senza fabbrica preferisce il
 * mock manuale in `__mocks__/` all'automock, quindi le tre suite non cambiano
 * di una riga.
 */

export interface ErrorLogPayload {
  entity_type?: string;
  error?: Error;
  context?: Record<string, unknown>;
  [k: string]: unknown;
}

/** L'istanza restituita da `getInstance()`, condivisa come nell'originale. */
const istanza = {
  logError: jest.fn().mockResolvedValue(undefined),
  logWarning: jest.fn().mockResolvedValue(undefined),
  logInfo: jest.fn().mockResolvedValue(undefined),
  getErrors: jest.fn().mockReturnValue([]),
  clearErrors: jest.fn(),
};

export class ErrorLogger {
  static getInstance() {
    return istanza;
  }

  // Le suite che costruiscono un logger invece di chiedere il singleton
  // devono ottenere lo stesso doppio, altrimenti asserire su `logError`
  // darebbe risultati diversi a seconda di come e' stato ottenuto.
  logError = istanza.logError;
  logWarning = istanza.logWarning;
  logInfo = istanza.logInfo;
  getErrors = istanza.getErrors;
  clearErrors = istanza.clearErrors;
}

/** Per i test che vogliono asserire sulle chiamate senza passare dalla classe. */
export const __istanzaMock = istanza;

export default ErrorLogger;
