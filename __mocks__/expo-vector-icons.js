/**
 * Stub per `@expo/vector-icons/*` sotto jest (issue #94).
 *
 * Ogni set di icone di `@expo/vector-icons` passa da `expo-modules-core`, che
 * sotto jest non ha il runtime nativo: il primo import esplode con
 * `TypeError: Cannot read properties of undefined (reading 'NativeModule')`, e
 * porta giu' l'INTERA suite che lo importa — non un test, tutta la suite.
 *
 * Colpisce chiunque importi `components/Icons/vectorIconSets`, cioe' in pratica
 * ogni componente che disegna un'icona.
 *
 * Lo stub e' fedele al comportamento che conta: sul web i tre wrapper di questo
 * progetto ramificano gia' su `Platform.OS === 'web'` e disegnano una glifo
 * testuale invece del font (vedi `vectorIconSets.web.ts` e la sezione "Web
 * bundle weight" in CLAUDE.md), quindi un componente sostitutivo che accetta
 * `name`/`size`/`color` e non renderizza nulla di nativo non toglie nulla a
 * cio' che i test verificano.
 *
 * Registrato in `jest.config.js` via `moduleNameMapper`, non con un
 * `jest.mock` nei singoli file: vedi TESTING.md regola 2.
 */
const React = require('react');

function makeIconSet(displayName) {
  const Icon = props => React.createElement('Icon', { ...props, testID: props.testID || displayName });
  Icon.displayName = displayName;
  // I set veri espongono questi statici; alcuni componenti li interrogano.
  Icon.getImageSource = () => Promise.resolve({ uri: '', width: 0, height: 0 });
  Icon.getImageSourceSync = () => ({ uri: '', width: 0, height: 0 });
  Icon.loadFont = () => Promise.resolve();
  Icon.font = {};
  return Icon;
}

const SETS = [
  'Feather', 'Ionicons', 'MaterialCommunityIcons', 'MaterialIcons',
  'FontAwesome', 'FontAwesome5', 'FontAwesome6', 'AntDesign', 'Entypo',
  'EvilIcons', 'Foundation', 'Octicons', 'SimpleLineIcons', 'Zocial',
];

const mock = { __esModule: true };
for (const name of SETS) mock[name] = makeIconSet(name);

// `@expo/vector-icons/<Set>` espone il set come default export; il barrel
// `@expo/vector-icons` li espone tutti per nome. Questo modulo copre entrambi.
//
// Limite noto e accettato: `moduleNameMapper` manda OGNI sottopercorso a questo
// stesso file, quindi il default export non sa quale set gli e' stato chiesto e
// vale `Icon` per tutti. Poiche' i set sono stub identici, l'unica cosa che si
// perde e' il `displayName` sul default import. Se un giorno un test dovesse
// distinguere un set dall'altro, servira' un file per set — non un mock piu'
// furbo.
mock.default = makeIconSet('Icon');
mock.createIconSet = () => makeIconSet('CustomIconSet');
mock.createIconSetFromFontello = () => makeIconSet('FontelloIconSet');
mock.createIconSetFromIcoMoon = () => makeIconSet('IcoMoonIconSet');

module.exports = mock;
