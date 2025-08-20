Request to get a beach volleyball tournament ranking
Request
The syntax for this request is:

Web service request	
<Request Type="GetBeachTournamentRanking"
         No="<tournament number>"
         Phase="<phase>">
         Fields="<list of the fields to return>" />
Where:

Attribute	Description
No	Number of the beach volleyball tournament.
This is a mandatory parameter.
Phase	Phase for which to return the ranking.
Only the values Qualification and MainDraw (or their numeric equivalent) are accepted.
This is an optional parameter. If the attribute is missing, the web service will return the global ranking of the tournament.
Fields

The list of fields is mandatory.
It can contain all the fields in the Beach Volleyball Tournament Ranking Entry data. All the fields are public, so you can request any one.

Response
When the request is successful, the service will return the a <BeachTournamentRanking> XML element that contains beach volleyball tournament ranking entries.
Errors
In addition to global errors, the following errors can be sent by the server:

Error	Description
<BadParameter>	
The No parameter is not a valid 32-bits integer number.
The Phase parameter, if specified, is not a valid phase value.
The Phase parameter, if specified, is not Qualification, MainDraw or their numeric equivalent.
<NoData>	The beach volleyball tournament with the specified number does not exist or has been deleted.
<ParameterMissing>	You must specify the No parameter.
Security
This is a public request: any client can retrieve information.

All the fields for a beach volleyball tournament ranking are public.

Example
Retrieve the ranking for the main draw of the tournament with the number 503.

Web service request	
<Request Type="GetBeachTournamentRanking"
         No="503"
         Phase="MainDraw"
         Fields="Position Rank TeamName TeamFederationCode EarnedPointsTeam EarningsTotalTeam" />
The response is:

Web service response	
<BeachTournamentRanking>
  <BeachTournamentRankingEntry EarnedPointsTeam="600" EarningsTotalTeam="3000000" Position="1" Rank="1" TeamFederationCode="BRA" TeamName="Larissa-Juliana"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="540" EarningsTotalTeam="2100000" Position="2" Rank="2" TeamFederationCode="USA" TeamName="May-Treanor-Walsh"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="480" EarningsTotalTeam="1500000" Position="3" Rank="3" TeamFederationCode="USA" TeamName="Kessy-Ross"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="420" EarningsTotalTeam="1120000" Position="4" Rank="4" TeamFederationCode="USA" TeamName="Fendrick-Hanson"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="360" EarningsTotalTeam="910000" Position="5" Rank="5" TeamFederationCode="BRA" TeamName="Talita-Antonelli"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="360" EarningsTotalTeam="910000" Position="6" Rank="-5" TeamFederationCode="GER" TeamName="Goller-Ludwig"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="300" EarningsTotalTeam="760000" Position="7" Rank="7" TeamFederationCode="AUT" TeamName="Schwaiger-Schwaiger"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="300" EarningsTotalTeam="760000" Position="8" Rank="-7" TeamFederationCode="CHN" TeamName="Xue-Zhang Xi"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="240" EarningsTotalTeam="600000" Position="9" Rank="9" TeamFederationCode="AUS" TeamName="Bawden-Palmer"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="240" EarningsTotalTeam="600000" Position="10" Rank="-9" TeamFederationCode="CZE" TeamName="Kolocova-Slukova"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="240" EarningsTotalTeam="600000" Position="11" Rank="-9" TeamFederationCode="NED" TeamName="Keizer-Van Iersel"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="240" EarningsTotalTeam="600000" Position="12" Rank="-9" TeamFederationCode="USA" TeamName="Akers-Branagh"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="180" EarningsTotalTeam="425000" Position="13" Rank="13" TeamFederationCode="BRA" TeamName="Maria Clara-Carol"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="180" EarningsTotalTeam="425000" Position="14" Rank="-13" TeamFederationCode="GER" TeamName="Holtwick-Semmler"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="180" EarningsTotalTeam="425000" Position="15" Rank="-13" TeamFederationCode="ITA" TeamName="Cicolari-Menegatti"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="180" EarningsTotalTeam="425000" Position="16" Rank="-13" TeamFederationCode="SUI" TeamName="Kuhn-Zumkehr"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="120" EarningsTotalTeam="280000" Position="17" Rank="17" TeamFederationCode="BRA" TeamName="Lima-Vivian"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="120" EarningsTotalTeam="280000" Position="18" Rank="-17" TeamFederationCode="CHN" TeamName="Y. Huang-Yue Y."/>
  <BeachTournamentRankingEntry EarnedPointsTeam="120" EarningsTotalTeam="280000" Position="19" Rank="-17" TeamFederationCode="CZE" TeamName="Klapalova-Hajeckova"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="120" EarningsTotalTeam="280000" Position="20" Rank="-17" TeamFederationCode="GEO" TeamName="Saka-Rtvelo"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="120" EarningsTotalTeam="280000" Position="21" Rank="-17" TeamFederationCode="ITA" TeamName="Giombini-Rosso"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="120" EarningsTotalTeam="280000" Position="22" Rank="-17" TeamFederationCode="RUS" TeamName="Ryabova-Ushkova"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="120" EarningsTotalTeam="280000" Position="23" Rank="-17" TeamFederationCode="RUS" TeamName="Ukolova-Vasina"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="120" EarningsTotalTeam="280000" Position="24" Rank="-17" TeamFederationCode="RUS" TeamName="Vozakova-Khomyakova"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="60" EarningsTotalTeam="200000" Position="25" Rank="25" TeamFederationCode="AUS" TeamName="Cook-West"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="60" EarningsTotalTeam="200000" Position="26" Rank="-25" TeamFederationCode="AUT" TeamName="Hansel-Montagnolli"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="60" EarningsTotalTeam="200000" Position="27" Rank="-25" TeamFederationCode="BRA" TeamName="Lese Lima-Vieira"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="60" EarningsTotalTeam="200000" Position="28" Rank="-25" TeamFederationCode="FIN" TeamName="Nystrom-Nystrom"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="60" EarningsTotalTeam="200000" Position="29" Rank="-25" TeamFederationCode="GBR" TeamName="Johns-Boulton"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="60" EarningsTotalTeam="200000" Position="30" Rank="-25" TeamFederationCode="GER" TeamName="Köhler-Sude"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="60" EarningsTotalTeam="200000" Position="31" Rank="-25" TeamFederationCode="ITA" TeamName="Gioria-Momoli"/>
  <BeachTournamentRankingEntry EarnedPointsTeam="60" EarningsTotalTeam="200000" Position="32" Rank="-25" TeamFederationCode="NED" TeamName="Wesselink-Meppelink"/>
</BeachTournamentRanking>
You can see the live request by clicking on this URL.