/** English presentation labels for raw database values. Never use these as query keys. */
const CATEGORY_LABELS: Record<string, string> = {
  'Giochi Olimpici': 'Olympic Games',
  'Campionati del Mondo': 'World Championships',
  'Campionati continentali': 'Continental Championships',
  'Qualificazione olimpica': 'Olympic Qualification',
  'Mondiali U21': 'U21 World Championships',
  'Mondiali U19': 'U19 World Championships',
  'Mondiali U18': 'U18 World Championships',
  'Qualificazione giovanile': 'Youth Qualification',
  'Zonale': 'Zonal',
  'Tour nazionale': 'National Tour',
  'Giochi multisport': 'Multisport Games',
  'Test / formazione': 'Test / Training',
  'World Tour 1 stella': 'World Tour 1 star',
  'World Tour 2 stelle': 'World Tour 2 stars',
  'World Tour 3 stelle': 'World Tour 3 stars',
  'World Tour 4 stelle': 'World Tour 4 stars',
  'World Tour 5 stelle': 'World Tour 5 stars',
  'Altro': 'Other',
};

const PHASE_LABELS: Record<string, string> = {
  'Finale': 'Final',
  'Finale 3o posto': 'Bronze medal match',
  'Semifinale': 'Semifinal',
  'Quarti': 'Quarterfinal',
  'Ottavi': 'Round of 16',
  'Sedicesimi': 'Round of 32',
  'Tabellone': 'Main draw',
  'Pool': 'Pool',
  'Turno preliminare': 'Preliminary round',
  'Quota nazionale': 'Country quota',
  'Piazzamento': 'Placement',
  'Altro': 'Other',
  'Senza fase': 'No round',
};

const INVITATION_LABELS: Record<string, string> = {
  'non autenticato': 'Sign in before using an invitation code.',
  'gia iscritto': 'You are already registered.',
  'codice inesistente': 'Invitation code not found.',
  'codice revocato': 'This invitation code has been revoked.',
  'codice scaduto': 'This invitation code has expired.',
  'codice gia utilizzato': 'This invitation code has already been used.',
  'iscritto': 'You are registered.',
};

export function categoryLabel(value: string | null | undefined): string {
  return value ? (Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, value) ? CATEGORY_LABELS[value]! : value) : 'Other';
}

/** Compact labels for narrow statistics columns. */
export function shortCategoryLabel(value: string): string {
  return categoryLabel(value)
    .replace('BPT ', '')
    .replace('World Championships', 'World Champs')
    .replace('Continental Championships', 'Cont. Champs')
    .replace('Continental ', 'Cont. ')
    .replace('Qualification', 'Qual.')
    .replace('Multisport Games', 'Multisport');
}

export function phaseLabel(value: string | null | undefined): string {
  return value ? (Object.prototype.hasOwnProperty.call(PHASE_LABELS, value) ? PHASE_LABELS[value]! : value) : '—';
}

export function invitationReasonLabel(value: string | null | undefined): string {
  return value && Object.prototype.hasOwnProperty.call(INVITATION_LABELS, value)
    ? INVITATION_LABELS[value]!
    : 'Unable to verify the invitation code. Please try again.';
}
