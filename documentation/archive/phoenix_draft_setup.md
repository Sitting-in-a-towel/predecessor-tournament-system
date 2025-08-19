# Phoenix Draft System - Implementation Blueprint

## Phase 1: Foundation (What we'll build first)

### Project Creation
```bash
# Create Phoenix project with specific options
mix phx.new predecessor_draft --live --no-dashboard --no-mailer --no-gettext

# Why these options:
# --live: Include LiveView
# --no-dashboard: We don't need Phoenix admin dashboard
# --no-mailer: No email functionality needed
# --no-gettext: No internationalization needed
```

### Database Configuration
```elixir
# config/dev.exs
config :predecessor_draft, PredecessorDraft.Repo,
  username: "postgres",
  password: "Antigravity7@!89",
  database: "predecessor_tournaments",
  hostname: "localhost",
  port: 5432,
  pool_size: 10,
  # Important: Don't let Phoenix manage migrations
  migration_source: "phoenix_schema_migrations",
  # Use existing schema
  migration_primary_key: [type: :binary_id]
```

### Context Design
```
PredecessorDraft/
├── Drafts/          # Core draft logic
│   ├── Session      # Draft session management
│   ├── CoinToss     # Coin toss logic
│   └── Timer        # Timer management
├── Heroes/          # Hero/character data
│   └── Hero         # Hero information
├── Teams/           # Team integration
│   └── Team         # Read-only team data
└── Accounts/        # User integration
    └── User         # Read-only user data
```

## Critical Implementation Details

### 1. Ecto Schema Mapping
```elixir
# Map to existing draft_sessions table
defmodule PredecessorDraft.Drafts.Session do
  use Ecto.Schema
  
  @primary_key {:id, :binary_id, autogenerate: false}
  
  schema "draft_sessions" do
    field :draft_id, :string
    field :match_id, :binary_id
    field :tournament_id, :binary_id
    field :status, :string
    field :current_phase, :string
    
    # Relationships
    belongs_to :team1, PredecessorDraft.Teams.Team,
      foreign_key: :team1_id,
      type: :binary_id
    belongs_to :team2, PredecessorDraft.Teams.Team,
      foreign_key: :team2_id,
      type: :binary_id
    
    # Captain tracking
    field :team1_captain_id, :binary_id
    field :team2_captain_id, :binary_id
    
    # Coin toss fields
    field :team1_coin_choice, :string
    field :team2_coin_choice, :string
    field :coin_toss_winner, :string
    field :coin_toss_result, :string
    
    # Connection tracking
    field :team1_connected, :boolean, default: false
    field :team2_connected, :boolean, default: false
    
    timestamps(inserted_at: :created_at, updated_at: :updated_at)
  end
end
```

### 2. LiveView Component Structure
```elixir
defmodule PredecessorDraftWeb.DraftLive do
  use PredecessorDraftWeb, :live_view
  
  def mount(%{"draft_id" => draft_id, "captain" => captain}, session, socket) do
    # Validate authentication token
    with {:ok, user} <- validate_token(session["token"]),
         {:ok, draft} <- load_draft(draft_id),
         :ok <- authorize_captain(user, draft, captain) do
      
      # Subscribe to draft updates
      PredecessorDraftWeb.Endpoint.subscribe("draft:#{draft_id}")
      
      # Track presence
      {:ok, _} = Presence.track(
        self(),
        "draft:#{draft_id}",
        captain,
        %{user_id: user.id, joined_at: DateTime.utc_now()}
      )
      
      {:ok,
       socket
       |> assign(:draft, draft)
       |> assign(:user, user)
       |> assign(:role, String.to_atom("team#{captain}"))
       |> assign(:waiting, !both_captains_present?(draft_id))
       |> assign(:phase, draft.current_phase)}
    else
      _ -> {:ok, redirect(socket, to: "/error")}
    end
  end
  
  # Handle real-time events
  def handle_event("coin_toss_choice", %{"choice" => choice}, socket) do
    # This automatically syncs to all connected clients!
    case Drafts.make_coin_toss_choice(socket.assigns.draft, socket.assigns.role, choice) do
      {:ok, updated_draft} ->
        broadcast_update(updated_draft)
        {:noreply, assign(socket, :draft, updated_draft)}
      
      {:error, reason} ->
        {:noreply, put_flash(socket, :error, reason)}
    end
  end
end
```

### 3. Real-time Presence Tracking
```elixir
defmodule PredecessorDraftWeb.Presence do
  use Phoenix.Presence,
    otp_app: :predecessor_draft,
    pubsub_server: PredecessorDraft.PubSub
  
  def fetch(_topic, presences) do
    # Enhance presence data with user information
    for {key, %{metas: metas}} <- presences, into: %{} do
      {key, %{
        metas: metas,
        user: get_user_info(hd(metas).user_id)
      }}
    end
  end
end
```

### 4. Authentication Token Validation
```elixir
defmodule PredecessorDraft.Auth do
  @doc """
  Validates a token from the React app
  """
  def validate_token(nil), do: {:error, :no_token}
  
  def validate_token(token) do
    # Check token in database
    case Repo.get_by(User, auth_token: token) do
      nil -> {:error, :invalid_token}
      user -> {:ok, user}
    end
  end
  
  @doc """
  Creates a Phoenix session from React auth
  """
  def create_session(conn, token) do
    with {:ok, user} <- validate_token(token) do
      conn
      |> put_session(:user_id, user.id)
      |> put_session(:is_admin, user.is_admin)
    end
  end
end
```

## Quality Assurance Strategy

### Testing Approach
```elixir
# test/predecessor_draft_web/live/draft_live_test.exs
defmodule PredecessorDraftWeb.DraftLiveTest do
  use PredecessorDraftWeb.ConnCase
  import Phoenix.LiveViewTest
  
  test "both captains can see each other's coin toss choices", %{conn: conn} do
    draft = create_draft()
    
    # Captain 1 connects
    {:ok, view1, _html} = live(conn, "/draft/#{draft.draft_id}?captain=1")
    
    # Captain 2 connects
    {:ok, view2, _html} = live(conn, "/draft/#{draft.draft_id}?captain=2")
    
    # Captain 1 chooses heads
    view1
    |> element("#coin-toss-heads")
    |> render_click()
    
    # Captain 2 should see heads is disabled
    assert view2
           |> element("#coin-toss-heads")
           |> render() =~ "disabled"
    
    # Captain 2 chooses tails
    view2
    |> element("#coin-toss-tails")
    |> render_click()
    
    # Both should see the result
    assert render(view1) =~ "Coin toss complete"
    assert render(view2) =~ "Coin toss complete"
  end
end
```

### Performance Monitoring
```elixir
# lib/predecessor_draft_web/telemetry.ex
defmodule PredecessorDraftWeb.Telemetry do
  use Supervisor
  
  def metrics do
    [
      # Track LiveView performance
      summary("phoenix.live_view.mount.duration",
        unit: {:native, :millisecond}
      ),
      summary("phoenix.live_view.handle_event.duration",
        unit: {:native, :millisecond}
      ),
      
      # Track draft-specific metrics
      counter("draft.coin_toss.attempts"),
      counter("draft.websocket.connections"),
      summary("draft.presence.update.duration",
        unit: {:native, :millisecond}
      )
    ]
  end
end
```

## Integration Points

### React → Phoenix Handoff
```javascript
// In React tournament system
const startDraft = async (matchId) => {
  // Create draft in database
  const draft = await api.post('/api/drafts', {
    matchId,
    tournamentId,
    team1Id,
    team2Id
  });
  
  // Generate auth token for current user
  const token = await api.post('/api/auth/draft-token', {
    draftId: draft.id,
    userId: currentUser.id
  });
  
  // Redirect to Phoenix with token
  const phoenixUrl = process.env.REACT_APP_PHOENIX_URL || 'http://localhost:4000';
  window.location.href = `${phoenixUrl}/draft/${draft.draft_id}?token=${token}&captain=${captainNumber}`;
};
```

### Phoenix → React Callback
```elixir
defmodule PredecessorDraftWeb.DraftController do
  def complete(conn, %{"draft_id" => draft_id}) do
    draft = Drafts.get_by_draft_id!(draft_id)
    
    # Notify React backend
    HTTPoison.post(
      "#{react_backend_url()}/api/drafts/#{draft_id}/complete",
      Jason.encode!(%{
        team1_picks: draft.team1_picks,
        team2_picks: draft.team2_picks,
        team1_bans: draft.team1_bans,
        team2_bans: draft.team2_bans
      }),
      [{"Content-Type", "application/json"}]
    )
    
    # Redirect back to React
    redirect(conn, external: "#{react_url()}/tournaments/#{draft.tournament_id}")
  end
end
```

## Deployment Strategy

### Development
- Phoenix on port 4000
- React on port 3000
- Shared PostgreSQL

### Production
- Phoenix on draft.yoursite.com (Fly.dev)
- React on yoursite.com (Netlify)
- Shared PostgreSQL (Render)

### Environment Variables
```bash
# Phoenix .env
DATABASE_URL=postgresql://user:pass@host/db
SECRET_KEY_BASE=...
REACT_BACKEND_URL=https://api.yoursite.com
REACT_FRONTEND_URL=https://yoursite.com

# React .env addition
REACT_APP_PHOENIX_URL=https://draft.yoursite.com
```