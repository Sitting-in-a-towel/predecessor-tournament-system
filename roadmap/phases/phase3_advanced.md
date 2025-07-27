# Phase 3: Draft System

**Status**: 📋 PLANNED  
**Duration**: Estimated 3-4 weeks  
**Priority**: HIGH  

## Objectives
Implement the complete captain's draft system with real-time pick/ban functionality, secure captain access, and spectator viewing.

## Planned Tasks

### 🔲 Draft Room Infrastructure
- [ ] Real-time draft room with WebSocket integration
- [ ] Captain authentication and secure access tokens
- [ ] Draft state management and persistence
- [ ] Draft room UI with hero selection interface
- [ ] Spectator view implementation

### 🔲 Pick/Ban System
- [ ] Customizable pick/ban order configuration
- [ ] Hero selection with role-based filtering
- [ ] Pick/ban validation and error handling
- [ ] Timer system for pick/ban phases
- [ ] Draft history and replay functionality

### 🔲 Captain-Specific Features
- [ ] Unique captain access links generation
- [ ] Captain-only draft controls
- [ ] Team composition preview
- [ ] Captain chat/communication system
- [ ] Draft strategy tools

### 🔲 Real-time Updates & Spectator Features
- [ ] Live draft progress broadcasting
- [ ] Spectator interface with read-only access
- [ ] Draft commentary and statistics
- [ ] Mobile spectator support
- [ ] Draft completion and match transition

### 🔲 Coin Toss & Draft Order
- [ ] Automated coin toss functionality
- [ ] First pick determination
- [ ] Draft order visualization
- [ ] Side selection (if applicable)
- [ ] Draft order persistence and audit trail

## Technical Implementation

### WebSocket Events
```javascript
// Draft-specific events
- 'join-draft' (draftId)
- 'leave-draft' (draftId)
- 'coin-toss' (result)
- 'pick-hero' (heroId, team, position)
- 'ban-hero' (heroId, team)
- 'draft-complete' (finalDraft)
- 'draft-error' (error)
```

### Security Requirements
- Captain tokens expire after 30 minutes
- Draft access limited to specific Discord users
- Spectator links are public but read-only
- Admin emergency stop functionality
- Draft action audit logging

### Database Updates
- DraftSessions table fully utilized
- Real-time draft state persistence
- Draft replay data storage
- Captain access logging

## Completion Criteria
- Captains can conduct full draft sessions
- Real-time updates work across all participants
- Spectators can view drafts without interaction
- Draft sessions persist and can be resumed
- Emergency admin controls function properly

## Testing Requirements

### Draft System Test Scenarios
1. **Complete Draft Flow**
   - Captain logs in via Discord
   - Accesses secure draft interface
   - Performs coin toss
   - Executes pick/ban phase
   - Spectators view draft progress
   - Draft completion and match start

2. **Error Handling Tests**
   - Network disconnection recovery
   - Invalid pick/ban attempts
   - Expired token handling
   - Captain no-show scenarios

3. **Security Tests**
   - Captain link access control
   - Token expiration handling
   - Unauthorized access attempts
   - Admin override functionality

## Integration Points
- Tournament bracket system
- Team roster verification
- Hero data from Omeda API
- Match scheduling system
- Notification system for draft start

## Risk Factors
- WebSocket connection stability
- Real-time synchronization challenges
- Captain availability coordination
- Browser compatibility for real-time features

## Success Metrics
- Draft completion rate: 95%+
- Real-time sync accuracy: 99%+
- Captain access success rate: 98%+
- Spectator viewing reliability: 97%+
- Draft session recovery rate: 90%+

## Prerequisites
- Phase 2 must be completed
- Team registration system functional
- Tournament brackets generated
- WebSocket infrastructure tested

## Post-Phase 3 Capabilities
- Full tournament lifecycle management
- Professional-grade draft experience
- Spectator engagement features
- Complete match preparation system