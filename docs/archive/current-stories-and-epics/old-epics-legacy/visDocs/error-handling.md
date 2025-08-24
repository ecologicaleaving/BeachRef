# Error Handling

### XML Error Response Format

```xml
<Response Type="Error">
  <Error Code="401" Message="Authentication required" />
</Response>
```

### JSON Error Response Format

```json
{
  "error": {
    "code": 401,
    "message": "Authentication required"
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Check request format and parameters |
| 401 | Unauthorized | Provide valid authentication credentials |
| 403 | Forbidden | User lacks permission for this data |
| 404 | Not Found | Requested resource doesn't exist |
| 500 | Server Error | Contact FIVB support |

---
