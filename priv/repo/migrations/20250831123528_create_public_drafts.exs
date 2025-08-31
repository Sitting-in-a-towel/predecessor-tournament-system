defmodule PredecessorDraft.Repo.Migrations.CreatePublicDrafts do
  use Ecto.Migration

  def change do
    create table(:public_drafts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :draft_code, :string, null: false
      add :format, :string, default: "classic"
      
      # Team names (customizable)
      add :team1_name, :string, default: "Team Blue"
      add :team2_name, :string, default: "Team Orange"
      
      # Captain tokens for authentication
      add :captain1_token, :string
      add :captain2_token, :string
      add :spectator_token, :string
      
      # Track if captains have claimed their spots
      add :captain1_claimed, :boolean, default: false
      add :captain2_claimed, :boolean, default: false
      
      # Draft status
      add :status, :string, default: "waiting"
      
      # Link to actual draft session once created
      add :draft_session_id, :binary_id
      
      # Cleanup tracking
      add :expires_at, :utc_datetime
      add :last_activity, :utc_datetime
      
      timestamps()
    end
    
    # Indexes for quick lookups
    create unique_index(:public_drafts, [:draft_code])
    create index(:public_drafts, [:captain1_token])
    create index(:public_drafts, [:captain2_token])
    create index(:public_drafts, [:spectator_token])
    create index(:public_drafts, [:status])
    create index(:public_drafts, [:expires_at])
    
    # Foreign key to draft_sessions table (optional, can be null initially)
    alter table(:public_drafts) do
      add :draft_id, references(:draft_sessions, type: :binary_id, on_delete: :nilify_all)
    end
  end
end
