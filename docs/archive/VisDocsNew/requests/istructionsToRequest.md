Introduction to requests
 This page contains the following information:

Introduction
Application identifier
Authentication
Request parameter
Base format for a request
Response (XML)
Response (JSON)
Compression
Introduction
The entry point for all web service XML requests is https://www.fivb.org/Vis2009/XmlRequest.asmx.

**RECOMMENDED PRODUCTION APPROACH**: The request must contain a `Request` parameter sent via POST with `application/x-www-form-urlencoded` content type. The XML request is URL-encoded as the value of the `Request` parameter in the form data body.

**Production Example:**
```
POST https://www.fivb.org/Vis2009/XmlRequest.asmx
Content-Type: application/x-www-form-urlencoded

Request=%3CRequest%20Type%3D%22GetEventList%22%20Fields%3D%22Code%20Name%22%3E%3C%2FRequest%3E
```

**TESTING/DEVELOPMENT ONLY**: The parameter can also be placed in the query string for simple browser testing, but this approach is limited to ~4KB and should not be used in production code. URLs with long requests will be refused by the server before reaching the web service.

**Browser Testing Example:**
```
GET https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='GetServiceInformation' />
```

All the requests can return an XML response, but only some of them can return a JSON response (the list is growing). To identify the requests that can return JSON output, you can look at the list of requests.

You can test a request and its response using a web browser.
For example, if you browse the following URL, you will retrieve information about the web service: https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='GetServiceInformation' />.

Web service response	
<OK Id="FivbVis" Version="18.1.22.1169" Date="2018-01-22" />
Application identifier
To communicate with the web service, an application must use an application identifier. The identifier is unique to an application, not a developer or a company. One of the benefits of an application identifier is that the developer has access to the error log of the web service for the application (this feature is in development).

To obtain an application identifier, please contact the FIVB at vis.sdk@fivb.org.

For more information about the use of the application identifier, please look at the following documentation page: Application identifier.

Authentication
Authentication is needed only if you need to access non-public data or you need to modify data. If your application needs only access to public data, you don't need to authenticate to the web service. In this case, don't specify any authentication information and you will be treated as a guest.

Authentication can be made using two different methods: basic authentication, authentication in the request.

Basic Authentication       

In this case, the username and password are specified in the Authorization header of the request. The header value must contain "Basic " followed by the username and password, separated by a colon and coded using base-64 encoding.

For more information about the use of basic authentication, please look at this Wikipedia article.

Authentication in the request

This method of authentication can only be used with multiple requests. It consists in the use of the Username and Password attributes in the root <Requests> element. The Request parameter section gives more information

Request parameter
The format of the request parameter depends on the format of the request.

Single request

The Request parameter has the following global format:

Web service request	
<Request Type="xxx" other-attributes>
  <!-- Optional parameters -->
</Request>
Note that not all of the requests currently accept the "single request" format (the list is growing).To identify the requests that can use the single request format, you can look at the list of requests.

Multiple requests

The Request parameter has the following global format:

List of requests	
<Requests Username="xxx" Password="xxx">
  <!-- Zero or more <Request> entries -->
</Requests>

The following table lists the attributes for the <Requests> element. Note that these attributes are only used if no other authentication method is used in the request.

Attribute	Description
Username	Name of the user making the request.
If it is not specified, Guest will be used by default by the web service.
Password	The password of the user, either in plain text or encrypted.
If there is no password, this attribute can be omitted.
Base format for a request
A request has the following default format:

Request format	
<Request Type="xxx" other-attributes>
  <!-- Optional parameters -->
</Request>
The Type attribute indicates which request you make to the web service. Depending on the request, there can be other attributes and parameters that can be specified.
Please look at the documentation of each request for detailed format.

Response (XML)
This is the default response format. It is used when the Accept header is not specified or doesn't contain a recognized value. It is also used when the Accept header contains the application/xml format.

The format of the XML response depends on the format of the request.

Single request

When a error is received, the HTTP status indicates an error code.

Otherwise the web service returns an XML element, containing only <OK /> or more information, depending on the request. If no information is returned by the web service, an HTTP status of 204 (no content) is returned. Please look at the documentation of each request for detailed response format.

Multiple request

The web service responds by sending back an XML document having the specified format:

Response format	
<?xml version="1.0"?>
<Responses
  <!-- Response for 1st request   -->
  <!-- Response for 2nd request   -->
  <!--          ...              -->
  <!-- Response for last request -->
</Responses>
The response for each request is a single XML element which contains the requested data, a confirmation information or an error information. The responses are in the same order as the requests.
Please look at the documentation of each request for detailed response format.

Response (JSON)
This is the response format used when the Accept header contains the application/json format.

Currently few of the requests can return value in JSON format. Look at list of requests or at the documentation of each request to see if a request accepts the JSON output format. If a request doesn't accept the JSON format an error is returned.

The format of the XML response depends on the format of the request.

Single request

When a error is received, the HTTP status indicates an error code.

Otherwise the web service returns a JSON value, containing more information, depending on the request. If no information is returned by the web service, an HTTP status of 204 (no content) is returned. Please look at the documentation of each request for detailed response format.

Multiple request

The web service responds by sending back a JSON object having the specified format:

Response format	
{
  "responses": [
    // Response for 1st request
    // Response for 2nd request
    //           ...
    // Response for last request
  ]
}
The response for each request is a single JSON element which contains the requested data, a confirmation information or an error information. The responses are in the same order as the requests.

Properties names in responses

The names of the properties are the same of those in XML format, but they are converted to camelCase, with their first char in lowercase.
Please look at the documentation of each request for detailed response format.

Compression
If the request header contains the Accept-Encoding header, with one of the following encoding format: gzip or deflate, the web service response is compressed using the specified encoding format. If the accepted formats are both specifed, the web service returns data in gzip format.