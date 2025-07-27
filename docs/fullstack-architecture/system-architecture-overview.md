# System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VisConnect System                        │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + shadcn/ui)                     │
│  ├─ Tournament List Component                                   │
│  ├─ Tournament Detail Component                                 │
│  ├─ Match Results Component                                     │
│  └─ Filtering & Search Components                               │
├─────────────────────────────────────────────────────────────────┤
│  Backend API Layer (Node.js + Express)                         │
│  ├─ VIS Integration Service                                     │
│  ├─ Tournament Data Controller                                  │
│  ├─ Match Data Controller                                       │
│  └─ Health Check & Monitoring                                   │
├─────────────────────────────────────────────────────────────────┤
│  External Integration                                           │
│  └─ FIVB VIS API (HTTPS RESTful)                               │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Principles

1. **Simplicity First:** Monolith architecture for MVP with clear upgrade path
2. **Performance Focused:** Sub-3-second load times for all data operations
3. **Professional UI:** shadcn/ui components ensuring consistent, clean presentation
4. **Direct Integration:** No intermediate database, direct VIS API consumption
5. **Responsive Design:** Desktop and mobile optimization built-in
