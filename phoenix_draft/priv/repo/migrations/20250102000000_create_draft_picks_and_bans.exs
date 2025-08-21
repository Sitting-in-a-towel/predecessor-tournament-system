defmodule PredecessorDraft.Repo.Migrations.CreateDraftPicksAndBans do
  use Ecto.Migration

  def change do
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
  end
end