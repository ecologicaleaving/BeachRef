/**
 * L'ambiente sa montare react-native (issue #101).
 *
 * Questa suite non esamina codice dell'applicazione: esamina la
 * configurazione. Prima della #101 ogni riga qui sotto moriva con
 * `Invariant Violation: __fbBatchedBridgeConfig is not set`, e il danno era
 * distribuito su 14 test sospesi e 28 file `.tsx` esclusi — cioe' era
 * invisibile come causa unica.
 *
 * Serve percio' un posto dove quella causa e' visibile per conto proprio. Se
 * qualcuno tocca `jest.native-modules.js`, `jest.env.js` o i transform, il
 * primo rosso deve comparire qui, con un nome che dice cosa e' successo, e non
 * in una suite a caso fra le 140.
 *
 * L'elenco dei componenti non e' decorativo: `View` e' la radice della catena
 * nativa, `ScrollView` / `ActivityIndicator` / `Text` sono quelli che la #101
 * indicava come da verificare oltre a `View`, e `Modal` e' l'unico che il
 * proxy dei moduli nativi da solo non salva (monta `AppContainer`, che nel
 * ramo di sviluppo legge `window`).
 */

import { render } from '@testing-library/react-native';
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// `React.createElement` invece del JSX: questo file e' un `.ts`, e il transform
// per `.ts` non abilita il parsing JSX. Rinominarlo `.tsx` lo farebbe sparire
// dal run — quelli sono esclusi da `testPathIgnorePatterns`, ed e' proprio
// l'esclusione che questa suite esiste per rendere superflua un giorno.
const e = React.createElement;

describe("l'ambiente jest monta react-native", () => {
  const componenti: [string, () => React.ReactElement][] = [
    ['View', () => e(View, null, e(Text, null, 'contenuto'))],
    ['Text', () => e(Text, null, 'contenuto')],
    ['ScrollView', () => e(ScrollView, null, e(Text, null, 'contenuto'))],
    ['ActivityIndicator', () => e(ActivityIndicator, { size: 'large' })],
    ['TextInput', () => e(TextInput, { value: 'x', onChangeText: () => {} })],
    ['Image', () => e(Image, { source: { uri: 'https://example.test/x.png' } })],
    ['Pressable', () => e(Pressable, { onPress: () => {} }, e(Text, null, 'x'))],
    ['TouchableOpacity', () => e(TouchableOpacity, { onPress: () => {} }, e(Text, null, 'x'))],
    [
      'FlatList',
      () =>
        e(FlatList as React.ComponentType<Record<string, unknown>>, {
          data: [1, 2],
          renderItem: ({ item }: { item: number }) => e(Text, null, String(item)),
          keyExtractor: (item: number) => String(item),
        }),
    ],
    ['Switch', () => e(Switch, { value: true, onValueChange: () => {} })],
    ['Modal', () => e(Modal, { visible: true }, e(Text, null, 'contenuto'))],
    ['Animated.View', () => e(Animated.View, { style: { opacity: 1 } }, e(Text, null, 'x'))],
    [
      'ScrollView + RefreshControl',
      () =>
        e(
          ScrollView,
          { refreshControl: e(RefreshControl, { refreshing: false, onRefresh: () => {} }) },
          e(Text, null, 'contenuto')
        ),
    ],
  ];

  it.each(componenti)('monta %s', (_nome, crea) => {
    expect(render(crea()).toJSON()).toBeTruthy();
  });

  it('rende visibile il testo dentro un albero annidato', () => {
    const { getByText } = render(
      e(View, null, e(ScrollView, null, e(View, null, e(Text, null, 'in fondo all albero'))))
    );

    expect(getByText('in fondo all albero')).toBeTruthy();
  });

  // Due livelli distinti, ed e' il punto di tutta la #101.
  //
  // L'export PUBBLICO di `react-native` e' sostituito da `jest.env.js`, che
  // dichiara `Platform: { OS, select }` e nient'altro — niente `constants`.
  // Quel mock non e' mai stato il problema e non e' mai stato la soluzione:
  // la catena che sollevava l'invariant passa dai moduli INTERNI, che
  // `jest.mock('react-native')` non intercetta.
  //
  // E' li' che il proxy dei moduli nativi lavora, ed e' li' che va verificato.
  it("l'export pubblico di react-native resta quello dichiarato da jest.env.js", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require('react-native');

    expect(Platform.OS).toBe('ios');
  });

  // La versione dichiarata in `MODULE_CONSTANTS.PlatformConstants` e' quella
  // vera del progetto (0.79.5) e non il `major: 1000` del preset ufficiale di
  // react-native: un controllo di versione sotto test deve vedere la RN che
  // c'e', non una inventata.
  it('serve le costanti native al livello interno, dove nasceva l invariant', () => {
    const proxy = (globalThis as { nativeModuleProxy?: Record<string, { getConstants(): Record<string, unknown> }> })
      .nativeModuleProxy;

    expect(proxy).toBeDefined();
    expect(proxy!.PlatformConstants.getConstants().reactNativeVersion).toEqual(
      expect.objectContaining({ major: 0, minor: 79 })
    );
    // `Dimensions.js` dereferenzia questo alla prima importazione: senza,
    // `PixelRatio` muore con "Cannot read properties of undefined".
    expect(proxy!.DeviceInfo.getConstants().Dimensions).toEqual(
      expect.objectContaining({ screen: expect.any(Object), window: expect.any(Object) })
    );
  });

  // Un modulo mai visto prima riceve comunque un metodo utilizzabile, ed e'
  // sempre lo stesso `jest.fn()` a ogni lettura — cosi' un test puo'
  // asserirci sopra invece di trovarsi un mock nuovo a ogni accesso.
  it('inventa i moduli nativi che non conosce, in modo stabile', () => {
    const proxy = (globalThis as { nativeModuleProxy?: Record<string, Record<string, unknown>> })
      .nativeModuleProxy;

    const primo = proxy!.UnModuloCheNonEsiste.unMetodoQualsiasi;
    const secondo = proxy!.UnModuloCheNonEsiste.unMetodoQualsiasi;

    expect(typeof primo).toBe('function');
    expect(primo).toBe(secondo);
  });

  // La ragione per cui il preset ufficiale di react-native non e' adottabile
  // qui: definisce `window`, e almeno cinque moduli di questo codebase
  // deducono di girare su web dalla sua assenza (issue #94). Se un giorno
  // qualcuno lo innesta, questo assert e' il primo a cadere.
  it('non definisce window', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined');
  });
});
