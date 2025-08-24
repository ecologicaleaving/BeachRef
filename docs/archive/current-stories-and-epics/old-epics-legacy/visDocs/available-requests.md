# Available Requests

### Public Data Requests (No Authentication Required)

| Request Type | Description | Returns |
|--------------|-------------|---------|
| `GetServiceInformation` | Service version and status | Service metadata |
| `GetTournamentList` | List of tournaments | Tournament IDs and metadata |
| `GetPlayerList` | List of players | Player IDs and metadata |
| `GetMatchList` | List of matches | Match IDs and metadata |
| `GetEventList` | List of events | Event IDs and metadata |

### Authenticated Requests (Detailed Data)

#### Tournament Requests
| Request Type | Description | Authentication Required |
|--------------|-------------|------------------------|
| `GetTournament` | Full tournament details | Yes |
| `GetTournamentInfo` | Tournament information | Yes |
| `GetTournamentRanking` | Tournament rankings | Yes |

#### Beach Volleyball Requests
| Request Type | Description | JSON Support |
|--------------|-------------|--------------|
| `GetBeachTournament` | Beach tournament details | Yes |
| `GetBeachMatch` | Beach match details | Yes |
| `GetBeachMatchList` | Beach match list | Yes |
| `GetBeachTeam` | Beach team information | Yes |
| `GetBeachRound` | Beach round information | Yes |
| `GetBeachWorldTourRanking` | World Tour rankings | Yes |

#### Volleyball Requests
| Request Type | Description | JSON Support |
|--------------|-------------|--------------|
| `GetMatch` | Match details | Yes |
| `GetMatchList` | Match list with filters | Yes |
| `GetPlayer` | Player details | Yes |
| `GetTeam` | Team information | Yes |
| `GetPool` | Pool/group information | Yes |
| `GetPlayersRanking` | Player rankings | Yes |

#### Media Requests
| Request Type | Description | JSON Support |
|--------------|-------------|--------------|
| `GetArticle` | News articles | Yes |
| `GetPressRelease` | Press releases | Yes |
| `GetImage` | Images and media | No |

#### Live Data Requests
| Request Type | Description | Authentication Required |
|--------------|-------------|------------------------|
| `GetLiveMatches` | Live match data | Yes |
| `GetRecentMatches` | Recent match results | Yes |
| `UploadVolleyLive` | Upload live data | Yes |

---
