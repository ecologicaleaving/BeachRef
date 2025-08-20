Request to get a beach volleyball match
Request
The syntax for this request is:

Web service request	
<Request Type="GetBeachMatch"
         No="<match number>">
         Fields="<optional list of the fields to return>" />
Where:

Attribute	Description
No	Number of the beach volleyball match.
This is a mandatory parameter.
Fields

The list of fields is optional: if it not specified, all the fields you have access to will be sent.
It can contain all the fields in the BeachMatch data. Only the fields you have access to will be returned.

Response
When the request is successful, the service will return the data of a beach volleyball match.
Errors
In addition to global errors, the following errors can be sent by the server:

Error	Description
<BadParameter>	The No parameter is not a valid 32-bits integer number.
<NoData>	The beach volleyball match with the specified number does not exist or has been deleted.
<ParameterMissing>	You must specify the No parameter.
Security
This is a public request: any client can retrieve information.

Some of the fields for a beach volleyball match are public and other are not.
The response from the server will contain only the fields the client has access to.

Example
Retrieve the match with the number 15592.

Web service request	
<Request Type="GetBeachMatch"
         No="15592"
         Fields="NoInTournament LocalDate LocalTime TeamAType TeamAName TeamBType TeamBName Court MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 DurationSet1 DurationSet2 DurationSet3" />
The response is (formatted for readability):

Web service response	
<BeachMatch NoInTournament="1"
            LocalDate="2010-07-07"
            LocalTime="15:00:00"
            TeamAType="&lt;Seed Position=&quot;1&quot; /&gt;"
            TeamAName="Larissa-Juliana"
            TeamBType="&lt;Seed Position=&quot;32&quot; /&gt;"
            TeamBName="Graessli-Goricanec"
            Court="2"
            MatchPointsA="2"
            MatchPointsB="0"
            PointsTeamASet1="21"
            PointsTeamBSet1="14"
            PointsTeamASet2="21"
            PointsTeamBSet2="14"
            PointsTeamASet3=""
            PointsTeamBSet3=""
            DurationSet1="960"
            DurationSet2="1080"
            DurationSet3=""/>
You can see the live request by clicking on this URL.

