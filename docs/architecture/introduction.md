# Introduction

This document outlines the overall project architecture for **BeachRef**, including backend systems, shared services, and non-UI specific concerns. Its primary goal is to serve as the guiding architectural blueprint for AI-driven development, ensuring consistency and adherence to chosen patterns and technologies.

**Relationship to Frontend Architecture:**
If the project includes a significant user interface, a separate Frontend Architecture Document will detail the frontend-specific design and MUST be used in conjunction with this document. Core technology stack choices documented herein (see "Tech Stack") are definitive for the entire project, including any frontend components.

## Starter Template or Existing Project

**Decision:** From scratch with Flutter Web + Supabase integration
- **No starter template** - Building custom Flutter application
- **Technology Stack:** Flutter Web, Supabase PostgreSQL, Vercel deployment
- **Repository Strategy:** Single Flutter project with web target, positioned for future mobile expansion
- **Deployment:** Automated GitHub → Vercel pipeline for Flutter web builds
- **Authentication:** Google Auth via Supabase for MVP, with future FIVB integration path

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-26 | 1.0 | Initial architecture with Flutter/Supabase stack | BMad Master |
| 2025-07-26 | 1.1 | Added Google Auth via Supabase for MVP | BMad Master |
