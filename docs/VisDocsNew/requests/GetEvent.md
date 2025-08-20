
VIS web service documentation
Collapse All
Requests > Event > Request to get an event
Request to get an event
Request
The syntax for this request is:

Web service request	
<Request Type="GetEvent"
         No="<event number>"
         Fields="<optional: list of the fields to return>" />
Where:

Attribute	Description
No	Number of the event.
This is a mandatory parameter.
Fields

The list of fields is optional: if it not specified, all the fields you have access to will be sent.
It can contain all the fields in the Event data. Only the fields you have access to will be returned.

Response
When the request is successful, the service will return the data of an event.
Errors
In addition to global errors, the following errors can be sent by the server:

Error	Description
<BadParameter>	The No parameter is not a valid 32-bits integer number.
<NoData>	The event with the specified number does not exist or has been deleted.
<ParameterMissing>	You must specify the No parameter.
Security
This is a public request: any client can retrieve information.

Some of the fields for an event are public and other are not.
The response from the server will contain only the fields the client has access to.

Example
Retrieve the event with the number 1.

Web service request	
<Request Type="GetBeachEvent"
         No="1"
         Fields="Code Name StartDate EndDate" />
The response is (formatted for readability):

Web service response	
<Event Code="BVB-SWT2011"
       EndDate="2011-11-06"
       Name="Swatch World Tour 2011"
       StartDate="2011-04-18"/>
You can see the live request by clicking on this URL.

See Also
Web service
General errors (XML)
Event
Request to get a list of events
Windows client
GetEventRequest Class
Send Feedback