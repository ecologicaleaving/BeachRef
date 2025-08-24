# Examples

### 1. Get Service Information (Public)

```bash
curl "https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='GetServiceInformation' />"
```

**Response:**
```xml
<Response Type="GetServiceInformation">
  <ServiceInformation Version="2.x.x" Status="Online" />
</Response>
```

### 2. Get Tournament List (Public - Metadata Only)

```bash
curl "https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='GetTournamentList' />"
```

**Response:**
```xml
<Response Type="GetTournamentList">
  <TournamentList Count="346">
    <Tournament No="1" />
    <Tournament No="2" />
    <!-- More tournaments... -->
  </TournamentList>
</Response>
```

### 3. Get Tournament Details (Authenticated)

```xml
<!-- POST request body -->
<Request Type="GetTournament" No="1" Username="your_username" Password="your_password" />
```

**Response:**
```xml
<Response Type="GetTournament">
  <Tournament No="1" Name="Tournament Name" Location="City, Country" StartDate="2024-01-01">
    <!-- Detailed tournament data -->
  </Tournament>
</Response>
```

### 4. Get Beach Match List with Filters

```xml
<Request Type="GetBeachMatchList" Year="2024" TournamentNo="123" />
```

### 5. Multiple Requests

```xml
<Requests Username="user" Password="pass">
  <Request Type="GetTournamentList" />
  <Request Type="GetPlayerList" Country="USA" />
  <Request Type="GetMatchList" Recent="1" />
</Requests>
```

---
