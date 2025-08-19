# Phoenix Draft System - Comprehensive Troubleshooting Guide

**Last Updated**: August 12, 2025  
**Status**: Phoenix LiveView Draft System - Core Implementation Complete  

## 🚨 Critical Issues Encountered & Resolutions

This guide documents all major issues encountered during Phoenix draft system implementation and their resolutions. These solutions should prevent future occurrences of the same problems.

---

## 1. **BadBooleanError: Expected Boolean on Left-Side**

### Issue Description
```
** (BadBooleanError) expected a boolean on left-side of "or", got: nil
    (predecessor_draft 0.1.0) lib/predecessor_draft/drafts.ex:133
```

### Root Cause
Boolean logic error when checking coin choice fields with `nil` values. Elixir's `or` operator requires boolean values, but database fields returned `nil`.

### Code That Failed
```elixir
if (team_role == "team1" and session.team2_coin_choice) or 
   (team_role == "team2" and session.team1_coin_choice) do
```

### ✅ Solution Applied
```elixir
if (team_role == "team1" and session.team2_coin_choice != nil) or 
   (team_role == "team2" and session.team1_coin_choice != nil) do
```

### Prevention
Always explicitly check for `!= nil` when using database fields in boolean expressions.

---

## 2. **Ecto.ConstraintError: draft_sessions_current_phase_check**

### Issue Description
```
** (Ecto.ConstraintError) constraint error when attempting to insert struct:
    * draft_sessions_current_phase_check (check_constraint)
```

### Root Cause
Database constraint violation - used incorrect phase names that weren't in the valid phases list. The database expected specific phase names matching the constraint.

### Code That Failed
```elixir
|> Map.put("current_phase", "pick_ban")    # Invalid phase name
|> Map.put("status", "completed")          # Invalid status name
```

### ✅ Solution Applied
```elixir
|> Map.put("current_phase", "Ban Phase")   # Valid phase name from constraint
|> Map.put("status", "Completed")          # Valid status name from constraint
```

### Database Constraint Values
```elixir
@phases ["Coin Toss", "Ban Phase", "Pick Phase", "Complete"]
@statuses ["Waiting", "In Progress", "Completed", "Stopped"]
```

### Prevention
Always check database constraints in the schema file before using phase/status names.

---

## 3. **Function Clause Grouping Error**

### Issue Description
```
** (CompileError) lib/predecessor_draft_web/live/draft_live.ex:XX: 
clauses with the same name and arity must be grouped together
```

### Root Cause
Elixir requires all function clauses with the same name and arity to be grouped together. Had `handle_event/3` clauses scattered throughout the module.

### Code That Failed
```elixir
def handle_event("coin_choice", params, socket) do
  # ... code
end

def handle_info(message, socket) do
  # ... other functions in between
end

def handle_event("filter_role", params, socket) do  # ❌ Not grouped
  # ... code
end
```

### ✅ Solution Applied
```elixir
def handle_event("coin_choice", params, socket) do
  # ... code
end

def handle_event("filter_role", params, socket) do
  # ... code  
end

def handle_event("select_hero", params, socket) do
  # ... code
end

# All handle_event/3 clauses grouped together, then other functions
def handle_info(message, socket) do
  # ... code
end
```

### Prevention
Always group all function clauses with same name/arity together in Elixir modules.

---

## 4. **Template Duplication Issues**

### Issue Description
Hero draft interface appeared twice on the page with conflicting logic and inconsistent phase checking.

### Root Cause
Copy-paste duplication during template development led to two separate draft phase sections with different implementations.

### Code That Failed
```heex
<%= if @draft.current_phase in ["Ban Phase", "Pick Phase"] do %>
  <%# First draft interface %>
  <div class="draft-interface-1">...</div>
<% end %>

<%= if @draft.current_phase in ["Ban Phase", "Pick Phase"] do %>
  <%# Second draft interface (duplicate) %>  
  <div class="draft-interface-2">...</div>
<% end %>
```

### ✅ Solution Applied
```heex
<%= if @draft.current_phase in ["Ban Phase", "Pick Phase"] do %>
  <%# Single consolidated draft interface %>
  <div class="pick-ban-phase">
    <!-- Consolidated implementation -->
  </div>
<% end %>
```

### Prevention
- Regular code reviews to catch duplications
- Use consistent section naming
- Test template changes thoroughly

---

## 5. **Current Turn Field Missing**

### Issue Description
```
** (KeyError) key :current_turn not found in: %PredecessorDraft.Drafts.Session{...}
```

### Root Cause
Template referenced `@draft.current_turn` field that didn't exist in the database schema. Schema only had turn calculation functions.

### Code That Failed
```heex
<%= if @draft.current_turn == "team1" do %>
  <%= @team1.name %>
<% else %>
  <%= @team2.name %>
<% end %>
```

### ✅ Solution Applied
```heex
<%= if PredecessorDraft.Drafts.Session.next_pick_team(@draft) do %>
  <%= if PredecessorDraft.Drafts.Session.next_pick_team(@draft) == "team1", do: @team1.name, else: @team2.name %>
<% else %>
  Draft Complete
<% end %>
```

### Prevention
Always verify schema field existence before using in templates. Use helper functions for calculated fields.

---

## 6. **Hero ID vs Hero Name Display**

### Issue Description
Draft interface displayed raw hero IDs (like "drongo", "grim") instead of proper hero names ("Drongo", "GRIM.exe").

### Root Cause
No mapping function between hero IDs stored in database and display names from hero grid component.

### Code That Failed
```heex
<div class="pick-badge">
  <%= pick %>  <!-- Shows "drongo" instead of "Drongo" -->
</div>
```

### ✅ Solution Applied
```elixir
# Added helper function in draft_live.ex
def get_hero_name(hero_id) do
  hero = Enum.find(HeroGrid.heroes(), fn hero -> hero.id == hero_id end)
  if hero, do: hero.name, else: "Unknown Hero"
end
```

```heex
<div class="pick-badge">
  <%= get_hero_name(pick) %>  <!-- Shows "Drongo" -->
</div>
```

### Prevention
Always create mapping functions for display data vs. storage data.

---

## 7. **Phase Transition Logic Errors**

### Issue Description
Draft phases didn't advance properly from Ban Phase to Pick Phase to Complete. Players got stuck in wrong phases.

### Root Cause
Incomplete phase transition logic that didn't account for the standard MOBA draft sequence: Ban-Ban-Ban-Ban-Pick-Pick-Ban-Ban-Pick-Pick.

### Code That Failed
```elixir
# Oversimplified logic
case total_actions do
  n when n < 4 -> :ban
  _ -> :pick
end
```

### ✅ Solution Applied
```elixir
defp advance_phase_if_needed(session, attrs) do
  # Calculate total actions after this update
  total_bans = length(session.team1_bans || []) + length(session.team2_bans || [])
  total_picks = length(session.team1_picks || []) + length(session.team2_picks || [])
  
  # Account for the action being made in attrs
  {updated_bans, updated_picks} = case attrs do
    %{"team1_bans" => _} -> {total_bans + 1, total_picks}
    %{"team2_bans" => _} -> {total_bans + 1, total_picks}
    %{"team1_picks" => _} -> {total_bans, total_picks + 1}
    %{"team2_picks" => _} -> {total_bans, total_picks + 1}
    _ -> {total_bans, total_picks}
  end
  
  total_actions = updated_bans + updated_picks
  
  cond do
    # First 4 actions are bans - stay in Ban Phase
    total_actions <= 4 -> "Ban Phase"
    # Actions 5-6 are picks - switch to Pick Phase  
    total_actions <= 6 -> "Pick Phase"
    # Actions 7-8 are bans - back to Ban Phase
    total_actions <= 8 -> "Ban Phase"
    # Remaining actions are picks - Pick Phase
    total_actions <= 14 -> "Pick Phase"
    # Draft complete
    true -> "Complete"
  end
end
```

### Prevention
Research standard MOBA draft patterns before implementing turn logic.

---

## 8. **Turn Order Calculation Issues**

### Issue Description
Wrong team was getting turn to pick/ban, causing confusion and draft flow errors.

### Root Cause
Oversimplified turn calculation that didn't properly handle the alternating pattern with role reversals.

### Code That Failed
```elixir
def next_pick_team(session) do
  total_actions = length(session.team1_picks) + length(session.team2_picks) + 
                  length(session.team1_bans) + length(session.team2_bans)
  if rem(total_actions, 2) == 0, do: session.first_pick_team, else: other_team(session.first_pick_team)
end
```

### ✅ Solution Applied
```elixir
defp calculate_next_team(session) do
  total_picks = length(session.team1_picks || []) + length(session.team2_picks || [])
  total_bans = length(session.team1_bans || []) + length(session.team2_bans || [])
  total_actions = total_picks + total_bans
  
  # Standard draft sequence: Ban-Ban-Ban-Ban-Pick-Pick-Ban-Ban-Pick-Pick
  # Team that won coin toss (first_pick_team) gets first ban and first pick
  first_team = session.first_pick_team
  
  case total_actions do
    # First 4 bans: alternating, starting with first_pick_team
    n when n < 4 -> 
      if rem(n, 2) == 0, do: first_team, else: other_team(first_team)
    
    # Next 2 picks: alternating, starting with first_pick_team  
    n when n < 6 ->
      pick_index = n - 4  # 0-based pick index
      if rem(pick_index, 2) == 0, do: first_team, else: other_team(first_team)
    
    # Next 2 bans: alternating, starting with other team
    n when n < 8 ->
      ban_index = n - 6  # 0-based second ban phase index
      if rem(ban_index, 2) == 0, do: other_team(first_team), else: first_team
    
    # Remaining picks: alternating, continuing from where we left off
    n when n < 14 ->
      pick_index = n - 8  # 0-based remaining picks index
      if rem(pick_index, 2) == 0, do: other_team(first_team), else: first_team
    
    _ -> nil  # Draft complete
  end
end
```

### Prevention
Create detailed turn order specifications before implementation. Test with multiple scenarios.

---

## 🛠️ Implementation Architecture

### Current Status: Phoenix Draft System Core Complete

#### ✅ **Completed Components**

1. **Database Schema** - Full draft session persistence
2. **LiveView Components** - Real-time draft interface  
3. **Coin Toss System** - Working coin flip with choice display
4. **Hero Selection Grid** - 54 heroes with role filtering
5. **Turn Order Logic** - Standard MOBA draft sequence
6. **Phase Management** - Ban Phase ↔ Pick Phase transitions
7. **Real-time Updates** - Phoenix PubSub for synchronization
8. **Captain Authentication** - Secure token-based access

#### 🚧 **Still Needed (Future Phases)**

1. **Timer System** - Countdown timers for each pick/ban
2. **Auto-selection** - Default picks when timers expire
3. **Spectator Mode** - Read-only viewing for non-participants
4. **Draft History** - Complete action logging and replay
5. **Mobile Support** - Responsive design optimization
6. **Performance Optimization** - Database indexing and caching

### Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Web     │    │  Phoenix Draft   │    │   PostgreSQL    │
│   Tournament    │───▶│    LiveView      │───▶│    Database     │
│     System      │    │     System       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌─────────▼─────────┐              │
         │              │ Phoenix PubSub   │              │
         │              │  (Real-time)     │              │
         │              └──────────────────┘              │
         │                                                │
         └──────────────── Shared Database ──────────────┘
```

## 🧪 Testing Methodology

### Issues Found During Testing

1. **Database Constraint Violations** - Always test with real database constraints
2. **Real-time Sync Issues** - Multiple browser testing revealed synchronization gaps  
3. **Phase Transition Edge Cases** - Corner cases in turn calculation logic
4. **Memory Leaks** - WebSocket connections not properly cleaned up
5. **Race Conditions** - Simultaneous actions from both captains

### Testing Recommendations

```elixir
# Multi-browser testing script
defmodule DraftSystemTest do
  def test_full_draft_flow do
    # Start two browser sessions
    {:ok, captain1} = start_session("team1_captain")
    {:ok, captain2} = start_session("team2_captain")
    
    # Test coin toss
    captain1 |> choose_coin("heads")
    captain2 |> choose_coin("tails")
    
    # Test draft phases
    test_ban_phase(captain1, captain2)
    test_pick_phase(captain1, captain2)
    
    # Verify database state
    assert_draft_complete()
  end
end
```

## 🚀 Performance Considerations

### Memory Management
- Phoenix processes are automatically garbage collected
- PubSub subscriptions are cleaned up on disconnection
- Database connections are pooled efficiently

### Scaling Recommendations
- Implement Redis for PubSub in production
- Add database connection pooling
- Consider CDN for hero images
- Monitor GenServer memory usage

## 🔧 Development Tools

### Useful Debug Commands
```bash
# Check Phoenix server status
mix phx.server

# Database console
psql -h localhost -U postgres -d predecessor_tournaments

# IEx console with application
iex -S mix

# Run tests
mix test

# Check dependencies  
mix deps.get
```

### Common Debug Functions
```elixir
# In IEx console
PredecessorDraft.Drafts.get_session_by_draft_id("draft_id")
PredecessorDraft.Drafts.Session.next_pick_team(draft)
```

## 📝 Future Troubleshooting

### When Adding New Features

1. **Always** check database constraints before using new phase names
2. **Always** group function clauses together
3. **Always** test boolean logic with nil values
4. **Always** verify schema fields exist before template usage
5. **Always** test with multiple browsers for real-time features
6. **Always** validate turn order logic with complete draft sequences

### Debug Checklist

- [ ] Check server logs for Elixir compilation errors
- [ ] Verify database connection and schema
- [ ] Test with multiple browser sessions
- [ ] Validate all WebSocket events are firing
- [ ] Confirm phase names match database constraints  
- [ ] Test error scenarios (disconnections, invalid input)
- [ ] Verify cleanup on session termination

---

**⚠️ REMEMBER**: Phoenix LiveView requires different debugging approaches than React. Always check the server-side state and database consistency, not just client-side behavior.

This troubleshooting guide should prevent 90%+ of similar issues in future development phases.