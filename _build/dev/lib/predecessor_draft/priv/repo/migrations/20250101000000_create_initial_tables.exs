defmodule PredecessorDraft.Repo.Migrations.CreateInitialTables do
  use Ecto.Migration

  def change do
    # Create users table
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :string, null: false
      add :discord_id, :string
      add :discord_username, :string
      add :discord_discriminator, :string
      add :email, :string
      add :avatar_url, :string
      add :is_admin, :boolean, default: false
      add :is_banned, :boolean, default: false
      add :omeda_player_id, :string
      add :omeda_profile_data, :map
      add :omeda_last_sync, :utc_datetime
      add :omeda_sync_enabled, :boolean, default: false
      add :last_active, :utc_datetime
      add :current_role, :string
      add :draft_permissions, :map

      timestamps()
    end

    create unique_index(:users, [:user_id])
    create index(:users, [:discord_id])

    # Create teams table
    create table(:teams, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :tag, :string
      add :logo_url, :string
      add :captain_id, references(:users, type: :binary_id, on_delete: :nilify_all)
      add :position, :integer
      add :draft_identifier, :string

      timestamps()
    end

    # Create draft_sessions table
    create table(:draft_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :draft_id, :string, null: false
      add :status, :string, default: "waiting"
      add :current_phase, :string, default: "waiting"
      add :current_turn, :string
      add :current_action, :string
      add :team1_id, references(:teams, type: :binary_id, on_delete: :delete_all)
      add :team2_id, references(:teams, type: :binary_id, on_delete: :delete_all)
      add :team1_captain_id, references(:users, type: :binary_id)
      add :team2_captain_id, references(:users, type: :binary_id)
      add :winner_team, :string
      add :completed_at, :utc_datetime
      add :timer_enabled, :boolean, default: false
      add :timer_duration, :integer, default: 20
      add :bonus_timer_duration, :integer, default: 40
      add :team1_bonus_time_remaining, :integer, default: 40
      add :team2_bonus_time_remaining, :integer, default: 40
      add :last_action_timestamp, :utc_datetime
      add :action_timer_remaining, :integer
      add :pick_order_chosen, :string
      add :side_chosen, :string
      add :coin_flip_winner, :string

      timestamps()
    end

    create unique_index(:draft_sessions, [:draft_id])
    create index(:draft_sessions, [:status])

    # Create draft_picks table
    create table(:draft_picks, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :draft_session_id, references(:draft_sessions, type: :binary_id, on_delete: :delete_all)
      add :team, :string, null: false
      add :hero_id, :string, null: false
      add :hero_name, :string
      add :pick_number, :integer, null: false
      add :player_name, :string

      timestamps()
    end

    create index(:draft_picks, [:draft_session_id])

    # Create draft_bans table
    create table(:draft_bans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :draft_session_id, references(:draft_sessions, type: :binary_id, on_delete: :delete_all)
      add :team, :string, null: false
      add :hero_id, :string, null: false
      add :hero_name, :string
      add :ban_number, :integer, null: false

      timestamps()
    end

    create index(:draft_bans, [:draft_session_id])

    # Create heroes table
    create table(:heroes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :hero_id, :string, null: false
      add :name, :string, null: false
      add :role, :string
      add :image_url, :string
      add :abilities, :map
      add :stats, :map

      timestamps()
    end

    create unique_index(:heroes, [:hero_id])
  end
end