# Contribution Picker

## Overview

A simple web-based "contribution picker" application where users can claim one of six mystery boxes to reveal a randomly assigned contribution number. The app features a clean, dark-themed UI with modal interactions for claiming boxes and sharing results via WhatsApp.

The core concept: six boxes each contain a hidden number (1-6, randomly distributed). Users enter their name to claim an unclaimed box and reveal their assigned number. Once claimed, boxes show a checkmark but keep the number private to the claiming user.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend-Only Architecture
- **Pure vanilla JavaScript, HTML, and CSS** - No frameworks or build tools
- Single-page application with all logic in `app.js`
- State management using browser localStorage for persistence
- Modal-based UI for user interactions (claim flow, result reveal)

### State Management
- Application state stored as JSON in localStorage under key `contribution_app_state`
- State structure contains array of 6 box objects with:
  - `id`: Box index
  - `claimed`: Boolean status
  - `name`: Claimer's name (null if unclaimed)
  - `secret`: Randomly assigned number 1-6

### UI Pattern
- Dark theme with CSS custom properties for consistent theming
- Grid layout for the 6 clickable boxes
- Two modals: claim confirmation and result reveal
- Responsive design with max-width container

### Deployment
- Configured for Vercel with SPA routing (all routes redirect to index.html)
- Static file hosting - no server-side processing needed

## External Dependencies

### Third-Party Services
- **WhatsApp Web** - Share functionality (via `share-wa-btn`) intended to open WhatsApp with pre-filled message

### Planned/Optional Integrations
- **Firebase** - Code comments indicate Firebase was considered for real-time persistence but currently uses localStorage as a mock substitute. Firebase secrets may be added later for multi-user sync.

### Hosting
- **Vercel** - Deployment configuration present in `vercel.json`

### No Build Dependencies
- No npm packages, bundlers, or transpilers required
- Files can be served directly as static assets