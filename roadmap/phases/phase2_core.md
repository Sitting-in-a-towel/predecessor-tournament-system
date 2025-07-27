# Phase 2: Core Features

**Status**: 🔄 READY TO START  
**Duration**: Estimated 2-3 weeks  
**Priority**: HIGH  

## Objectives
Implement the core tournament management features including tournament creation, team registration, and basic admin functionality.

## Planned Tasks

### 🔲 Tournament Creation & Viewing System
- [ ] Complete tournament creation form with validation
- [ ] Public tournament listing page with filters
- [ ] Tournament detail pages with bracket display
- [ ] Tournament status management (Planning → Registration → In Progress → Completed)
- [ ] Tournament settings (bracket type, match formats, team limits)

### 🔲 Team Registration & Management
- [ ] Team creation workflow
- [ ] Player invitation system
- [ ] Team roster management (players + substitutes)
- [ ] Team confirmation process
- [ ] Captain team management dashboard

### 🔲 Basic Admin Panel Functionality
- [ ] Admin dashboard with statistics
- [ ] Tournament management controls
- [ ] User management (view, edit admin status)
- [ ] Hero management (enable/disable for drafts)
- [ ] System health monitoring

### 🔲 Notification System Foundation
- [ ] Notification data structure
- [ ] Basic notification creation and display
- [ ] User notification preferences
- [ ] Real-time notification updates

### 🔲 Omeda API Integration
- [ ] Hero data fetching and caching
- [ ] Hero image integration
- [ ] Player stats lookup (if available)
- [ ] Automatic hero data updates

## Completion Criteria
- Users can create tournaments with all specified formats
- Teams can register and manage their rosters
- Admins can manage tournaments and users
- Public users can view tournament information
- Hero data is integrated for draft preparation

## Technical Requirements
- All API endpoints fully implemented
- Form validation on frontend and backend
- Real-time updates via WebSocket where needed
- Proper error handling and user feedback
- Mobile-friendly (basic functionality, not optimized)

## Dependencies
- Phase 1 must be completed
- Airtable database must be set up
- Discord OAuth must be configured

## Testing Requirements
- Complete tournament creation workflow
- Team registration and management workflow
- Admin panel functionality
- API endpoint testing
- Authentication flow testing

## Risk Factors
- Omeda API availability and rate limits
- Discord OAuth configuration complexity
- Airtable API rate limiting for high-usage features

## Success Metrics
- Tournament creation success rate: 95%+
- Team registration completion rate: 90%+
- Admin operations success rate: 98%+
- Page load times under 3 seconds
- Zero critical security vulnerabilities

## Phase 2 File Structure Updates
```
frontend/src/
├── components/
│   ├── Tournament/
│   │   ├── TournamentCreation.js ✓
│   │   ├── TournamentView.js ✓
│   │   └── BracketDisplay.js
│   ├── Team/
│   │   ├── TeamSignup.js ✓
│   │   ├── TeamManagement.js ✓
│   │   └── PlayerInvites.js
│   └── Admin/
│       ├── AdminPanel.js ✓
│       └── AdminControls.js
└── services/
    ├── tournamentService.js
    ├── teamService.js
    └── omedaAPI.js

backend/
├── services/
│   ├── omeda.js
│   └── notification.js
└── routes/
    └── [all routes completed] ✓
```

## Ready to Begin
- All Phase 1 infrastructure is in place
- Development environment is fully configured
- Database schema is implemented
- Authentication system is working