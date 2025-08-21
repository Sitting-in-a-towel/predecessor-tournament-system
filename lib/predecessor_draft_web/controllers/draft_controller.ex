defmodule PredecessorDraftWeb.DraftController do
  use PredecessorDraftWeb, :controller

  alias PredecessorDraft.Drafts
  alias PredecessorDraft.Teams

  @doc """
  Lists draft sessions, optionally filtered by tournament_id.
  """
  def list(conn, params) do
    try do
      # Delegate to React backend which handles the database correctly
      react_backend_url = get_react_backend_url()
      query_params = if params["tournament_id"], do: "?tournamentId=#{params["tournament_id"]}", else: ""
      
      case HTTPoison.get("#{react_backend_url}/api/draft#{query_params}") do
        {:ok, %{status_code: 200, body: response_body}} ->
          case Jason.decode(response_body) do
            {:ok, react_drafts} when is_list(react_drafts) ->
              # Convert React draft format to Phoenix format with URLs
              phoenix_drafts = Enum.map(react_drafts, fn draft ->
                %{
                  id: draft["id"] || draft["draft_id"],
                  draft_id: draft["draft_id"],
                  status: draft["status"],
                  current_phase: draft["current_phase"],
                  tournament_id: draft["tournament_id"],
                  team1_id: draft["team1_id"],
                  team2_id: draft["team2_id"],
                  team1_name: draft["team1_name"] || "Team 1",
                  team2_name: draft["team2_name"] || "Team 2",
                  created_at: draft["created_at"],
                  draft_url: url(~p"/draft/#{draft["draft_id"]}"),
                  team1_url: url(~p"/draft/#{draft["draft_id"]}?captain=1"),
                  team2_url: url(~p"/draft/#{draft["draft_id"]}?captain=2")
                }
              end)
              
              json(conn, phoenix_drafts)
            
            {:ok, _} ->
              # Not a list, return empty array
              json(conn, [])
            
            {:error, _decode_error} ->
              conn
              |> put_status(:internal_server_error)
              |> json(%{error: "Invalid response from React backend"})
          end
        
        {:ok, %{status_code: status_code}} ->
          conn
          |> put_status(status_code)
          |> json(%{error: "React backend error"})
        
        {:error, error} ->
          conn
          |> put_status(:internal_server_error)
          |> json(%{error: "Failed to communicate with React backend", details: inspect(error)})
      end
    rescue
      error ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Failed to load drafts", details: inspect(error)})
    end
  end

  @doc """
  Returns the current status of a draft session.
  
  This endpoint is used by the React tournament system to check
  draft progress and completion status.
  """
  def status(conn, %{"draft_id" => draft_id}) do
    case Drafts.get_session_by_draft_id(draft_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Draft not found"})
      
      session ->
        {team1, team2} = Teams.get_draft_teams_with_captains(session)
        
        json(conn, %{
          draft_id: session.draft_id,
          status: session.status,
          current_phase: session.current_phase,
          coin_toss: format_coin_toss(session),
          teams: %{
            team1: format_team_status(team1, session, "team1"),
            team2: format_team_status(team2, session, "team2")
          },
          picks: %{
            team1_picks: session.team1_picks,
            team2_picks: session.team2_picks,
            team1_bans: session.team1_bans,
            team2_bans: session.team2_bans
          },
          timing: %{
            created_at: session.created_at,
            coin_toss_started_at: session.coin_toss_started_at,
            coin_toss_completed_at: session.coin_toss_completed_at,
            draft_started_at: session.draft_started_at,
            draft_completed_at: session.draft_completed_at
          }
        })
    end
  end

  @doc """
  Handles draft completion callback from Phoenix to React.
  
  This endpoint is called when a draft is completed and needs to
  send the results back to the React tournament system.
  """
  def complete(conn, %{"draft_id" => draft_id} = params) do
    case Drafts.get_session_by_draft_id(draft_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Draft not found"})
      
      session ->
        # Notify React backend about completion
        notify_react_backend(session)
        
        # Determine redirect URL
        redirect_url = determine_redirect_url(session, params)
        
        case get_format(conn) do
          "json" ->
            json(conn, %{
              success: true,
              redirect_url: redirect_url,
              draft_results: format_draft_results(session)
            })
          
          _ ->
            # HTML redirect back to React
            redirect(conn, external: redirect_url)
        end
    end
  end

  @doc """
  Creates a new draft session from the React tournament system.
  
  This endpoint allows the React system to create drafts that will
  be handled by the Phoenix LiveView system.
  """
  def create(conn, params) do
    # Process draft configuration parameters
    processed_params = process_draft_config(params)
    
    # Delegate draft creation to React backend which handles the database correctly
    react_backend_url = get_react_backend_url()
    
    case HTTPoison.post(
      "#{react_backend_url}/api/draft",
      Jason.encode!(processed_params),
      [{"Content-Type", "application/json"}]
    ) do
      {:ok, %{status_code: 201, body: response_body}} ->
        case Jason.decode(response_body) do
          {:ok, draft_data} ->
            conn
            |> put_status(:created)
            |> json(%{
              draft_id: draft_data["draft_id"] || params["draft_id"],
              id: draft_data["id"],
              draft_url: url(~p"/draft/#{draft_data["draft_id"] || params["draft_id"]}"),
              team1_url: url(~p"/draft/#{draft_data["draft_id"] || params["draft_id"]}?captain=1"),
              team2_url: url(~p"/draft/#{draft_data["draft_id"] || params["draft_id"]}?captain=2"),
              teams: draft_data["teams"] || %{
                team1: %{id: params["team1_id"], name: "Team 1"},
                team2: %{id: params["team2_id"], name: "Team 2"}
              },
              created_at: draft_data["created_at"]
            })
          
          {:error, _} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "Invalid response from React backend"})
        end
      
      {:ok, %{status_code: status_code, body: error_body}} ->
        case Jason.decode(error_body) do
          {:ok, error_data} ->
            conn
            |> put_status(status_code)
            |> json(error_data)
          
          {:error, _} ->
            conn
            |> put_status(status_code)
            |> json(%{error: "Backend error", details: error_body})
        end
      
      {:error, error} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{
          error: "Failed to communicate with React backend",
          details: inspect(error)
        })
    end
  end

  # Private helper functions

  defp format_coin_toss(session) do
    %{
      team1_choice: session.team1_coin_choice,
      team2_choice: session.team2_coin_choice,
      result: session.coin_toss_result,
      winner: session.coin_toss_winner,
      first_pick_team: session.first_pick_team,
      completed: Drafts.Session.coin_toss_complete?(session)
    }
  end

  defp format_team_status(team, session, team_role) do
    %{
      id: team.id,
      name: team.team_name,
      tag: team.tag,
      connected: Map.get(session, String.to_atom("#{team_role}_connected")),
      captain_id: Map.get(session, String.to_atom("#{team_role}_captain_id"))
    }
  end

  defp format_team_basic(team) do
    %{
      id: team.id,
      name: team.team_name,
      tag: team.tag
    }
  end

  defp format_draft_results(session) do
    %{
      draft_id: session.draft_id,
      coin_toss_winner: session.coin_toss_winner,
      first_pick_team: session.first_pick_team,
      team1: %{
        picks: session.team1_picks,
        bans: session.team1_bans
      },
      team2: %{
        picks: session.team2_picks,
        bans: session.team2_bans
      },
      completed_at: session.draft_completed_at
    }
  end

  defp format_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end

  defp notify_react_backend(session) do
    # In a real implementation, you'd make an HTTP request to your React backend
    # to notify about draft completion. For now, we'll just log it.
    
    backend_url = get_react_backend_url()
    
    case HTTPoison.post(
      "#{backend_url}/api/drafts/#{session.draft_id}/complete",
      Jason.encode!(%{
        draft_id: session.draft_id,
        results: format_draft_results(session)
      }),
      [{"Content-Type", "application/json"}]
    ) do
      {:ok, _response} ->
        :ok
      
      {:error, error} ->
        # Log the error but don't fail the request
        require Logger
        Logger.error("Failed to notify React backend: #{inspect(error)}")
        :ok
    end
  rescue
    error ->
      require Logger
      Logger.error("Error notifying React backend: #{inspect(error)}")
      :ok
  end

  defp determine_redirect_url(session, params) do
    # Priority order for redirect URL determination:
    # 1. Explicit redirect_url parameter
    # 2. Tournament URL based on session
    # 3. Default React app URL
    
    cond do
      redirect_url = params["redirect_url"] ->
        redirect_url
      
      session.tournament_id ->
        "#{get_react_frontend_url()}/tournaments/#{session.tournament_id}"
      
      true ->
        get_react_frontend_url()
    end
  end

  defp get_react_backend_url do
    Application.get_env(:predecessor_draft, :react_backend_url, "http://localhost:3001")
  end

  defp get_react_frontend_url do
    Application.get_env(:predecessor_draft, :react_frontend_url, "http://localhost:3000")
  end

  defp process_draft_config(params) do
    # Extract draft configuration parameters
    ban_count = Map.get(params, "ban_count", 4)  # Default 4 bans
    draft_strategy = Map.get(params, "draft_strategy", "restricted")  # Default restricted
    timer_enabled = Map.get(params, "timer_enabled", true)
    bonus_time = Map.get(params, "bonus_time", 10)  # Default 10 seconds bonus
    timer_strategy = Map.get(params, "timer_strategy", "20s per pick")  # Default per pick

    # Build timer configuration
    timer_config = build_timer_config(timer_enabled, bonus_time, timer_strategy)
    
    # Build draft settings
    draft_settings = %{
      "ban_count" => ban_count,
      "draft_strategy" => draft_strategy,
      "timer_enabled" => timer_enabled
    }

    # Add configuration to params
    params
    |> Map.put("timer_config", timer_config)
    |> Map.put("settings", draft_settings)
  end

  defp build_timer_config(false, _bonus_time, _timer_strategy) do
    # Timer disabled
    %{
      "enabled" => false,
      "base_time" => 20,
      "extra_time" => 0,
      "ban_time" => 20,
      "pick_time" => 20
    }
  end

  defp build_timer_config(true, bonus_time, timer_strategy) do
    {base_time, ban_time, pick_time} = case timer_strategy do
      "20s per pick" ->
        # 20 seconds per individual pick/ban
        {20, 20, 20}
      
      _ ->
        # Default fallback - 20s per pick (legacy strategies also default to this)
        {20, 20, 20}
    end

    extra_time = case bonus_time do
      "disabled" -> 0
      time when is_integer(time) -> time
      time when is_binary(time) -> 
        case Integer.parse(time) do
          {num, _} -> num
          :error -> 10
        end
      _ -> 10
    end

    %{
      "enabled" => true,
      "base_time" => base_time,
      "extra_time" => extra_time,
      "ban_time" => ban_time,
      "pick_time" => pick_time
    }
  end
end