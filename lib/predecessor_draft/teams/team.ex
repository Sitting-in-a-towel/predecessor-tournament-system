defmodule PredecessorDraft.Teams.Team do
  @moduledoc """
  Team schema for the existing PostgreSQL database.
  
  This schema maps to the existing 'teams' table and provides
  read-only access for team information in drafts.
  """
  
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :string, autogenerate: false}
  @foreign_key_type :string

  schema "teams" do
    # Match actual PostgreSQL database structure
    field :team_id, :string
    field :team_name, :string        # Database has team_name, not name
    field :team_tag, :string         # Database has team_tag, not tag
    field :team_logo, :string        # Database has team_logo, not logo_url
    field :captain_id, :string    # Captain relationship
    field :confirmed, :boolean       # Registration confirmation
    field :confirmed_at, :utc_datetime
    field :checked_in, :boolean      # Check-in status
    field :check_in_time, :utc_datetime
    field :seed, :integer            # Tournament seeding
    field :placement, :integer       # Final placement
    field :created_at, :utc_datetime
    field :updated_at, :utc_datetime

    # Tournament relationships
    field :tournament_id, :string

    # Relationships with draft sessions
    has_many :draft_sessions_as_team1, PredecessorDraft.Drafts.Session, foreign_key: :team1_id
    has_many :draft_sessions_as_team2, PredecessorDraft.Drafts.Session, foreign_key: :team2_id

    # Virtual fields for draft display
    field :current_captain, :map, virtual: true
    field :draft_status, :string, virtual: true
  end

  @doc """
  Changeset for team information (read-only for most operations)
  """
  def changeset(team, attrs \\ %{}) do
    team
    |> cast(attrs, [:current_captain, :draft_status])
    |> validate_inclusion(:draft_status, ["waiting", "ready", "drafting", "completed"])
  end

  @doc """
  Get team display name with fallback
  """
  def display_name(team) do
    cond do
      team.team_name && String.trim(team.team_name) != "" -> team.team_name
      team.team_tag && String.trim(team.team_tag) != "" -> team.team_tag
      true -> "Team #{String.slice(team.id, 0, 8)}"
    end
  end

  @doc """
  Get team identifier for draft system
  """
  def draft_identifier(team, position) when position in [1, 2] do
    "team#{position}"
  end

  @doc """
  Check if team has a logo
  """
  def has_logo?(team) do
    team.team_logo && String.trim(team.team_logo) != ""
  end

  @doc """
  Get logo URL with fallback
  """
  def logo_url(team) do
    if has_logo?(team) do
      team.team_logo
    else
      # Default avatar or team icon
      "/images/default-team-logo.png"
    end
  end

  @doc """
  Format team for draft display
  """
  def for_draft_display(team, position, captain \\ nil) do
    %{
      id: team.id,
      team_name: display_name(team),
      tag: team.team_tag,
      logo_url: logo_url(team),
      position: position,
      draft_identifier: draft_identifier(team, position),
      captain: captain
    }
  end
end