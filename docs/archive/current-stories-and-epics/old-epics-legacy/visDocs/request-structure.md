# Request Structure

### Base XML Format

```xml
<Request Type="RequestType" [Attribute1="Value1"] [Attribute2="Value2"] />
```

### Multiple Requests

```xml
<Requests Username="username" Password="password">
  <Request Type="GetTournamentList" />
  <Request Type="GetMatchList" />
</Requests>
```

### Response Formats

- **XML**: Default format, always available
- **JSON**: Available for select endpoints (growing list)

---
