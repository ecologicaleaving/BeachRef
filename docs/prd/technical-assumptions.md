# Technical Assumptions

## Repository Structure: Monorepo
Single repository containing both frontend and backend code to simplify development and deployment processes for the MVP.

## Service Architecture
**Monolith Architecture:** Single web application with integrated frontend and backend services. This approach simplifies initial development, deployment, and maintenance while providing clear upgrade path to microservices if needed.

## Testing Requirements
**Unit + Integration Testing:** Comprehensive unit tests for business logic and integration tests for VIS API connectivity. Manual testing for UI/UX validation and cross-browser compatibility.

## Additional Technical Assumptions and Requests
- **Frontend Framework:** React with TypeScript for component-based UI development
- **Backend Framework:** Node.js with Express for API development and VIS integration
- **Database:** PostgreSQL for local data caching and user preferences
- **Authentication:** Integration with FIVB's OAuth2/SAML authentication system
- **API Integration:** RESTful integration with FIVB VIS web services
- **Hosting:** Cloud deployment on AWS or similar platform with auto-scaling capabilities
- **Caching Strategy:** Redis for API response caching to improve performance
- **Monitoring:** Application performance monitoring and error tracking implementation
