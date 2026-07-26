/**
 * Handle restituito da setTimeout / setInterval.
 *
 * Perche' esiste questo tipo (issue #49)
 * -------------------------------------
 * 30 file annotavano i propri handle di timer come `NodeJS`.`Timeout`, che e' il
 * tipo del runtime Node. Su React Native e sul web `setTimeout`/`setInterval`
 * restituiscono un `number`, quindi ogni assegnamento
 *
 *     this.timer = setTimeout(...)          // number
 *     private timer: NodeJS.Timeout         // oggetto Node
 *
 * produceva un TS2322 (30 in totale). L'annotazione era semplicemente sbagliata
 * per la piattaforma su cui gira l'app: non un errore del compilatore da mettere
 * a tacere, ma un tipo da correggere alla radice.
 *
 * `ReturnType<typeof setTimeout>` si adatta da solo alla piattaforma (number sul
 * web/RN, Timeout su Node quando girano i test), quindi resta corretto in
 * entrambi i contesti senza `any` ne' cast.
 *
 * Dichiarato globale di proposito: e' una primitiva di piattaforma usata in modo
 * trasversale, esattamente come `JSX`. Evita 26 import identici e mantiene la
 * sostituzione puramente meccanica.
 */
declare global {
  type TimerHandle = ReturnType<typeof setTimeout>;
  type IntervalHandle = ReturnType<typeof setInterval>;
}

export {};
