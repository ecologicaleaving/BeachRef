Request to get a list of events
Request
The syntax for this request is:

Web service request	
<Request Type="GetEventList"
         Fields="<list of the fields to return>">
  <Filter /> <!-- Optional: contains the filter to use -->
</Request>
Filter

The filter is optional.
If it is not specified, the response will contain all the events.
Please see EventFilter for more information.

Fields

The list of fields is mandatory.
It can contain all the fields in the Event data. Only the fields you have access to will be returned.

Response
When the request is successful, the filter will return the list of filtered events.
Security
This is a public request: any client can retrieve information.

Some of the fields for an event are public and other are not.
The response from the server will contain only the fields the client has access to.

Example
Get the list of top-level beach volleyball events for the year 2011 that are managed by the system.

Web service request	
<Request Type="GetEventList"
         Fields="Code Name StartDate EndDate">
  <Filter IsVisManaged="True" NoParentEvent="0" HasBeachTournament="True" StartDate="2011-01-01" EndDate="2011-12-31" />
</Request>
The response is:

Web service response	
<Events>
  <Event Code="BVB-SWT2011" Name="Swatch World Tour 2011" StartDate="2011-04-18" EndDate="2011-11-06" No="1" Version="1"/>
  <Event Code="BVB-ITA2011" Name="World Championships 2011" StartDate="2011-06-13" EndDate="2011-06-19" No="5" Version="1"/>
</Events>
You can see the live request by clicking on this URL.

