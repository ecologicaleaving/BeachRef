# Authentication

### Authentication Methods

The VIS API supports three authentication methods:

1. **JSON Web Token (JWT)** *(Recommended)*
2. **Basic Authentication** (Username/Password in HTTP headers)
3. **Request-level Authentication** (Username/Password in XML)

### Guest Access

For public data only, no authentication is required. You will be treated as a guest user with limited access to metadata.

### Example Authentication

```xml
<!-- Request-level authentication -->
<Requests Username="your_username" Password="your_password">
  <Request Type="GetTournament" No="123" />
</Requests>
```

---
