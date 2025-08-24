
Beach Live Schema
Collapse All
Beach Live Schema : BeachRoundPhase Simple Type
BeachRoundPhase Simple Type
Description
Phase.
Namespace	(none)
Type
Restriction of xs:string
Diagram

Overview
	
BeachRoundPhase Restriction of xs:string
Phase.
Facets
Enumeration	ConfederationQuota
Enumeration	FederationQuota
Enumeration	Qualification
Enumeration	MainDraw
Enumeration	1
Enumeration	2
Enumeration	3
Enumeration	4
Source
<xs:simpleType name="BeachRoundPhase" xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:annotation>
    <xs:documentation>Phase.</xs:documentation>
  </xs:annotation>
  <xs:restriction base="xs:string">
    <xs:enumeration value="ConfederationQuota" />
    <xs:enumeration value="FederationQuota" />
    <xs:enumeration value="Qualification" />
    <xs:enumeration value="MainDraw" />
    <xs:enumeration value="1" />
    <xs:enumeration value="2" />
    <xs:enumeration value="3" />
    <xs:enumeration value="4" />
  </xs:restriction>
</xs:simpleType>
See Also
Beach Live Schema
 

 

© 2024 All Rights Reserved.

Send Feedback