
Beach Match Live Score Schema
Collapse All
Beach Match Live Score Schema : BeachMatchLiveScore Element
BeachMatchLiveScore Element
Description
Live score for a beach volleyball match.
Namespace	(none)
Diagram

Overview
	
BeachMatchLiveScore
Live score for a beach volleyball match.
	
No required xs:positiveInteger
Unique number of the match.
	
RefreshDelay optional xs:positiveInteger
Delay in seconds before the next refresh request must be sent to the web service. This attribute is optional and, if not defined, a default value of 20 must be used.
	
Version required xs:positiveInteger
Version of the live score. Can be used in the request to know if there is an update to the live score in memory.
	
Choice
	
BeachMatch
Data of the beach volleyball match.
	
DurationSet1 optional xs:unsignedInt
Duration of set 1. This value is expressed in seconds. If set 1 has not been started, this attribute must be omitted.
	
DurationSet2 optional xs:unsignedInt
Duration of set 2. This value is expressed in seconds. If set 2 has not been started, this attribute must be omitted.
	
DurationSet3 optional xs:unsignedInt
Duration of set 3. This value is expressed in seconds. If set 3 has not been started, this attribute must be omitted.
	
DurationSet4 optional xs:unsignedInt
Duration of set 4. This value is expressed in seconds. If set 4 has not been started, this attribute must be omitted.
	
DurationSet5 optional xs:unsignedInt
Duration of set 5. This value is expressed in seconds. If set 5 has not been started, this attribute must be omitted.
	
LastServeSpeed optional xs:positiveInteger
Speed of the last serve. This value is expressed in m/h (meter per hour). If this value is not known, this attribute must be omitted.
	
MatchPointsA required xs:unsignedInt
Number of match points for team A.
	
MatchPointsB required xs:unsignedInt
Number of match points for team B.
	
NoServingPlayer optional xs:positiveInteger
Number of the player that is serving for the current rally, or that will serve the next point, if the point is finished. If this value is not known or a set is not played, this attribute must be omitted.
	
PointsTeamASet1 optional xs:unsignedInt
Number of points for team A in set 1. If set 1 has not been started, this attribute must be omitted.
	
PointsTeamASet2 optional xs:unsignedInt
Number of points for team A in set 2. If set 2 has not been started, this attribute must be omitted.
	
PointsTeamASet3 optional xs:unsignedInt
Number of points for team A in set 3. If set 3 has not been started, this attribute must be omitted.
	
PointsTeamASet4 optional xs:unsignedInt
Number of points for team A in set 4. If set 4 has not been started, this attribute must be omitted.
	
PointsTeamASet5 optional xs:unsignedInt
Number of points for team A in set 5. If set 5 has not been started, this attribute must be omitted.
	
PointsTeamBSet1 optional xs:unsignedInt
Number of points for team B in set 1. If set 1 has not been started, this attribute must be omitted.
	
PointsTeamBSet2 optional xs:unsignedInt
Number of points for team B in set 2. If set 2 has not been started, this attribute must be omitted.
	
PointsTeamBSet3 optional xs:unsignedInt
Number of points for team B in set 3. If set 3 has not been started, this attribute must be omitted.
	
PointsTeamBSet4 optional xs:unsignedInt
Number of points for team B in set 4. If set 4 has not been started, this attribute must be omitted.
	
PointsTeamBSet5 optional xs:unsignedInt
Number of points for team B in set 5. If set 5 has not been started, this attribute must be omitted.
	
ResultType optional Restriction of ResultType Simple Type
Indicates how the match was finished. Value between 0 and 9. If this value is not known, this attribute must be omitted.
	
ResultTypeText optional xs:string
Additional information about the result type. If there is no such text, this attribute must be omitted.
	
Status required Restriction of BeachMatchStatus Simple Type
Status. See http://www.fivb.org/VisSDK/VisWebService/?BeachMatchStatus.html#BeachMatchStatus.html for valid values.
Attributes
Name	Type	Use	Default	Fixed	Description
No	xs:positiveInteger	required	 	 	Unique number of the match.
RefreshDelay	xs:positiveInteger	optional	 	 	Delay in seconds before the next refresh request must be sent to the web service. This attribute is optional and, if not defined, a default value of 20 must be used.
Version	xs:positiveInteger	required	 	 	Version of the live score. Can be used in the request to know if there is an update to the live score in memory.
Source
<xs:element name="BeachMatchLiveScore" xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:annotation>
    <xs:documentation>Live score for a beach volleyball match.</xs:documentation>
  </xs:annotation>
  <xs:complexType>
    <xs:choice>
      <xs:annotation>
        <xs:documentation>Choice of the content.</xs:documentation>
      </xs:annotation>
      <xs:element name="BeachMatch">
        <xs:annotation>
          <xs:documentation>Data of the beach volleyball match.</xs:documentation>
        </xs:annotation>
        <xs:complexType>
          <xs:attribute name="DurationSet1" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Duration of set 1.
This value is expressed in seconds.
If set 1 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="DurationSet2" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Duration of set 2.
This value is expressed in seconds.
If set 2 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="DurationSet3" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Duration of set 3.
This value is expressed in seconds.
If set 3 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="DurationSet4" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Duration of set 4.
This value is expressed in seconds.
If set 4 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="DurationSet5" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Duration of set 5.
This value is expressed in seconds.
If set 5 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="LastServeSpeed" type="xs:positiveInteger">
            <xs:annotation>
              <xs:documentation>Speed of the last serve.
This value is expressed in m/h (meter per hour).
If this value is not known, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="MatchPointsA" type="xs:unsignedInt" use="required">
            <xs:annotation>
              <xs:documentation>Number of match points for team A.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="MatchPointsB" type="xs:unsignedInt" use="required">
            <xs:annotation>
              <xs:documentation>Number of match points for team B.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="NoServingPlayer" type="xs:positiveInteger">
            <xs:annotation>
              <xs:documentation>Number of the player that is serving for the current rally, or that will serve the next point, if the point is finished.
If this value is not known or a set is not played, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamASet1" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team A in set 1.
If set 1 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamASet2" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team A in set 2.
If set 2 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamASet3" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team A in set 3.
If set 3 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamASet4" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team A in set 4.
If set 4 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamASet5" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team A in set 5.
If set 5 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamBSet1" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team B in set 1.
If set 1 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamBSet2" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team B in set 2.
If set 2 has not been started, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamBSet3" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team B in set 3.
If set 3 has not been started, this attribute must be omitted.
</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamBSet4" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team B in set 4.
If set 4 has not been started, this attribute must be omitted.
</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="PointsTeamBSet5" type="xs:unsignedInt">
            <xs:annotation>
              <xs:documentation>Number of points for team B in set 5.
If set 5 has not been started, this attribute must be omitted.
</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="ResultType">
            <xs:annotation>
              <xs:documentation>Indicates how the match was finished.
Value between 0 and 9.
If this value is not known, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
            <xs:simpleType>
              <xs:restriction base="ResultType" />
            </xs:simpleType>
          </xs:attribute>
          <xs:attribute name="ResultTypeText" type="xs:string">
            <xs:annotation>
              <xs:documentation>Additional information about the result type.
If there is no such text, this attribute must be omitted.</xs:documentation>
            </xs:annotation>
          </xs:attribute>
          <xs:attribute name="Status" use="required">
            <xs:annotation>
              <xs:documentation>Status.
See http://www.fivb.org/VisSDK/VisWebService/?BeachMatchStatus.html#BeachMatchStatus.html for valid values.</xs:documentation>
            </xs:annotation>
            <xs:simpleType>
              <xs:restriction base="BeachMatchStatus" />
            </xs:simpleType>
          </xs:attribute>
        </xs:complexType>
      </xs:element>
    </xs:choice>
    <xs:attribute name="No" type="xs:positiveInteger" use="required">
      <xs:annotation>
        <xs:documentation>Unique number of the match.</xs:documentation>
      </xs:annotation>
    </xs:attribute>
    <xs:attribute name="RefreshDelay" type="xs:positiveInteger">
      <xs:annotation>
        <xs:documentation>Delay in seconds before the next refresh request must be sent to the web service.
This attribute is optional and, if not defined, a default value of 20 must be used.</xs:documentation>
      </xs:annotation>
    </xs:attribute>
    <xs:attribute name="Version" type="xs:positiveInteger" use="required">
      <xs:annotation>
        <xs:documentation>Version of the live score.
Can be used in the request to know if there is an update to the live score in memory.</xs:documentation>
      </xs:annotation>
    </xs:attribute>
  </xs:complexType>
</xs:element>
See Also
Beach Match Live Score Schema
 

 

© 2024 All Rights Reserved.

Send Feedback