
VIS web service documentation
Collapse All
Requests > Beach volleyball > Tournament > Request to get a beach volleyball tournament
Request to get a beach volleyball tournament
Request
The syntax for this request is:

Web service request	
<Request Type="GetBeachTournament"
         No="<tournament number>">
         Fields="<Optional: list of the fields to return>" />
Where:

Attribute	Description
No	Number of the beach volleyball tournament.
This is a mandatory parameter.
Fields

The list of fields is optional: if it not specified, all the fields you have access to will be sent.
It can contain all the fields in the BeachTournament data. Only the fields you have access to will be returned.

Response
When the request is successful, the service will return the data of a beach tournament.
Errors
In addition to global errors, the following errors can be sent by the server:

Error	Description
<BadParameter>	The No parameter is not a valid 32-bits integer number.
<NoData>	The beach volleyball tournament with the specified number does not exist or has been deleted.
<ParameterMissing>	You must specify the No parameter.
Security
This is a public request: any client can retrieve information.

Some of the fields for a beach volleyball tournament are public and other are not.
The response from the server will contain only the fields the client has access to.

Example
Retrieve the tournament with the number 502.

Web service request	
<Request Type="GetBeachTournament"
         No="502"
         Fields="Code Name Title CountryCode StartDateQualification StartDateMainDraw EndDateQualification EndDateMainDraw NbTeamsQualification NbTeamsFromQualification NbTeamsMainDraw" />
The response is (formatted for readability):

Web service response	
<BeachTournament Code="WBRA2010"
                 Name="Brasilia"
                 Title="Brasilia Open"
                 CountryCode="BR"
                 StartDateQualification="2010-04-20"
                 StartDateMainDraw="2010-04-21"
                 EndDateQualification="2010-04-20"
                 EndDateMainDraw="2010-04-24"
                 NbTeamsQualification="64"
                 NbTeamsFromQualification="8"
                 NbTeamsMainDraw="32"/>
You can see the live request by clicking on this URL.

See Also
Web service
General errors (XML)
Beach Volleyball Tournament
Windows client
GetBeachTournamentRequest Class
Send Feedback