Beach Live Schema
Description
XSD schema that can be used to validate the live data for a beach volleyball match.

The schema file can be downloaded here.

Elements
Element	Description
BeachLive	Main element.
Complex Types
Complex Type	Description
Challenge	Common data for a challenge.
Comment	Comment.
Injury	Injury.
PlayerSanction	Sanction for a player.
PlayerStatistics	Statistics for a player.
Protest	Protest
TeamSanction	Sanction for a team.
TeamStatistics	Statistics for a team.
Simple Types
Simple Type	Description
BeachMatchFormat	Format.
BeachMatchResultType	Type of result.
BeachMatchStatus	Status of the match.
BeachNote	Note for a skill.
BeachRallyStatus	Status for a rally.
BeachRoundPhase	Phase.
BeachSkill	Skill.
BeachTournamentType	Type of beach volleyball tournament
ChallengeOutcome	Outcome of a challenge
ChallengeRequestedFrom	Who has requested a challenge
ChallengeRequestType	Type of challenge
CommentCategory	Category for a comment.
EventGender	Gender for an event.
PersonGender	Gender for a person.
SanctionType	Type of sanction.
TimeOffset	Time offset, in ms. If we have the start of the match (BeginDateTimeUtc), it is relative to the start of the match. Otherwise, it is relative to the scheduled match date and time.
VisBoolean	Boolean value