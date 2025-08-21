# Request to get a list of beach volleyball matches

## Request

The syntax for this request is:

**Web service request**
```xml
<Request Type="GetBeachMatchList" Fields="<list of the fields to return>">
  <Filter TournamentNo="<tournament_number>" /> <!-- Required: tournament identifier -->
</Request>
```

### Required Parameters
- **TournamentNo**: Tournament identifier (integer, required)

### Optional Filter Parameters
All parameters are added as attributes to the `<Filter>` element:

- **CourtNo**: Specific court number (integer)
- **Status**: Match status filter
  - Valid values: "Scheduled", "Running", "Finished", "Cancelled"
- **StartDate**: Start date filter (YYYY-MM-DD format)
- **EndDate**: End date filter (YYYY-MM-DD format)
- **IncludeResults**: Include match scores (boolean, default: true)
- **IncludeReferees**: Include referee assignments (boolean, default: true)

### Fields
The list of fields is mandatory. It can contain all the fields listed in the Beach Volleyball Match data below.

### Example Request
Get all matches for tournament 123 with basic information:

```xml
<Request Type="GetBeachMatchList" Fields="No NoInTournament LocalDate LocalTime Status Court TeamAName TeamBName">
  <Filter TournamentNo="123" IncludeResults="true" IncludeReferees="true" />
</Request>
```

### Response
When the request is successful, the VIS API returns a SOAP envelope containing the filtered matches:

**SOAP Response Format:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetBeachMatchListResponse xmlns="http://www.fivb.org/vis/2009/XmlRequest">
      <GetBeachMatchListResult>
        <BeachMatches>
          <BeachMatch No="1001" NoInTournament="1" LocalDate="2025-08-21" LocalTime="09:00" Status="Scheduled" Court="Court 1" TeamAName="Team A" TeamBName="Team B" ... />
          <BeachMatch No="1002" NoInTournament="2" LocalDate="2025-08-21" LocalTime="10:30" Status="Running" Court="Court 2" TeamAName="Team C" TeamBName="Team D" ... />
        </BeachMatches>
      </GetBeachMatchListResult>
    </GetBeachMatchListResponse>
  </soap:Body>
</soap:Envelope>
```

**Data Extraction:**
To extract the match data from the SOAP response:
1. Parse the SOAP envelope
2. Navigate to: `soap:Body → GetBeachMatchListResponse → GetBeachMatchListResult → BeachMatches`
3. Each match is in a `<BeachMatch>` element with attributes containing the field data

### Security
This is a public request: any client can retrieve match information.
Some fields may require authentication depending on the tournament and match visibility settings.

---

# Beach Volleyball Match Data Structure

Represents a beach volleyball match.

The name of the XML element for a beach volleyball match is <BeachMatch>.
The name of the XML element for a list of beach volleyball matches is <BeachMatches>.

Fields
The following table lists all the fields for a beach volleyball match.

Name	Type	Description
BeginDateTimeUtc	DateTime	UTC date and time when the match starts.
This field is currently not used.
Court	String	Name of the court for the match.
DeletedDT	DateTime	Empty if the match is valid.
Date and time of the deletion when the match is deleted.
DurationSet1	Duration	Duration of set 1.
DurationSet2	Duration	Duration of set 2.
DurationSet3	Duration	Duration of set 3.
DurationSet4	Duration	Duration of set 4.
DurationSet5	Duration	Duration of set 5.
EndDateTimeUtc	DateTime	UTC date and time when the match ends.
This field is currently not used.
FastestServeTeamAPlayer1	Speed	Fastest serve in the match for player 1 of team A.
If the speed is not known, the attribute is empty.
FastestServeTeamAPlayer2	Speed	Fastest serve in the match for player 2 of team A.
If the speed is not known, the attribute is empty.
FastestServeTeamBPlayer1	Speed	Fastest serve in the match for player 1 of team B.
If the speed is not known, the attribute is empty.
FastestServeTeamBPlayer2	Speed	Fastest serve in the match for player 2 of team B.
If the speed is not known, the attribute is empty.
Format	BeachMatchFormat	Format of the match.
Humidity	Humidity	Humidity of the court where the match is played.
If the humidity is not known, the attribute is empty.
LastChangeDT	DateTime	Date and time of the last change in the match's data.
LastChangeUser	Int32	Number of the user who makes the last changed of the match.
LastChangeUsername	String	Name of the user who has made the last change in the match's data.
LocalDate	Date	Local date scheduled for the match.
LocalTime	Time	Local time scheduled for the match.
LocalTimeOffset	Int32	Offset between local time and GMT time, in minutes.
This field is currently not used.
LoserRank	Int32	
Rank for the loser of the match.

The following table lists the valid values.

Value

Description
-2

Eliminated from a confederation quota tournament or federation quota tournament.
The match should not be used for seeding or ranking.
0

Not ranked.
The team continues playing in the tournament.
> 0

The team is ranked at the specified rank.
MatchPointsA	Int32	Number of match points for team A.
MatchPointsB	Int32	Number of match points for team B.
NbSpectators	Int32	Number of spectators for the match.
If the number of spectators is not known, the attribute is empty.
No	Int32	Unique number of the match.
This number is unique among all the registered matches.
NoInTournament	Int32	Number of the match in the tournament.
This number is not unique in the tournament: the matches for the qualification tournament are normally numbered from 1, as are the matches in the main draw.
This is the number that must be used to display for the user.
NoPlayerA1	Int32	Unique number of the first player of team A.
This field can be used to retrieve the information about the round in the Player data.
NoPlayerA2	Int32	Unique number of the second player of team A.
This field can be used to retrieve the information about the round in the Player data.
NoPlayerB1	Int32	Unique number of the first player of team B.
This field can be used to retrieve the information about the round in the Player data.
NoPlayerB2	Int32	Unique number of the second player of team B.
This field can be used to retrieve the information about the round in the Player data.
NoReferee1	Int32	Unique number of the first referee.
This field can be used to retrieve the information about the round in the Referee data.
NoReferee2	Int32	Unique number of the second referee.
This field can be used to retrieve the information about the round in the Referee data.
NoRound	Int32	Unique number of the round.
This field can be used to retrieve the information about the round in the BeachRound data.
NoTeamA	Int32	
Unique number of the team A.
This field can be used to retrieve the information about the team in the BeachTeam data.

The following table lists the valid values.

Value	Description
-1

Bye: there is no team.
0

The team number is currently unknown.
Use TeamTypeA to have a description of the team.
> 0

Unique number of the team.
NoTeamB	Int32	
Unique number of the team B.
This field can be used to retrieve the information about the team in the BeachTeam data.

The following table lists the valid values:

Value	Description
-1

Bye: there is no team.
0

The team number is currently unknown.
Use TeamTypeB to have a description of the team.
> 0

Unique number of the team.
NoTournament	Int32	Unique number of the tournament to which the match belongs.
This field can be used to retrieve the information about the tournament in the BeachTournament data.
Personnel	BeachMatchPersonnel	Personnel for the match.
PointsTeamASet1	Int32	Number of points for team A in set 1.
This attribute is empty if the set 1 has not been played.
PointsTeamASet2	Int32	Number of points for team A in set 2.
This attribute is empty if the set 2 has not been played.
PointsTeamASet3	Int32	Number of points for team A in set 3.
This attribute is empty if the set 3 has not been played.
PointsTeamASet4	Int32	Number of points for team A in set 4.
This attribute is empty if the set 4 has not been played.
PointsTeamASet5	Int32	Number of points for team A in set 5.
This attribute is empty if the set 5 has not been played.
PointsTeamBSet1	Int32	Number of points for team B in set 1.
This attribute is empty if the set 1 has not been played.
PointsTeamBSet2	Int32	Number of points for team B in set 2.
This attribute is empty if the set 2 has not been played.
PointsTeamBSet3	Int32	Number of points for team B in set 3.
This attribute is empty if the set 3 has not been played.
PointsTeamBSet4	Int32	Number of points for team B in set 4.
This attribute is empty if the set 4 has not been played.
PointsTeamBSet5	Int32	Number of points for team B in set 5.
This attribute is empty if the set 5 has not been played.
Referee1FederationCode	FederationCode	Code of the federation for the first referee.
Referee1Name	String	Name of the first referee.
Referee2FederationCode	FederationCode	Code of the federation for the second referee.
Referee2Name	String	Name of the second referee.
ResultType	BeachMatchResultType	Indicates how the match was finished.
ResultTypeText	String	Additional information about the result type.
This field is currently not used.
RoundBracket	String	Bracket for the round.
RoundCode	String	Code of the round.
RoundName	String	Name of the round.
RoundPhase	BeachRoundPhase	Phase of the round.
Status	BeachMatchStatus	Status.
TeamAFederationCode	FederationCode	Code of the federation for team A.
If the team A is not known (field NoTeamA is <= 0), this attribute is empty.
TeamAName	String	Name of team A.
If the team A is not known (field NoTeamA is <= 0), attribute is empty.
TeamAPositionInMainDraw	Int32	Position of team A in the main draw.
Is 0 if team A has not played the main draw.
TeamAPositionInQualification	Int32	Position of team A in the qualification tournament.
Is 0 if team A has not played the qualification tournament.
TeamAType	BeachTeamType	Type of the team A.
TeamBFederationCode	FederationCode	Code of the federation for team B.
If the team B is not known (field NoTeamB is <= 0), this attribute is empty.
TeamBName	String	Name of team B.
If the team B is not known (field NoTeamB is <= 0), this attribute is empty.
TeamBPositionInMainDraw	Int32	Position of team A in the main draw.
Is 0 if team A has not played the main draw.
TeamBPositionInQualification	Int32	Position of team A in the qualification tournament.
Is 0 if team A has not played the qualification tournament.
TeamBType	BeachTeamType	Type of the team B.
Temperature	Temperature	Temperature of the court where the match is played.
This field is currently not used.
TournamentCode	String	Code of the tournament.
TournamentName	String	Name of the tournament.
TournamentTitle	String	Title of the tournament.
TournamentType	BeachTournamentType	Type of the tournament.
Version	Int32	Version of the match's data.
This field is currently not used.
WinnerRank	Int32	
Rank for the winner of the match.

The following table lists the valid values.

Value

Description
-3

The team is qualified for the qualification tournament.
This value is used for a confederation quota or a federation quota match.
The match should not be used for seeding or ranking.
-1

The team is qualified for the main draw.
This value is used for a qualification tournament match.
The match should not be used for seeding or ranking.
0

Not ranked.
The team continues playing in the tournament.
> 0

The team is ranked at the specified rank.s