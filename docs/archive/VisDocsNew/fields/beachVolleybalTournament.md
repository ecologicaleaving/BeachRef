Beach Volleyball Tournament
Represents a beach volleyball tournament.

The name of the XML element for a beach volleyball tournament is <BeachTournament>.
The name of the XML element for a list of beach volleyball tournaments is <BeachTournaments>.

Fields
The following table lists all the fields for a beach volleyball tournament.

Name	Type	Description
Actions	BeachTournamentActions	List of possible actions.
Code	String	Code.
CountryCode	CountryCode	Code of the country where the tournament is played.
Deadline	Date	Deadline date for team registration.
DefaultLocalTimeOffset	Int32	Default local time offset for the matches, in minutes.
This field is currently not used.
DeletedDT	DateTime	Null if the tournament is valid.
Date and time of the deletion when the tournament is deleted.
DispatchStatus	BeachTournamentDispatchStatus	Status of the dispatching of the teams.
Earnings	Amount	Total earnings for the tournament.
EarningsBonus	Amount	Total bonus earnings for the tournament.
EndDateMainDraw	Date	Ending date of the main draw.
EndDateQualification	Date	Ending date of the qualification tournament.
This value is Null if there is no qualification tournament.
EventAuxiliaryPersons	String	Auxiliary persons of the event.
This field contains an XML element.
EventLogos	String	Logos of the event.
This field contains an XML element.
Gender	EventGender	Gender.
IsVisManaged	Boolean	True if the event is managed by VIS;
otherwise, false.
LastChangeDT	DateTime	Date and time of the last change in the tournament's data.
LastChangeUser	Int32	Number of the user who has made the last change in the tournament's data.
LastChangeUsername	String	Name of the user who has made the last change in the tournament's data.
Logos	String	Logos.
This field contains an XML element.
If a logo is not defined, you must use the one from EventLogos.
MaxCountryTeams	Int32	Maximum number of teams in the tournament for each country, excepted the host country.
This value is 0 if there is no limit for the countries.
MaxCountryTeamsMainDraw	Int32	Maximum number of teams for each country, excepted the host country, in the main draw.
This value is 0 if there is no limit for the countries.
MaxCountryTeamsMainDrawDirect	Int32	Maximum number of teams for each country, excepted the host country, that can be selected directly in the main draw.
This value is 0 if there is no limit for the countries.
MaxHostTeams	Int32	Maximum number of teams for the host country.
This value is 0 if there is no limit for the host country.
MaxHostTeamsMainDraw	Int32	Maximum number of teams for the host country in the main draw.
This value is 0 if there is no limit for the host country.
MaxHostTeamsMainDrawDirect	Int32	Maximum number of teams for the host country that can be selected directly in the main draw.
This value is 0 if there is no limit for the host country.
MaxReserveTeams	Int32	Maximum number of reserve teams.
This value is 0 if there is no limit for the reserve teams.
MinConfederationTeams	Int32	Minimum number of teams in the main draw for each confederation.
This value is 0 if there is no limit for the confederations.
MinHostTeamsMainDrawDirect	Int32	Minimum number of teams for the host country that can be selected directly in the main draw.
This value is 0 if there is no limit for the host country .
Name	String	Name.
NbTeamsFromQualification	Int32	Number of teams qualified from the qualification tournament to the main draw.
This value is 0 if we have no qualification tournament.
NbTeamsMainDraw	Int32	Number of teams in the main draw.
NbTeamsQualification	Int32	Number of teams in the qualification tournament.
This value is 0 if we have no qualification tournament.
NbUploads	Int32	Statistics: number of match results uploads.
NbViewMatchesCountryQuota	Int32	Statistics: number of views for the matches in the country quota tournaments.
NbViewMatchesMainDraw	Int32	Statistics: number of views for the matches in the main draw.
NbViewMatchesQualification	Int32	Statistics: number of views for the matches in the qualification tournament.
NbViewPhotoGallery	Int32	Statistics: number of views of the photo gallery.
NbViewRankingCountryQuota	Int32	Statistics: number of views for the ranking of the country quota tournaments.
NbViewRankingMainDraw	Int32	Statistics: number of views for the ranking of the main draw.
NbViewRankingQualification	Int32	Statistics: number of views for the ranking of the qualification tournament.
NbViewTeams	Int32	Statistics: number of views for the main list of teams.
NbViewTeamsMainDraw	Int32	Statistics: number of views for the list of teams in main draw.
NbViewTeamsQualification	Int32	Statistics: number of views for the list of teams in qualification tournament.
NbViewThumbnails	Int32	Statistics: number of views of thumbnail images.
NbWildCards	Int32	Number of wild cards for teams.
No	Int32	Unique number of the tournament.
This number is unique among all the registered tournaments.
NoEvent	Int32	Number of the event to which the tournament belongs.
Is 0 if the tournament does not belong to an event.
This field can be used to retrieve the information about the event in the Event data.
OrganizerCode	String	
Code of the organizer.

The code depends on the OrganizerCode value:

Type	Value of the code
Confederation	Code of the confederation.
Federation	Code of the federation.
OrganizerType	OrganizerType	Type of organizer.
PrizeMoney	BeachTournamentPrizeMoney	Prize money for the tournament.
Season	String	Season.
StartDateMainDraw	Date	Starting date of the main draw.
StartDateQualification	Date	Starting date of the qualification tournament.
This value is Null if there is no qualification tournament.
Status	BeachTournamentStatus	Status.
Title	String	Title.
Type	BeachTournamentType	Type.
Version	Int32	Version of the tournament's data.