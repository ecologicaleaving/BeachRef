export interface Tournament {
  No: string;
  Name?: string;
  Title?: string;
  City?: string;
  Country?: string;
  CountryName?: string;
  Location?: string;
  StartDate?: string;
  EndDate?: string;
  Dates?: string;
  Version?: string;
  Code?: string;
  Status?: string;
  // Additional detail fields
  Type?: string;
  Category?: string;
  Series?: string;
  League?: string;
  Division?: string;
  Prize?: string;
  PrizeMoney?: string;
  Currency?: string;
  Venue?: string;
  Courts?: string;
  ContactName?: string;
  ContactEmail?: string;
  ContactPhone?: string;
  Website?: string;
  Description?: string;
  Officials?: string;
  Referees?: string;
  TechnicalOfficials?: string;
  EntryDeadline?: string;
  WithdrawalDeadline?: string;
  Participants?: string;
  Teams?: string;
  MaxTeams?: string;
  EntryFee?: string;
  Surface?: string;
  Gender?: string;
  
  // GetBeachTournament specific fields
  CountryCode?: string;
  Address?: string;
  
  // Tournament dates (detailed)
  StartDateQualification?: string;
  StartDateMainDraw?: string;
  EndDateQualification?: string;
  EndDateMainDraw?: string;
  
  // Tournament structure
  NbTeamsQualification?: string;
  NbTeamsFromQualification?: string;
  NbTeamsMainDraw?: string;
  NbWildCards?: string;
  
  // Organization details
  FederationCode?: string;
  OrganizerCode?: string;
  OrganizerType?: string;
  Season?: string;
  
  // Officials and functions
  AuxiliaryPersons?: string;
  OfficialFunctions?: string;
  Officials?: string;
  Referees?: string;
  TechnicalOfficials?: string;
  MatchOfficials?: string;
  EventOfficialFunctions?: string;
  
  // Event relationship
  NoEvent?: string;
  EventNo?: string; 
  ParentEvent?: string;
  
  // Event information
  InfoSchedule?: string;
  InfoLocation?: string;
  
  // Tournament flags
  HasVolleyTournament?: boolean;
  HasBeachTournament?: boolean;
  
  // Additional metadata
  WebSite?: string;
  BuyTicketsUrl?: string;
  IsFreeEntrance?: boolean;
  IsVisManaged?: boolean;
  
  // Technical settings
  DefaultTimeZone?: string;
  DefaultLocalTimeOffset?: string;
  MatchPointsMethod?: string;
  DefaultMatchFormat?: string;
  // Internal field for tracking merged tournaments during deduplication
  _mergedTournaments?: Array<{
    No: string;
    Name?: string;
    Code?: string;
    StartDate?: string;
    EndDate?: string;
  }>;
}

export interface TournamentListResponse {
  Response: {
    Type: string;
    TournamentList: {
      Count: string;
      Tournament: Tournament[];
    };
  };
}