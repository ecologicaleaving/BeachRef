import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform, RefreshControl } from 'react-native';
import TournamentSelectionScreen from '../../screens/TournamentSelectionScreen';
import { VisApiClient } from '../../services/api/VisApiClient';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../../components/navigation/NavigationHeader', () => () => null);
jest.mock('../../components/Icons/MaterialCommunityIcons', () => ({ Icon: () => null }));
jest.mock('../../components/tournament/TournamentLoadingSkeleton', () => ({
  TournamentLoadingSkeleton: () => null,
}));
jest.mock('../../components/entities/Tournament', () => ({
  TournamentCard: ({ tournament }: { tournament: { name: string } }) => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return React.createElement(Text, null, tournament.name);
  },
}));
jest.mock('../../services/api/VisApiClient', () => ({ VisApiClient: jest.fn() }));

const originalPlatform = Platform.OS;
const getEventList = jest.fn();
const getBeachTournament = jest.fn();
const eventsXml = `<Events>
  <Event No="1" Name="BPT Current" StartDate="2026-11-01" EndDate="2026-11-03" />
  <Event No="2" Name="BPT Dubai 2027" StartDate="2027-01-10" EndDate="2027-01-15" />
  <Event No="3" Name="BPT Future 2028" StartDate="2028-02-10" EndDate="2028-02-15" />
  <Event No="4" Name="BPT Invalid" StartDate="invalid-date" EndDate="invalid-date" />
  <Event No="5" Name="BPT Old" StartDate="2000-01-10" EndDate="2000-01-15" />
</Events>`;

beforeEach(() => {
  // Exercise the webapp branch, which does not use native sticky headers.
  Platform.OS = 'web';
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-08T12:00:00Z'));
  getEventList.mockReset().mockResolvedValue({ success: true, xmlData: eventsXml });
  getBeachTournament.mockReset().mockResolvedValue({ success: false });
  (VisApiClient as jest.Mock).mockImplementation(() => ({ getEventList, getBeachTournament }));
});

afterEach(() => {
  Platform.OS = originalPlatform;
  jest.clearAllTimers();
  jest.useRealTimers();
});

it('shows future seasons in descending order before the calendar year changes', async () => {
  const screen = render(React.createElement(TournamentSelectionScreen));
  await waitFor(() => expect(screen.getByText('Season 2027')).toBeTruthy());
  expect(screen.getAllByText(/^Season /).map(node => node.props.children))
    .toEqual(['Season 2028', 'Season 2027', 'Season 2026']);
  expect(screen.queryByText('Season NaN')).toBeNull();
  expect(screen.queryByText('Season 2000')).toBeNull();
  fireEvent.press(screen.getByText('Season 2027'));
  fireEvent.press(screen.getByText('January'));
  expect(screen.getByText('BPT Dubai 2027')).toBeTruthy();
  fireEvent.press(screen.getByText('Season 2028'));
  fireEvent.press(screen.getByText('February'));
  expect(screen.getByText('BPT Future 2028')).toBeTruthy();
  screen.unmount();
});

it('keeps future seasons available after refreshing', async () => {
  getEventList.mockImplementation(async request => ({
    success: true,
    xmlData: request.endDate ? '<Events />' : eventsXml,
  }));
  const screen = render(React.createElement(TournamentSelectionScreen));
  await waitFor(() => expect(getEventList).toHaveBeenCalledTimes(1));
  await act(async () => {
    await screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
  });
  expect(getEventList).toHaveBeenCalledTimes(2);
  expect(getEventList.mock.calls[1]?.[0]).toEqual(getEventList.mock.calls[0]?.[0]);
  expect(screen.getByText('Season 2027')).toBeTruthy();
  screen.unmount();
});

it('retries without narrowing the request to the current calendar year', async () => {
  getEventList.mockRejectedValueOnce(new Error('Network request failed'));
  const screen = render(React.createElement(TournamentSelectionScreen));
  await waitFor(() => expect(screen.getByText('Try Again')).toBeTruthy());
  fireEvent.press(screen.getByText('Try Again'));
  await waitFor(() => expect(getEventList).toHaveBeenCalledTimes(2));
  expect(getEventList.mock.calls[1]?.[0]).toEqual(getEventList.mock.calls[0]?.[0]);
  await waitFor(() => expect(screen.getByText('Season 2027')).toBeTruthy());
  screen.unmount();
});

it('expands the current season and month when the calendar reaches a formerly excluded year', async () => {
  jest.setSystemTime(new Date('2027-01-08T12:00:00Z'));
  const screen = render(React.createElement(TournamentSelectionScreen));
  await waitFor(() => expect(screen.getByText('BPT Dubai 2027')).toBeTruthy());
  screen.unmount();
});
