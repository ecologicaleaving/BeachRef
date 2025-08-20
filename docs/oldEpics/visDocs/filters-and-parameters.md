# Filters and Parameters

### Common Filter Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `Year` | Filter by year | `Year="2024"` |
| `Country` | Filter by country code | `Country="USA"` |
| `Federation` | Filter by federation | `Federation="FIVB"` |
| `TournamentNo` | Filter by tournament | `TournamentNo="123"` |
| `Recent` | Recent items only | `Recent="1"` |
| `Gender` | Filter by gender | `Gender="M"` or `Gender="W"` |

### Complex Filters

Some endpoints support complex filtering with XML structures:

```xml
<Request Type="GetBeachMatchList">
  <BeachMatchFilter>
    <TournamentNo>123</TournamentNo>
    <Year>2024</Year>
    <Phase>Finals</Phase>
  </BeachMatchFilter>
</Request>
```

---
