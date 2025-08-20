
VIS web service documentation
Collapse All
Data types > Event > Event
Event
Represents an event.

The name of the XML element for an event is <Event>.
The name of the XML element for a list of events is <Events>.

Fields
The following table lists all the fields for an event.

Name	Type	Description
AccreditationDocuments	String	List of the documents for accreditation.
This field contains an XML element.
AccreditationEndDate	Date	End date for accreditation.
AccreditationStartDate	Date	Start date for accreditation.
AuxiliaryPersons	String	Auxiliary persons for the event.
Checklist	String	The checklist.
This field contains an HTML fragment.
Code	String	Code.
Content	String	Content.
This field contains the events and tournaments that are inside the event.
This field contains an XML element.
CountryCode	CountryCode	Code of the country where the event is organized, for a single country event.
If the event is in more than one country, this field is null.
DeletedDT	DateTime	Null if the event is valid.
Date and time of the deletion when the event is deleted.
EffectiveDates	String	Effective dates for the event.
The effective dates are the dates that are really used by the event. For example, a World League event is running during 2 months, but not all of these dates are match playing dates. This attribute will contain the match playing dates only.
This field contains an XML element.
EndDate	Date	Last date.
ExpensesCurrencyCode	String	Code of the currency used for expenses.
HasBeachTournament	Boolean	True if the event contains at least one beach volleyball tournaments;
false otherwise.
HasMenTournament	Boolean	True if the event contains at least one tournaments for men;
false otherwise.
HasVolleyTournament	Boolean	True if the event contains at least one volleyball tournaments;
false otherwise.
HasWomenTournament	Boolean	True if the event contains at least one tournaments for women;
false otherwise.
InfoFederation	String	Information about the national federation.
This field contains an HTML fragment.
InfoFormat	String	The event format.
This field contains an HTML fragment.
InfoHotels	String	Information about the hotels.
This field contains an HTML fragment.
InfoLocation	String	Information about the location.
This field contains an HTML fragment.
InfoOrganizer	String	Information about the organizer.
This field contains an HTML fragment.
InfoPresentation	String	The event presentation.
This field contains an HTML fragment.
InfoSchedule	String	The event schedule.
This field contains an HTML fragment.
InfoUseful	String	Other useful information.
This field contains an HTML fragment.
IsVisManaged	Boolean	True if the event is managed by VIS;
false otherwise.
LastChangeDT	DateTime	Date and time of the last change of the event.
LastChangeUser	Int32	Number of the user who makes the last changed of the event.
LastChangeUsername	String	Name of the user who makes the last changed of the event.
Logos	String	Logos to use for the event.
This attribute contains an XML element.
Name	String	Name.
No	Int32	Unique number to identify the event.
NoLogoImage	Int32	Number of the image to use as the logo.
If there is no logo, the value is Null.
In this case, the client should look at the logo of the parent event, using the NoParentEvent field. If there is no parent event, there is no logo for the event.
NoParentEvent	Int32	number of the parent event: the event to which this event belongs.
If the event has no parent, it is a top-level event and the value is 0.
OfficialFunctions	String	Functions that are available for the officials of the event.
This field contains an XML element.
OrganizerCode	String	
Code of the organizer.

The value of this code depends on the value of OrganizerType:

Organizer type	Code description
Confederation	Code of the confederation that organizes the event.
Federation	Code of the federation that organizes the event.
Other values	The field is null.
OrganizerType	OrganizerType	Type of organizer.
SecurityCardDescr	String	The list of descriptions of the security cards to print for the event.
StartDate	Date	First date.
Type	EventType	Type.
Venues	String	List of the venues.
This field contains an XML element.
Version	Int32	Version of the event.
See Also
Web service
Filter for events
Request to get an event
Request to get a list of events
Windows client
Event Class
Send Feedback