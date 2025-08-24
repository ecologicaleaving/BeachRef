BeachMatchStatus Simple Type
Description
Status for the match.
Namespace	(none)
Type
Restriction of xs:string
Diagram

Overview
	
BeachMatchStatus Restriction of xs:string
Status for the match.
Facets
Enumeration	1
Enumeration	2
Enumeration	3
Enumeration	4
Enumeration	5
Enumeration	6
Enumeration	7
Enumeration	8
Enumeration	9
Enumeration	10
Enumeration	11
Enumeration	12
Enumeration	13
Enumeration	14
Enumeration	15
Enumeration	Opened
Enumeration	ReadyToStart
Enumeration	InSet1
Enumeration	Set1Finished
Enumeration	InSet2
Enumeration	Set2Finished
Enumeration	InSet3
Enumeration	Set3Finished
Enumeration	InSet4
Enumeration	Set4Finished
Enumeration	InSet5
Enumeration	Finished
Enumeration	OfficialResult
Enumeration	Corrected
Enumeration	Closed
Source
<xs:simpleType name="BeachMatchStatus" xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:annotation>
    <xs:documentation>Status for the match.</xs:documentation>
  </xs:annotation>
  <xs:restriction base="xs:string">
    <xs:enumeration value="1" />
    <xs:enumeration value="2" />
    <xs:enumeration value="3" />
    <xs:enumeration value="4" />
    <xs:enumeration value="5" />
    <xs:enumeration value="6" />
    <xs:enumeration value="7" />
    <xs:enumeration value="8" />
    <xs:enumeration value="9" />
    <xs:enumeration value="10" />
    <xs:enumeration value="11" />
    <xs:enumeration value="12" />
    <xs:enumeration value="13" />
    <xs:enumeration value="14" />
    <xs:enumeration value="15" />
    <xs:enumeration value="Opened" />
    <xs:enumeration value="ReadyToStart" />
    <xs:enumeration value="InSet1" />
    <xs:enumeration value="Set1Finished" />
    <xs:enumeration value="InSet2" />
    <xs:enumeration value="Set2Finished" />
    <xs:enumeration value="InSet3" />
    <xs:enumeration value="Set3Finished" />
    <xs:enumeration value="InSet4" />
    <xs:enumeration value="Set4Finished" />
    <xs:enumeration value="InSet5" />
    <xs:enumeration value="Finished" />
    <xs:enumeration value="OfficialResult" />
    <xs:enumeration value="Corrected" />
    <xs:enumeration value="Closed" />
  </xs:restriction>
</xs:simpleType>
See Also
Beach Match Live Score Schema