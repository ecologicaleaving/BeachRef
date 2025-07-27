# Technical Assumptions

## Repository Structure: Monorepo
Single repository containing both frontend and backend code to simplify development and deployment processes for the MVP.

## Service Architecture
**Monolith Architecture:** Single web application with integrated frontend and backend services. This approach simplifies initial development, deployment, and maintenance while providing clear upgrade path to microservices if needed.

## Testing Requirements
**Unit + Integration Testing:** Comprehensive unit tests for business logic and integration tests for VIS API connectivity. Manual testing for UI/UX validation and cross-browser compatibility.

## Technical Stack (MVP)
- **Frontend Framework:** React with TypeScript for component-based UI development
- **UI Framework:** shadcn/ui components for consistent, professional interface
- **Backend Framework:** Node.js with Express for API development and VIS integration
- **Database:** None required for MVP (direct API calls)
- **Authentication:** None for MVP - direct access
- **API Integration:** RESTful integration with FIVB VIS web services
- **Hosting:** Simple cloud deployment
- **Styling:** Tailwind CSS (included with shadcn/ui)
