# 🚀 Phoenix LiveView Draft System Migration Guide

## 📋 Overview
We are migrating the draft system from React/Socket.io to Phoenix LiveView to resolve persistent WebSocket issues and achieve Exfang-level reliability.

## 🎯 Migration Scope

### **What's Being Rebuilt**
- `/draft/*` pages - Complete draft interface
- Real-time coordination - Coin toss, pick/ban, timers
- WebSocket management - Automatic with LiveView
- State management - Server-side, automatic sync

### **What Stays the Same**
- PostgreSQL database - All data preserved
- Tournament system - React/Node.js unchanged
- Authentication - Discord OAuth continues
- User management - No changes
- Team system - Fully preserved

## 🏗️ Architecture

### **Current (Broken)**
```
React Frontend ↔ Socket.io ↔ Node.js Backend ↔ PostgreSQL
    ↓                           ↓
Complex state           Manual WebSocket management
```

### **New (Phoenix LiveView)**
```
Tournament System (React) → Creates Draft → Phoenix Draft System
                                                ↓
                                           PostgreSQL
```

## 📅 Timeline

### **Phase 1: Setup (Week 1-2)**
- [ ] Install Elixir/Phoenix development environment
- [ ] Create Phoenix LiveView project
- [ ] Configure PostgreSQL connection
- [ ] Setup basic routing structure
- [ ] Create draft data models

### **Phase 2: Core Features (Week 3-4)**
- [ ] Implement coin toss with real-time updates
- [ ] Build waiting modal system
- [ ] Add captain presence detection
- [ ] Create turn management logic
- [ ] Test multi-browser coordination

### **Phase 3: Draft Interface (Week 5-6)**
- [ ] Design hero selection grid
- [ ] Implement pick/ban phases
- [ ] Add countdown timers
- [ ] Create spectator mode
- [ ] Build draft history/replay

### **Phase 4: Integration (Week 7-8)**
- [ ] Connect React tournament to Phoenix drafts
- [ ] Pass authentication tokens
- [ ] Update URL routing
- [ ] Comprehensive testing
- [ ] Deployment configuration

## 🛠️ Development Setup

### **Prerequisites**
```bash
# Install Elixir (Windows)
1. Download installer from https://elixir-lang.org/install.html
2. Install Erlang OTP 25+
3. Install Elixir 1.14+

# Install Phoenix
mix archive.install hex phx_new

# Install Node.js dependencies for Phoenix
npm install --prefix assets
```

### **Project Creation**
```bash
# Create Phoenix LiveView project
mix phx.new predecessor_draft --live --database postgres

# Configure database connection
# Edit config/dev.exs with existing PostgreSQL credentials
```

### **Running Phoenix**
```bash
# Start Phoenix server
mix phx.server

# Phoenix runs on http://localhost:4000
# LiveDashboard at http://localhost:4000/dev/dashboard
```

## 🔧 Launcher Updates

### **Updated Development Launcher**
```batch
@echo off
echo Starting Predecessor Development Environment with Phoenix...

:: Start PostgreSQL (should already be running as service)
echo Checking PostgreSQL...

:: Start Phoenix Draft System
start "Phoenix Draft System" cmd /k "cd phoenix_draft && mix phx.server"

:: Start React Frontend
start "React Frontend" cmd /k "cd frontend && npm start"

:: Start Node.js Backend
start "Node.js Backend" cmd /k "cd backend && npm run dev"

echo All services started!
pause
```

## 🚨 Troubleshooting

### **Common Issues**

#### **PostgreSQL Connection**
```elixir
# Problem: Can't connect to PostgreSQL
# Solution: Update config/dev.exs
config :predecessor_draft, PredecessorDraft.Repo,
  username: "postgres",
  password: "Antigravity7@!89",
  database: "predecessor_tournaments",
  hostname: "localhost",
  port: 5432
```

#### **Port Conflicts**
```bash
# Phoenix defaults to port 4000
# If conflict, change in config/dev.exs
config :predecessor_draft, PredecessorDraftWeb.Endpoint,
  http: [port: 4001]
```

#### **Asset Compilation**
```bash
# If assets not loading
cd assets && npm install
mix phx.digest
```

## 🔄 Integration Points

### **Creating Draft from React**
```javascript
// In React tournament system
const createDraft = async (tournamentId, matchId) => {
  // Create draft in PostgreSQL
  const draft = await api.post('/drafts', { tournamentId, matchId });
  
  // Redirect to Phoenix draft system
  window.location.href = `http://localhost:4000/draft/${draft.id}?captain=1`;
};
```

### **Passing Authentication**
```javascript
// Pass auth token to Phoenix
const token = localStorage.getItem('authToken');
window.location.href = `http://localhost:4000/draft/${draftId}?token=${token}`;
```

### **Reading Draft Results**
```elixir
# Phoenix exposes API for React to read results
def get_draft_results(conn, %{"id" => draft_id}) do
  draft = Drafts.get_draft!(draft_id)
  json(conn, %{
    team1_picks: draft.team1_picks,
    team2_picks: draft.team2_picks,
    team1_bans: draft.team1_bans,
    team2_bans: draft.team2_bans
  })
end
```

## 📊 Success Metrics

### **Technical Goals**
- ✅ WebSocket connections stable
- ✅ Real-time updates < 100ms latency
- ✅ Automatic reconnection on disconnect
- ✅ Support 5+ concurrent drafts
- ✅ Zero WebSocket errors

### **User Experience Goals**
- ✅ Instant coin toss response
- ✅ Smooth timer countdowns
- ✅ No "waiting" without feedback
- ✅ Clear error messages
- ✅ Mobile-responsive draft interface

## 🎯 Migration Checklist

### **Pre-Migration**
- [x] Document current system issues
- [x] Analyze Exfang's approach
- [x] Plan Phoenix architecture
- [x] Update project documentation
- [x] Clean up project files

### **During Migration**
- [ ] Setup Phoenix project
- [ ] Migrate database models
- [ ] Implement core features
- [ ] Test multi-user scenarios
- [ ] Integrate with React

### **Post-Migration**
- [ ] Update all documentation
- [ ] Create user guides
- [ ] Performance testing
- [ ] Deploy to production
- [ ] Monitor for issues

## 📚 Resources

### **Phoenix LiveView**
- [Official Docs](https://hexdocs.pm/phoenix_live_view)
- [LiveView Course](https://pragmaticstudio.com/phoenix-liveview)
- [Real-time Examples](https://github.com/phoenixframework/phoenix_live_view_examples)

### **Elixir**
- [Getting Started](https://elixir-lang.org/getting-started/introduction.html)
- [Elixir School](https://elixirschool.com/)
- [PostgreSQL with Ecto](https://hexdocs.pm/ecto/getting-started.html)

## 🤝 Support

### **Community Help**
- Phoenix Forum: https://elixirforum.com/c/phoenix-forum
- Elixir Slack: https://elixir-slack.community/
- Stack Overflow: [phoenix-liveview] tag

### **Project-Specific**
- Document issues in: `/documentation/PHOENIX_ISSUES.md`
- Track progress in: `/documentation/PHOENIX_PROGRESS.md`
- Test results in: `/tests/phoenix/`

---

**Last Updated**: January 9, 2025
**Status**: Migration Planning Complete, Ready to Begin Implementation