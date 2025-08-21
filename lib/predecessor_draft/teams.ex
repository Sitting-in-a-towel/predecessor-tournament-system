defmodule PredecessorDraft.Teams do
  @moduledoc """
  The Teams context for team management in the draft system.
  
  This context provides read-only access to team information
  from the existing tournament database.
  """

  import Ecto.Query, warn: false
  alias PredecessorDraft.Repo
  alias PredecessorDraft.Teams.Team

  @doc """
  Gets a team by ID.
  """
  def get_team(id) do
    Repo.get(Team, id)
  end

  @doc """
  Gets a team by ID, raising an exception if not found.
  """
  def get_team!(id) do
    Repo.get!(Team, id)
  end

  @doc """
  Gets teams for a specific tournament.
  """
  def get_tournament_teams(tournament_id) do
    from(t in Team, where: t.tournament_id == ^tournament_id)
    |> Repo.all()
  end

  @doc """
  Gets both teams for a draft with captain information.
  Note: draft.team1_id and team2_id are registration IDs, not team IDs.
  """
  def get_draft_teams(draft) do
    team1 = get_team_by_registration_id(draft.team1_id)
    team2 = get_team_by_registration_id(draft.team2_id)
    
    {team1, team2}
  end
  
  @doc """
  Gets a team by registration ID (joining through tournament_registrations).
  """
  def get_team_by_registration_id(registration_id) do
    # Use type casting in the query instead of pre-converting
    from(t in Team,
      join: tr in "tournament_registrations", on: t.id == tr.team_id,
      where: tr.id == type(^registration_id, :binary_id),
      select: t
    )
    |> Repo.one()
  end

  @doc """
  Gets both teams for a draft with captain information and format for display.
  """
  def get_draft_teams_with_captains(draft) do
    {team1, team2} = get_draft_teams(draft)
    
    # Get captain information if available
    captains = PredecessorDraft.Accounts.get_draft_users(draft)
    
    team1_captain = Map.get(captains, draft.team1_captain_id)
    team2_captain = Map.get(captains, draft.team2_captain_id)
    
    {
      Team.for_draft_display(team1, 1, team1_captain),
      Team.for_draft_display(team2, 2, team2_captain)
    }
  end

  @doc """
  Search teams by name or tag.
  """
  def search_teams(query) when is_binary(query) do
    search_pattern = "%#{String.downcase(query)}%"
    
    from(t in Team,
      where: ilike(t.team_name, ^search_pattern) or ilike(t.team_tag, ^search_pattern),
      order_by: [asc: t.team_name]
    )
    |> Repo.all()
  end

  @doc """
  Lists teams with pagination.
  """
  def list_teams(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    
    from(t in Team,
      order_by: [asc: t.team_name],
      limit: ^limit,
      offset: ^offset
    )
    |> Repo.all()
  end

  @doc """
  Gets team statistics for a tournament.
  """
  def get_team_stats(team_id, tournament_id) do
    # This would include match wins/losses, draft performance, etc.
    # Implementation depends on your existing database structure
    %{
      team_id: team_id,
      tournament_id: tournament_id,
      matches_played: 0,
      matches_won: 0,
      drafts_completed: get_team_draft_count(team_id)
    }
  end

  @doc """
  Check if a team exists.
  """
  def team_exists?(team_id) do
    from(t in Team, where: t.id == ^team_id, select: count())
    |> Repo.one()
    |> case do
      0 -> false
      _ -> true
    end
  end

  # Private helper functions

  defp get_team_draft_count(team_id) do
    alias PredecessorDraft.Drafts.Session
    
    from(d in Session,
      where: d.team1_id == ^team_id or d.team2_id == ^team_id,
      where: d.status == "completed",
      select: count()
    )
    |> Repo.one()
  rescue
    _ -> 0
  end
end