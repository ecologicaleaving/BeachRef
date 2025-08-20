# API Endpoints

### Core Service Endpoints

All requests go through the main XML endpoint with different request types:

```
https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='...' />
```

### Public vs. Authenticated Access

- **Public Data**: Tournament lists, player lists, match lists (metadata only)
- **Authenticated Data**: Detailed tournament info, match results, player details, live data

---
