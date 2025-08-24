# Development Notes

### Testing with Browser

You can test GET requests directly in a browser:

```
https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='GetServiceInformation' />
```

### Production Recommendations

- Use POST requests with form data or HTTP payload (not query string)
- Implement proper authentication token management
- Cache public data appropriately
- Monitor response times and implement timeouts

### Contact and Support

- **Email**: vis.sdk@fivb.org
- **Documentation**: This CHM file contains the complete API reference
- **Updates**: Check service information endpoint for version changes

---
