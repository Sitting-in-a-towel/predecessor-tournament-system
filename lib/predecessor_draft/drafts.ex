defmodule PredecessorDraft.Drafts do
  @moduledoc """
  The Drafts context for managing draft sessions.
  
  This context provides all the business logic for creating,
  managing, and completing draft sessions.
  """

  import Ecto.Query, warn: false
  alias PredecessorDraft.Repo
  alias PredecessorDraftWeb.Components.HeroGrid
  alias PredecessorDraft.Drafts.Session
  alias PredecessorDraft.Teams
  alias PredecessorDraft.Accounts

  @doc """
  Gets a draft session by ID.
  """
  def get_session(id) do
    Repo.get(Session, id)
  end

  @doc """
  Gets a draft session by ID, raising an exception if not found.
  """
  def get_session!(id) do
    Repo.get!(Session, id)
  end

  @doc """
  Gets a draft session by draft_id string.
  """
  def get_session_by_draft_id(draft_id) do
    Repo.get_by(Session, draft_id: draft_id)
  end

  @doc """
  Gets a draft session by draft_id string, raising if not found.
  """
  def get_session_by_draft_id!(draft_id) do
    Repo.get_by!(Session, draft_id: draft_id)
  end

  @doc """
  Creates a new draft session.
  """
  def create_session(attrs \\ %{}) do
    %Session{}
    |> Session.create_changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, session} -> 
        broadcast_draft_update(session, "draft_created")
        {:ok, session}
      error -> error
    end
  end

  @doc """
  Updates a draft session's status or phase.
  """
  def update_session_status(session, attrs) do
    session
    |> Session.status_changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, session} ->
        broadcast_draft_update(session, "status_updated")
        {:ok, session}
      error -> error
    end
  end

  @doc """
  Handles a captain joining the draft.
  """
  def captain_join(session, team_role) when team_role in ["team1", "team2"] do
    attrs = %{"#{team_role}_connected" => true}
    
    # Check if this captain was previously disconnected (for Ban Phase countdown trigger)
    captain_was_disconnected = case team_role do
      "team1" -> !session.team1_connected
      "team2" -> !session.team2_connected
    end
    
    # If both teams are now connected and we're waiting, start coin toss
    updated_attrs = 
      if not session.team1_connected or not session.team2_connected do
        other_connected = if team_role == "team1", 
          do: session.team2_connected, 
          else: session.team1_connected
        
        if other_connected do
          Map.put(attrs, "current_phase", "Coin Toss")
        else
          attrs
        end
      else
        attrs
      end

    with {:ok, updated_session} <- update_session_status(session, updated_attrs) do
      # Check if we're in Ban Phase and both captains are now connected
      # and this captain was previously disconnected
      if updated_session.current_phase == "Ban Phase" && 
         updated_session.team1_connected && 
         updated_session.team2_connected &&
         captain_was_disconnected do
        # Second captain just joined during Ban Phase - start seamless sync
        start_ban_phase_sync_when_ready(updated_session.draft_id)
      end
      
      {:ok, updated_session}
    end
  end

  @doc """
  Handles a captain leaving the draft.
  """
  def captain_leave(session, team_role) when team_role in ["team1", "team2"] do
    attrs = %{"#{team_role}_connected" => false}
    
    # If we lose a captain during coin toss or drafting, go back to waiting
    updated_attrs = 
      if session.current_phase in ["Coin Toss", "Pick Phase"] do
        Map.put(attrs, "current_phase", "waiting")
      else
        attrs
      end
    
    update_session_status(session, updated_attrs)
  end

  @doc """
  Makes a coin toss choice for a team.
  """
  def make_coin_choice(session, team_role, choice) 
      when team_role in ["team1", "team2"] and choice in ["heads", "tails"] do
    
    # Check if the other team already chose this option
    other_team = if team_role == "team1", do: "team2", else: "team1"
    other_choice = Map.get(session, String.to_atom("#{other_team}_coin_choice"))
    
    if other_choice == choice do
      {:error, "The other team already chose #{choice}"}
    else
      attrs = %{"#{team_role}_coin_choice" => choice}
      
      # If both teams will have chosen after this choice, execute the coin flip
      updated_attrs = 
        if (team_role == "team1" and session.team2_coin_choice != nil) or 
           (team_role == "team2" and session.team1_coin_choice != nil) do
          execute_coin_flip(session, attrs, choice, team_role)
        else
          Map.put(attrs, "coin_toss_started_at", DateTime.utc_now())
        end
      
      session
      |> Session.coin_toss_changeset(updated_attrs)
      |> Repo.update()
      |> case do
        {:ok, session} ->
          broadcast_draft_update(session, "coin_choice_made")
          if Session.coin_toss_complete?(session) do
            broadcast_draft_update(session, "coin_toss_complete")
          end
          {:ok, session}
        error -> error
      end
    end
  end

  @doc """
  Sets the pick order after coin toss completion.
  """
  def set_pick_order(session, first_pick_team) when first_pick_team in ["team1", "team2"] do
    attrs = %{
      "first_pick_team" => first_pick_team,
      "pick_order_chosen" => true,
      "current_phase" => "Ban Phase",  # Go directly to Ban Phase
      "draft_started_at" => DateTime.utc_now()
    }
    
    session
    |> Session.picks_changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated_session} ->
        broadcast_draft_update(updated_session, "pick_order_chosen")
        
        # Check if both captains are connected, and start countdown if so
        start_ban_phase_when_ready(updated_session)
        
        {:ok, updated_session}
      error -> error
    end
  end

  @doc """
  Check if both captains are ready for ban phase, start countdown if so
  """
  def start_ban_phase_when_ready(session) do
    # Check if both captains are connected via Presence
    draft_id = session.draft_id
    
    # Use new seamless sync system instead of countdown
    start_ban_phase_sync_when_ready(draft_id)
  end
  
  defp both_captains_connected_to_draft?(draft_id) do
    PredecessorDraftWeb.Presence.both_captains_present?(draft_id)
  end
  
  @doc """
  Starts the Ban Phase without starting timers (waits for team synchronization).
  """
  def start_ban_phase_without_timers(session) do
    current_team = session.first_pick_team
    
    IO.puts("DEBUG: start_ban_phase_without_timers - first_pick_team: #{session.first_pick_team}, setting current_team: #{current_team}")
    
    # Initialize per-team timer system WITHOUT starting timers
    updated_timer_config = session.timer_config
    |> Map.put("current_round", "ban_phase_1")
    |> Map.put("team1_actions_this_round", 0)
    |> Map.put("team2_actions_this_round", 0)
    # DON'T set timer_started_at or timer_active - wait for teams to be ready
    
    attrs = %{
      "current_phase" => "Ban Phase",
      "current_turn" => current_team,
      "draft_started_at" => DateTime.utc_now(),
      # DON'T set current_timer_started_at - wait for synchronization
      "current_timer_duration" => 20,     # Keep for reference
      "current_timer_extra_time" => 0,    # Keep for reference
      "timer_expired" => false,
      "status" => "In Progress",
      "timer_config" => updated_timer_config
    }
    
    session
    |> Session.timer_changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated_session} ->
        broadcast_draft_update(updated_session, "ban_phase_started")
        {:ok, updated_session}
      error -> error
    end
  end

  @doc """
  Starts the Ban Phase after pick order selection (LEGACY - with immediate timers).
  """
  def start_ban_phase(session) do
    current_team = session.first_pick_team
    now = NaiveDateTime.utc_now()
    now_string = NaiveDateTime.to_iso8601(now)
    
    IO.puts("DEBUG: start_ban_phase - first_pick_team: #{session.first_pick_team}, setting current_team: #{current_team}")
    
    # Initialize per-team timer system
    updated_timer_config = session.timer_config
    |> Map.put("current_round", "ban_phase_1")
    |> Map.put("team1_actions_this_round", 0)
    |> Map.put("team2_actions_this_round", 0)
    |> Map.put("#{current_team}_timer", 20)
    |> Map.put("#{current_team}_timer_started_at", now_string)
    |> Map.put("#{current_team}_timer_active", true)
    |> Map.put("#{current_team}_in_bonus", false)
    
    attrs = %{
      "current_phase" => "Ban Phase",
      "current_turn" => current_team,
      "draft_started_at" => DateTime.utc_now(),
      "current_timer_started_at" => now,  # Keep for backward compatibility
      "current_timer_duration" => 20,     # Keep for backward compatibility
      "current_timer_extra_time" => 0,    # Keep for backward compatibility
      "timer_expired" => false,
      "status" => "In Progress",
      "timer_config" => updated_timer_config
    }
    
    session
    |> Session.timer_changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated_session} ->
        # LEGACY TIMER REMOVED - GenServer TimerManager handles all timers now
        # Previously: start_timer_tick(updated_session.draft_id)
        
        broadcast_draft_update(updated_session, "ban_phase_started")
        {:ok, updated_session}
      error -> error
    end
  end

  @doc """
  Makes a hero pick or ban without resetting timer.
  """
  def make_selection(session, team_role, hero_id, action) 
      when team_role in ["team1", "team2"] and action in ["pick", "ban"] do
    
    if Session.next_pick_team(session) != team_role do
      {:error, "It's not your turn to #{action}"}
    else
      current_list = case action do
        "pick" -> Map.get(session, String.to_atom("#{team_role}_picks"))
        "ban" -> Map.get(session, String.to_atom("#{team_role}_bans"))
      end
      
      # Check if hero is already selected (except for "skipped" which can be used multiple times)
      all_selections = get_all_selected_heroes(session)
      
      if hero_id != "skipped" && hero_id in all_selections do
        {:error, "Hero already selected"}
      else
        updated_list = current_list ++ [hero_id]
        
        # Create an updated session struct to determine next turn
        updated_session = Map.put(session, String.to_atom("#{team_role}_#{action}s"), updated_list)
        next_turn = Session.next_pick_team(updated_session)
        
        attrs = %{
          "#{team_role}_#{action}s" => updated_list,
          "current_turn" => next_turn
        }
        
        # Check if draft is complete or advance phase
        updated_attrs = 
          if action == "pick" and length(updated_list) >= 5 do
            other_team = if team_role == "team1", do: "team2", else: "team1"
            other_picks = Map.get(session, String.to_atom("#{other_team}_picks")) || []
            
            if length(other_picks) >= 5 do
              attrs
              |> Map.put("current_phase", "Complete")
              |> Map.put("status", "Completed") 
              |> Map.put("draft_completed_at", DateTime.utc_now())
              |> Map.put("current_timer_started_at", nil)
              |> Map.put("timer_expired", false)
            else
              # Continue drafting - might need to advance from Ban Phase to Pick Phase
              current_phase = advance_phase_if_needed(session, attrs)
              
              attrs
              |> Map.put("current_phase", current_phase)
            end
          else
            # Check if we need to advance from Ban Phase to Pick Phase  
            current_phase = advance_phase_if_needed(session, attrs)
            
            attrs
            |> Map.put("current_phase", current_phase)
          end
        
        # Apply bonus timer reset logic if enabled
        final_session = 
          if session.timer_config["timer_strategy_enabled"] do
            current_action = if action == "ban", do: :ban, else: :pick
            Session.reset_bonus_timer_if_needed(session, team_role, current_action)
          else
            session
          end
        
        final_session
        |> Session.picks_changeset(updated_attrs)
        |> Repo.update()
        |> case do
          {:ok, session} ->
            broadcast_draft_update(session, "selection_made")
            if session.status == "Completed" do
              # Stop the timer manager when draft completes
              try do
                PredecessorDraft.TimerManager.stop_timers(session.draft_id)
                IO.puts("Timer manager stopped for completed draft #{session.draft_id}")
              rescue
                e ->
                  IO.puts("Failed to stop timer manager: #{inspect(e)}")
              end
              broadcast_draft_update(session, "draft_completed")
            end
            {:ok, session}
          error -> error
        end
      end
    end
  end

  @doc """
  Makes a hero selection without broadcasting (internal use only).
  This allows for coordinated updates with timer state.
  """
  def make_selection_without_broadcast(session, team_role, hero_id, action) 
      when team_role in ["team1", "team2"] and action in ["pick", "ban"] do
    
    if Session.next_pick_team(session) != team_role do
      {:error, "It's not your turn to #{action}"}
    else
      current_list = case action do
        "pick" -> Map.get(session, String.to_atom("#{team_role}_picks"))
        "ban" -> Map.get(session, String.to_atom("#{team_role}_bans"))
      end
      
      # Check if hero is already selected (except for "skipped" which can be used multiple times)
      all_selections = get_all_selected_heroes(session)
      
      if hero_id != "skipped" && hero_id in all_selections do
        {:error, "Hero already selected"}
      else
        updated_list = current_list ++ [hero_id]
        
        # Create an updated session struct to determine next turn
        updated_session = Map.put(session, String.to_atom("#{team_role}_#{action}s"), updated_list)
        next_turn = Session.next_pick_team(updated_session)
        
        attrs = %{
          "#{team_role}_#{action}s" => updated_list,
          "current_turn" => next_turn
        }
        
        # Check if draft is complete or advance phase
        updated_attrs = 
          if action == "pick" and length(updated_list) >= 5 do
            other_team = if team_role == "team1", do: "team2", else: "team1"
            other_picks = Map.get(session, String.to_atom("#{other_team}_picks")) || []
            
            if length(other_picks) >= 5 do
              attrs
              |> Map.put("current_phase", "Complete")
              |> Map.put("status", "Completed") 
              |> Map.put("draft_completed_at", DateTime.utc_now())
              |> Map.put("current_timer_started_at", nil)
              |> Map.put("timer_expired", false)
            else
              # Continue drafting - might need to advance from Ban Phase to Pick Phase
              current_phase = advance_phase_if_needed(session, attrs)
              
              attrs
              |> Map.put("current_phase", current_phase)
            end
          else
            # Check if we need to advance from Ban Phase to Pick Phase  
            current_phase = advance_phase_if_needed(session, attrs)
            
            attrs
            |> Map.put("current_phase", current_phase)
          end
        
        # Apply bonus timer reset logic if enabled
        final_session = 
          if session.timer_config["timer_strategy_enabled"] do
            current_action = if action == "ban", do: :ban, else: :pick
            Session.reset_bonus_timer_if_needed(session, team_role, current_action)
          else
            session
          end
        
        final_session
        |> Session.picks_changeset(updated_attrs)
        |> Repo.update()
        |> case do
          {:ok, session} ->
            # NO BROADCAST HERE - caller handles broadcasting
            {:ok, session}
          error -> error
        end
      end
    end
  end

  @doc """
  Confirms a hero selection and resets the timer for next turn.
  This should be called after the "Lock In" button is pressed.
  FIXED: Coordinates database and timer updates to prevent race conditions.
  """
  def confirm_hero_selection(session, team_role, hero_id, action) 
      when team_role in ["team1", "team2"] and action in ["pick", "ban"] do
    
    # Stop current team's timer (whether main or bonus)
    timer_stopped_session = Session.stop_team_timer(session, team_role)
    
    # If team was in bonus time, update their remaining bonus time
    final_timer_session = if timer_stopped_session.timer_config["#{team_role}_in_bonus"] do
      bonus_remaining = Session.get_team_bonus_timer_remaining(timer_stopped_session, team_role)
      updated_config = timer_stopped_session.timer_config
      |> Map.put("#{team_role}_bonus_time", max(0, bonus_remaining || 0))
      |> Map.put("#{team_role}_in_bonus", false)
      |> Map.delete("#{team_role}_bonus_started_at")
      
      %{timer_stopped_session | timer_config: updated_config}
    else
      timer_stopped_session
    end
    
    # Make the selection WITHOUT broadcasting (to prevent race condition)
    case make_selection_without_broadcast(final_timer_session, team_role, hero_id, action) do
      {:ok, updated_session} ->
        # Update timer state FIRST (before broadcasting database changes)
        timer_updated = if updated_session.current_phase in ["Ban Phase", "Pick Phase"] and 
                          updated_session.status != "Completed" do
          
          next_team = Session.next_pick_team(updated_session)
          
          if next_team do
            # CRITICAL FIX: Update timer state synchronously before broadcasting
            case start_next_team_timer(updated_session, next_team) do
              {:ok, final_session} -> {:ok, final_session}
              {:error, _reason} -> {:ok, updated_session}  # Continue even if timer start fails
            end
          else
            {:ok, updated_session}  # No next team - draft might be complete
          end
        else
          {:ok, updated_session}
        end
        
        # NOW broadcast the database changes (after timer is coordinated)
        case timer_updated do
          {:ok, final_session} ->
            broadcast_draft_update(final_session, "selection_made")
            if final_session.status == "Completed" do
              # Stop the timer manager when draft completes
              try do
                PredecessorDraft.TimerManager.stop_timers(final_session.draft_id)
                IO.puts("Timer manager stopped for completed draft #{final_session.draft_id}")
              rescue
                e ->
                  IO.puts("Failed to stop timer manager: #{inspect(e)}")
              end
              broadcast_draft_update(final_session, "draft_completed")
            end
            {:ok, final_session}
          error -> error
        end
        
      error -> error
    end
  end

  @doc """
  Skips the current turn. For bans, adds "skipped" to the ban list.
  For picks, auto-selects a random hero (picks are required).
  """
  def skip_current_turn(session, team_role) when team_role in ["team1", "team2"] do
    current_team = Session.next_pick_team(session)
    
    if current_team != team_role do
      {:error, "It's not your turn"}
    else
      skip_turn(session)
    end
  end

  @doc """
  Lists active draft sessions.
  """
  def list_active_sessions do
    from(s in Session, 
      where: s.status in ["Waiting", "In Progress"],
      order_by: [desc: s.created_at]
    )
    |> Repo.all()
  end

  @doc """
  Lists recent draft sessions (last 24 hours).
  """
  def list_recent_sessions do
    one_day_ago = DateTime.utc_now() |> DateTime.add(-24, :hour)
    
    from(s in Session,
      where: s.created_at > ^one_day_ago,
      order_by: [desc: s.created_at]
    )
    |> Repo.all()
  end

  @doc """
  Lists draft sessions for a tournament.
  """
  def list_tournament_sessions(tournament_id) do
    from(s in Session,
      where: s.tournament_id == ^tournament_id,
      order_by: [desc: s.created_at]
    )
    |> Repo.all()
  end

  @doc """
  Gets draft session with teams and captains loaded.
  """
  def get_session_with_details(draft_id) do
    case get_session_by_draft_id(draft_id) do
      nil -> {:error, :not_found}
      session ->
        {team1, team2} = Teams.get_draft_teams_with_captains(session)
        {:ok, session, team1, team2}
    end
  end

  @doc """
  Cancels a draft session.
  """
  def cancel_session(session) do
    session
    |> Session.status_changeset(%{status: "cancelled", current_phase: "cancelled"})
    |> Repo.update()
    |> case do
      {:ok, session} ->
        broadcast_draft_update(session, "draft_cancelled")
        {:ok, session}
      error -> error
    end
  end

  # Private helper functions

  defp execute_coin_flip(session, attrs, choice, team_role) do
    # Simulate coin flip
    result = Enum.random(["heads", "tails"])
    
    # Determine winner
    team1_choice = if team_role == "team1", do: choice, else: session.team1_coin_choice
    team2_choice = if team_role == "team2", do: choice, else: session.team2_coin_choice
    
    winner = if team1_choice == result, do: "team1", else: "team2"
    
    attrs
    |> Map.put("team1_coin_choice", team1_choice)
    |> Map.put("team2_coin_choice", team2_choice)
    |> Map.put("coin_toss_result", result)
    |> Map.put("coin_toss_winner", winner)
    |> Map.put("coin_toss_completed_at", DateTime.utc_now())
    |> Map.put("current_phase", "Pick Order Selection")
    |> Map.put("status", "In Progress")
  end


  defp get_all_selected_heroes(session) do
    (session.team1_picks ++ session.team2_picks ++ 
     session.team1_bans ++ session.team2_bans)
    |> Enum.filter(& &1)
  end

  defp advance_phase_if_needed(session, attrs) do
    # Calculate total actions after this update
    total_bans = length(session.team1_bans || []) + length(session.team2_bans || [])
    total_picks = length(session.team1_picks || []) + length(session.team2_picks || [])
    
    # Account for the action being made in attrs and calculate team pick counts after update
    {updated_bans, updated_picks, team1_picks_after, team2_picks_after} = case attrs do
      %{"team1_bans" => bans} -> 
        {total_bans + 1, total_picks, length(session.team1_picks || []), length(session.team2_picks || [])}
      %{"team2_bans" => bans} -> 
        {total_bans + 1, total_picks, length(session.team1_picks || []), length(session.team2_picks || [])}
      %{"team1_picks" => picks} -> 
        {total_bans, total_picks + 1, length(picks), length(session.team2_picks || [])}
      %{"team2_picks" => picks} -> 
        {total_bans, total_picks + 1, length(session.team1_picks || []), length(picks)}
      _ -> 
        {total_bans, total_picks, length(session.team1_picks || []), length(session.team2_picks || [])}
    end
    
    total_actions = updated_bans + updated_picks
    
    # Check if draft is complete - both teams must have exactly 5 picks
    if team1_picks_after >= 5 && team2_picks_after >= 5 do
      "Complete"
    else
      cond do
        # First 4 actions are bans - stay in Ban Phase
        total_actions <= 4 -> "Ban Phase"
        
        # Actions 5-10 are picks - switch to Pick Phase
        total_actions <= 10 -> "Pick Phase"
        
        # Actions 11-12 are bans - back to Ban Phase  
        total_actions <= 12 -> "Ban Phase"
        
        # Remaining actions 13-16 are picks - Pick Phase
        true -> "Pick Phase"
      end
    end
  end

  @doc """
  Start timer for current pick/ban phase - DEPRECATED
  Replaced by GenServer TimerManager
  """
  def start_timer(_session, _action \\ :pick) do
    # LEGACY FUNCTION - NO LONGER USED
    # GenServer TimerManager handles all timer operations
    {:ok, nil}
  end
  
  def start_timer_deprecated(session, action \\ :pick) when action in [:pick, :ban] do
    # Always start 20-second base timer regardless of settings
    attrs = %{
      "current_timer_started_at" => NaiveDateTime.utc_now(),
      "current_timer_duration" => 20,  # Always 20 seconds base
      "current_timer_extra_time" => 0,
      "timer_expired" => false
    }
    
    session
    |> Session.timer_changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated_session} ->
        broadcast_draft_update(updated_session, "timer_started")
        schedule_timer_check(updated_session)
        {:ok, updated_session}
      error -> error
    end
  end

  @doc """
  Add extra time to current timer
  """
  def add_extra_time(session) do
    if session.current_timer_started_at && not session.timer_expired do
      extra_time = session.timer_config["extra_time"] || 10
      
      attrs = %{
        "current_timer_extra_time" => extra_time
      }
      
      session
      |> Session.timer_changeset(attrs)
      |> Repo.update()
      |> case do
        {:ok, updated_session} ->
          broadcast_draft_update(updated_session, "extra_time_added")
          {:ok, updated_session}
        error -> error
      end
    else
      {:error, "Cannot add extra time - no active timer"}
    end
  end

  @doc """
  Handle timer expiry and bonus timer activation
  """
  def handle_timer_expiry(session) do
    current_team = Session.next_pick_team(session)
    in_bonus = Map.get(session.timer_config || %{}, "in_bonus_time", false)
    main_timer_expired = Session.timer_expired?(session) && not session.timer_expired
    
    cond do
      # Check if bonus timer has expired
      in_bonus ->
        bonus_remaining = Session.get_bonus_timer_remaining(session, current_team)
        if bonus_remaining && bonus_remaining <= 0 do
          # Bonus timer expired - clear bonus time and auto-select
          updated_config = session.timer_config
          |> Map.delete("in_bonus_time")
          |> Map.delete("bonus_time_started_at")
          |> Map.delete("bonus_time_duration")
          |> Map.delete("bonus_time_team")
          
          attrs = %{
            "timer_expired" => true,
            "timer_config" => updated_config
          }
          
          case Session.timer_changeset(session, attrs) |> Repo.update() do
            {:ok, updated_session} ->
              broadcast_draft_update(updated_session, "bonus_timer_expired")
              perform_auto_selection(updated_session)
            error -> error
          end
        else
          {:ok, session}
        end
      
      # Main timer expired
      main_timer_expired ->
        # Check if bonus time is available
        if has_bonus_time_available?(session, current_team) && 
           session.timer_config["timer_strategy_enabled"] do
          # Activate bonus timer - keep main timer at 0
          activate_bonus_timer(session, current_team)
        else
          # No bonus available, auto-select immediately
          attrs = %{"timer_expired" => true}
          
          case Session.timer_changeset(session, attrs) |> Repo.update() do
            {:ok, updated_session} ->
              broadcast_draft_update(updated_session, "timer_expired")
              perform_auto_selection(updated_session)
            error -> error
          end
        end
      
      # No timers expired
      true ->
        {:ok, session}
    end
  end

  @doc """
  Check if a team has bonus time available
  """
  def has_bonus_time_available?(session, team) do
    case team do
      "team1" -> (session.timer_config["team1_extra_time"] || 0) > 0
      "team2" -> (session.timer_config["team2_extra_time"] || 0) > 0
      _ -> false
    end
  end

  @doc """
  Activate bonus timer for the current team
  """
  def activate_bonus_timer(session, team) do
    bonus_time = case team do
      "team1" -> session.timer_config["team1_extra_time"] || 0
      "team2" -> session.timer_config["team2_extra_time"] || 0
      _ -> 0
    end
    
    if bonus_time > 0 do
      # DON'T reset the main timer - keep it at 0 and track bonus separately
      now = NaiveDateTime.utc_now()
      # Store as ISO8601 string for proper JSON serialization/deserialization
      now_string = NaiveDateTime.to_iso8601(now)
      
      # Update timer config to track bonus time usage
      updated_timer_config = session.timer_config
      |> Map.put("in_bonus_time", true)
      |> Map.put("bonus_time_started_at", now_string)  # Store as string
      |> Map.put("bonus_time_duration", bonus_time)
      |> Map.put("bonus_time_team", team)
      
      # DON'T change timer_expired or main timer fields
      attrs = %{
        "timer_config" => updated_timer_config
      }
      
      case Session.timer_changeset(session, attrs) |> Repo.update() do
        {:ok, updated_session} ->
          IO.puts("DEBUG: Bonus timer activated successfully!")
          IO.puts("DEBUG: Updated timer_config: #{inspect(updated_session.timer_config)}")
          broadcast_draft_update(updated_session, "bonus_timer_activated")
          # DON'T restart timer tick - it's already running
          {:ok, updated_session}
        error -> 
          IO.puts("DEBUG: Failed to activate bonus timer: #{inspect(error)}")
          error
      end
    else
      # No bonus time, proceed with auto-selection
      attrs = %{"timer_expired" => true}
      case Session.timer_changeset(session, attrs) |> Repo.update() do
        {:ok, updated_session} ->
          broadcast_draft_update(updated_session, "timer_expired")
          perform_auto_selection(updated_session)
        error -> error
      end
    end
  end

  defp perform_auto_selection(session) do
    current_team = Session.next_pick_team(session)
    
    if current_team do
      action = determine_current_action(session)
      available_heroes = get_available_heroes(session)
      
      case select_random_hero(available_heroes, action) do
        {:ok, hero_id} ->
          # Perform the selection automatically
          make_selection(session, current_team, hero_id, to_string(action))
          
        {:error, _reason} ->
          # No heroes available, skip turn
          skip_turn(session)
      end
    else
      {:ok, session}
    end
  end



  defp skip_turn(session) do
    current_team = Session.next_pick_team(session)
    action = determine_current_action(session)
    
    # Handle skip differently for bans vs picks
    case action do
      :ban ->
        # For bans, add "skipped" to the ban list
        skip_ban(session, current_team)
      :pick ->
        # For picks, auto-select a random hero
        available_heroes = get_available_heroes(session)
        case select_random_hero(available_heroes, :pick) do
          {:ok, hero_id} ->
            make_selection(session, current_team, hero_id, "pick")
          {:error, _} ->
            # No heroes available - this shouldn't happen in normal gameplay
            skip_without_selection(session)
        end
    end
  end
  
  defp skip_ban(session, team) do
    require Logger
    Logger.info("=== SKIP_BAN START ===")
    Logger.info("Team: #{team}, Draft: #{session.draft_id}")
    Logger.info("Current bans - Team1: #{inspect(session.team1_bans)}, Team2: #{inspect(session.team2_bans)}")
    
    try do
      # STEP 1: Create attributes
      attrs = case team do
        "team1" -> %{"team1_bans" => (session.team1_bans || []) ++ ["skipped"]}
        "team2" -> %{"team2_bans" => (session.team2_bans || []) ++ ["skipped"]}
        _ -> %{}
      end
      Logger.info("STEP 1 SUCCESS: Created attrs: #{inspect(attrs)}")
      
      # STEP 2: Create temporary session
      temp_session = case team do
        "team1" -> %{session | team1_bans: (session.team1_bans || []) ++ ["skipped"]}
        "team2" -> %{session | team2_bans: (session.team2_bans || []) ++ ["skipped"]}
        _ -> session
      end
      Logger.info("STEP 2 SUCCESS: Created temp_session")
      
      # STEP 3: Calculate next turn
      next_turn = Session.next_pick_team(temp_session)
      Logger.info("STEP 3 SUCCESS: Next turn = #{next_turn}")
      
      # STEP 4: Advance phase if needed
      current_phase = advance_phase_if_needed(session, attrs)
      Logger.info("STEP 4 SUCCESS: Current phase = #{current_phase}")
      
      # STEP 5: Create final attributes
      final_attrs = attrs
      |> Map.put("current_turn", next_turn)
      |> Map.put("current_phase", current_phase)
      |> Map.put("current_timer_started_at", nil)
      |> Map.put("timer_expired", false)
      Logger.info("STEP 5 SUCCESS: Final attrs = #{inspect(final_attrs)}")
      
      # STEP 6: Create changeset
      changeset = Session.picks_changeset(session, final_attrs)
      Logger.info("STEP 6 SUCCESS: Changeset valid = #{changeset.valid?}")
      if not changeset.valid? do
        Logger.error("Changeset errors: #{inspect(changeset.errors)}")
      end
      
      # STEP 7: Database update
      case Repo.update(changeset) do
        {:ok, updated_session} ->
          Logger.info("STEP 7 SUCCESS: Database updated")
          
          # STEP 8: Broadcast
          try do
            broadcast_draft_update(updated_session, "ban_skipped")
            Logger.info("STEP 8 SUCCESS: Broadcast sent")
          rescue
            e -> 
              Logger.error("STEP 8 FAILED: Broadcast error: #{inspect(e)}")
              raise e
          end
          
          # STEP 9: Timer Manager (if not complete)
          if current_phase != "Complete" do
            try do
              next_team = Session.next_pick_team(updated_session)
              next_action = determine_current_action(updated_session)
              Logger.info("STEP 9 PREP: next_team=#{next_team}, next_action=#{next_action}")
              
              PredecessorDraft.TimerManager.team_action_completed(
                updated_session.draft_id, 
                team, 
                :ban, 
                next_team
              )
              Logger.info("STEP 9 SUCCESS: TimerManager notified")
            rescue
              e -> 
                Logger.error("STEP 9 FAILED: TimerManager error: #{inspect(e)}")
                Logger.error("Stack trace: #{Exception.format_stacktrace(__STACKTRACE__)}")
                # Don't crash the whole function, just log the error
                Logger.error("Continuing without TimerManager update...")
            end
          else
            Logger.info("STEP 9 SKIPPED: Draft complete")
          end
          
          Logger.info("=== SKIP_BAN SUCCESS ===")
          {:ok, updated_session}
          
        {:error, changeset} ->
          Logger.error("STEP 7 FAILED: Database update failed")
          Logger.error("Changeset errors: #{inspect(changeset.errors)}")
          {:error, "Database update failed: #{inspect(changeset.errors)}"}
      end
      
    rescue
      e ->
        Logger.error("=== SKIP_BAN CRASHED ===")
        Logger.error("Exception: #{inspect(e)}")
        Logger.error("Stack trace: #{Exception.format_stacktrace(__STACKTRACE__)}")
        {:error, "Skip ban crashed: #{inspect(e)}"}
    end
  end
  
  defp skip_without_selection(session) do
    # Fallback for when no selection can be made
    current_phase = advance_phase_if_needed(session, %{})
    
    attrs = %{
      "current_phase" => current_phase,
      "current_timer_started_at" => nil,
      "timer_expired" => false
    }
    
    session
    |> Session.timer_changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated_session} ->
        broadcast_draft_update(updated_session, "turn_skipped")
        
        # Start timer for next phase if not complete
        if current_phase != "Complete" do
          next_action = determine_current_action(updated_session)
          start_timer(updated_session, next_action)
        else
          {:ok, updated_session}
        end
      error -> error
    end
  end

  # LEGACY TIMER CHECK - NO LONGER USED
  defp schedule_timer_check(_session) do
    # GenServer TimerManager handles all timer operations
    :ok
  end


  @doc """
  Start bonus timer for a team when main timer expires
  """
  def start_team_bonus_time(session, team) do
    updated_session = Session.start_team_bonus_timer(session, team)
    
    case Session.timer_changeset(updated_session, %{"timer_config" => updated_session.timer_config}) |> Repo.update() do
      {:ok, final_session} ->
        broadcast_draft_update(final_session, "bonus_timer_activated")
        {:ok, final_session}
      error -> error
    end
  end
  
  @doc """
  Determine the current action type (pick or ban) based on draft progress
  """
  def determine_current_action(session) do
    total_picks = length(session.team1_picks || []) + length(session.team2_picks || [])
    total_bans = length(session.team1_bans || []) + length(session.team2_bans || [])
    total_actions = total_picks + total_bans
    
    # Predecessor draft sequence: Ban-Ban-Ban-Ban-Pick-Pick-Pick-Pick-Pick-Pick-Ban-Ban-Pick-Pick-Pick-Pick
    case total_actions do
      n when n < 4 -> :ban   # First 4 actions are bans
      n when n < 10 -> :pick # Next 6 are picks  
      n when n < 12 -> :ban  # Next 2 are bans
      _ -> :pick             # Remaining are picks
    end
  end
  
  @doc """
  Get available heroes for selection (not already picked or banned)
  """
  def get_available_heroes(session) do
    all_heroes = HeroGrid.heroes()
    used_heroes = (session.team1_picks || []) ++ (session.team2_picks || []) ++ 
                  (session.team1_bans || []) ++ (session.team2_bans || [])
    
    Enum.reject(all_heroes, fn hero -> hero.id in used_heroes end)
  end
  
  @doc """
  Select a random hero for auto-selection
  """
  def select_random_hero(available_heroes, _action) do
    case available_heroes do
      [] -> {:error, "No heroes available"}
      heroes -> 
        random_hero = Enum.random(heroes)
        {:ok, random_hero.id}
    end
  end
  
  @doc """
  Handle timer expiry for a specific team - auto-select and advance turn
  """
  def handle_team_timer_expiry(session, team) do
    IO.puts("DEBUG: handle_team_timer_expiry called for team: #{team}")
    # Perform auto-selection for the team
    action = determine_current_action(session)
    available_heroes = get_available_heroes(session)
    IO.puts("DEBUG: Auto-selecting #{action} for #{team}, available heroes: #{length(available_heroes)}")
    
    case select_random_hero(available_heroes, action) do
      {:ok, hero_id} ->
        # Stop the team's timer and make selection
        updated_session = Session.stop_team_timer(session, team)
        
        # Make the auto-selection
        case make_selection(updated_session, team, hero_id, to_string(action)) do
          {:ok, selection_session} ->
            # Start timer for next team if draft continues
            next_team = Session.next_pick_team(selection_session)
            
            if next_team && selection_session.current_phase in ["Ban Phase", "Pick Phase"] do
              start_next_team_timer(selection_session, next_team)
            else
              {:ok, selection_session}
            end
            
          error -> error
        end
        
      {:error, _reason} ->
        # No heroes available, just advance turn
        next_team = Session.next_pick_team(session)
        if next_team do
          start_next_team_timer(session, next_team)
        else
          {:ok, session}
        end
    end
  end
  
  @doc """
  Start timer for the next team based on timer strategy
  """
  def start_next_team_timer(session, team) do
    action = determine_current_action(session)
    
    IO.puts("DEBUG: start_next_team_timer called for team: #{team}, action: #{action}")
    
    # Use GenServer TimerManager for all timer operations
    case PredecessorDraft.TimerManager.team_action_completed(
      session.draft_id, 
      Session.next_pick_team(session) || "team1",  # Current team that just completed action
      action, 
      team  # Next team to start timer
    ) do
      {:ok, :timer_started} ->
        IO.puts("DEBUG: Successfully started timer for #{team} via TimerManager")
        {:ok, session}
      :ok ->
        IO.puts("DEBUG: TimerManager returned :ok for #{team} - treating as success")
        {:ok, session}
      {:error, reason} ->
        IO.puts("DEBUG: Failed to start timer for #{team}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp broadcast_draft_update(session, event) do
    # Include the calculated remaining time in every broadcast
    remaining_time = PredecessorDraft.Drafts.Session.get_timer_remaining(session)
    
    Phoenix.PubSub.broadcast(
      PredecessorDraft.PubSub,
      "draft:#{session.draft_id}",
      {event, session, remaining_time}
    )
  end
  
  @doc """
  Start centralized countdown process for draft start
  """
  def start_ban_phase_sync_when_ready(draft_id) do
    # Check if both captains are ready for ban phase
    if both_captains_ready_for_ban_phase?(draft_id) do
      # Both captains ready - start ban phase immediately
      start_ban_phase_immediately(draft_id)
    else
      # Show waiting state - ban phase will start when other captain connects
      Phoenix.PubSub.broadcast(
        PredecessorDraft.PubSub,
        "draft:#{draft_id}",
        {"waiting_for_captain", %{}}
      )
    end
  end
  
  defp both_captains_ready_for_ban_phase?(draft_id) do
    # Check if both captains are present and ready
    PredecessorDraftWeb.Presence.both_captains_present?(draft_id)
  end
  
  defp start_ban_phase_immediately(draft_id) do
    spawn(fn ->
      # Broadcast ban phase start to ALL clients immediately
      Phoenix.PubSub.broadcast(
        PredecessorDraft.PubSub,
        "draft:#{draft_id}",
        {"ban_phase_starting", %{}}
      )
      
      # Small delay, then initialize ban phase with timers
      Process.sleep(100)
      
      # Get the draft session and initialize ban phase timers
      case get_session_by_draft_id(draft_id) do
        nil -> :ok  # Draft no longer exists
        session ->
          # CRITICAL FIX: Initialize TimerManager FIRST before database broadcast
          PredecessorDraft.TimerManager.team_ready(draft_id, "team1")
          PredecessorDraft.TimerManager.team_ready(draft_id, "team2")
          
          # Small delay to let TimerManager initialize
          Process.sleep(500)
          
          # Initialize ban phase (this sets database state)
          case start_ban_phase(session) do
            {:ok, updated_session} -> 
              # Broadcast ban phase started (now database and timer are both ready)
              # CRITICAL FIX: Include remaining_time in broadcast (spectator expects 3-param tuple)
              remaining_time = PredecessorDraft.Drafts.Session.get_timer_remaining(updated_session)
              Phoenix.PubSub.broadcast(
                PredecessorDraft.PubSub,
                "draft:#{draft_id}",
                {"ban_phase_started", updated_session, remaining_time}
              )
              
              :ok
            {:error, _reason} -> :ok
          end
      end
    end)
  end
  
  # LEGACY COUNTDOWN - NO LONGER USED
  # Replaced by seamless synchronization in start_ban_phase_sync_when_ready
  def start_draft_countdown(_draft_id) do
    # GenServer TimerManager handles all timer operations
    :ok
  end
  
  def start_draft_countdown_deprecated(draft_id) do
    spawn(fn ->
      # Broadcast countdown start to ALL clients
      Phoenix.PubSub.broadcast(
        PredecessorDraft.PubSub,
        "draft:#{draft_id}",
        {"countdown_started", %{countdown_time: 3}}
      )
      
      # Run 3-second countdown
      Enum.each([3, 2, 1], fn count ->
        Process.sleep(1000)
        
        if count > 1 do
          # Broadcast countdown tick
          Phoenix.PubSub.broadcast(
            PredecessorDraft.PubSub,
            "draft:#{draft_id}",
            {"countdown_tick", %{countdown_time: count - 1}}
          )
        else
          # Countdown finished
          Phoenix.PubSub.broadcast(
            PredecessorDraft.PubSub,
            "draft:#{draft_id}",
            {"countdown_finished", %{}}
          )
          
          # Small delay, then start ban phase
          Process.sleep(100)
          
          # Get the draft session and start ban phase
          case get_session_by_draft_id(draft_id) do
            nil -> :ok  # Draft no longer exists
            session ->
              # Update phase to Ban Phase and start timer
              attrs = %{
                "current_phase" => "Ban Phase",
                "current_timer_started_at" => NaiveDateTime.utc_now(),
                "current_timer_duration" => 20,
                "current_timer_extra_time" => 0,
                "timer_expired" => false,
                "status" => "In Progress"
              }
              
              case Session.picks_changeset(session, attrs) |> Repo.update() do
                {:ok, updated_draft} ->
                  # LEGACY TIMER REMOVED - GenServer TimerManager handles all timers now
                  # Previously: start_timer_tick(updated_draft.draft_id)
                  
                  # Calculate initial timer value
                  remaining_time = Session.get_timer_remaining(updated_draft)
                  
                  # Broadcast ban phase started to ALL clients
                  Phoenix.PubSub.broadcast(
                    PredecessorDraft.PubSub,
                    "draft:#{draft_id}",
                    {"ban_phase_started", updated_draft, remaining_time}
                  )
                  
                {:error, _reason} -> :ok
              end
          end
        end
      end)
    end)
  end

  # LEGACY TIMER SYSTEM - COMMENTED OUT
  # All timer management now handled by GenServer TimerManager
  # Keeping code for reference but it's no longer used
  
  @doc """
  Kill existing timer process for a draft (cleanup) - DEPRECATED
  """
  def kill_timer_process(draft_id) do
    # Legacy function - no longer used
    process_name = String.to_atom("timer_tick_#{draft_id}")
    
    case Process.whereis(process_name) do
      pid when is_pid(pid) -> 
        IO.puts("DEBUG: Killing existing timer process for draft #{draft_id}")
        Process.exit(pid, :kill)
        Process.sleep(10)  # Give time for cleanup
        :ok
      _ -> 
        IO.puts("DEBUG: No existing timer process for draft #{draft_id}")
        :ok
    end
  end

  @doc """
  Start a timer tick process - DEPRECATED, replaced by GenServer TimerManager
  """
  def start_timer_tick(_draft_id) do
    # LEGACY FUNCTION - NO LONGER USED
    # All timer management now handled by GenServer TimerManager
    # This function is kept as a stub to prevent errors in case it's called
    :ok
  end
  
  # LEGACY TIMER TICK LOOP - NO LONGER USED
  # Kept for reference but never called since start_timer_tick is stubbed
  defp timer_tick_loop(draft_id) do
    # This function is no longer executed
    # GenServer TimerManager handles all timer operations
    :ok
  end
  
  defp timer_tick_loop_deprecated(draft_id) do
    case get_session_by_draft_id(draft_id) do
      nil -> 
        # Draft no longer exists, stop ticking
        IO.puts("DEBUG: Draft #{draft_id} no longer exists, stopping timer")
        :ok
      session ->
        # OLD TIMER SYSTEM DISABLED - Now using GenServer TimerManager
        if false do
          # Fix timer state inconsistency: ensure the correct team's timer is active
          expected_team = Session.next_pick_team(session)
          IO.puts("DEBUG: expected_team (next_pick_team): #{expected_team}, current_turn: #{session.current_turn}")
          
          # CRITICAL FIX: Check for timer state inconsistency and fix it
          session = case {session.timer_config["team1_timer_active"], session.timer_config["team2_timer_active"]} do
            {true, _} when expected_team == "team1" -> 
              session  # Team1 timer active and should be - OK
            {_, true} when expected_team == "team2" -> 
              session  # Team2 timer active and should be - OK
            _ -> 
              # Timer state is inconsistent - fix it
              IO.puts("DEBUG: Timer state inconsistent! Expected: #{expected_team}, team1_active: #{session.timer_config["team1_timer_active"]}, team2_active: #{session.timer_config["team2_timer_active"]}")
              IO.puts("DEBUG: Fixing timer state by activating #{expected_team} timer")
              
              case start_next_team_timer(session, expected_team) do
                {:ok, updated_session} -> 
                  IO.puts("DEBUG: Successfully activated #{expected_team} timer - using updated session")
                  updated_session
                {:error, reason} -> 
                  IO.puts("DEBUG: Failed to activate #{expected_team} timer: #{inspect(reason)}")
                  session
              end
          end
          
          current_team = expected_team
          
          # Use per-team timer system
          team_main_timer = Session.get_team_main_timer(session, current_team)
          team_in_bonus = session.timer_config["#{current_team}_in_bonus"] || false
          
          IO.puts("DEBUG: Per-team timer tick - team: #{current_team}, main: #{team_main_timer}s, in_bonus: #{team_in_bonus}")
          IO.puts("DEBUG: session.current_turn: #{session.current_turn}, first_pick_team: #{session.first_pick_team}")
          IO.puts("DEBUG: timer_config active flags - team1_timer_active: #{session.timer_config["team1_timer_active"]}, team2_timer_active: #{session.timer_config["team2_timer_active"]}")
          
          # FIX: Broadcast the actual calculated remaining time, not the base timer value
          Phoenix.PubSub.broadcast(
            PredecessorDraft.PubSub,
            "draft:#{draft_id}",
            {"timer_tick", team_main_timer || 0}
          )
          
          # Handle team timer logic
          if team_in_bonus do
            # Team is using bonus time
            bonus_remaining = Session.get_team_bonus_timer_remaining(session, current_team)
            
            IO.puts("DEBUG: Team #{current_team} bonus timer: #{bonus_remaining}s remaining")
            
            # Broadcast bonus timer update
            Phoenix.PubSub.broadcast(
              PredecessorDraft.PubSub,
              "draft:#{draft_id}",
              {"bonus_timer_tick", %{
                team: current_team,
                remaining: bonus_remaining || 0
              }}
            )
            
            if bonus_remaining && bonus_remaining > 0 do
              # Bonus timer still running
              Process.sleep(2000)  # Reduced database query frequency
              timer_tick_loop(draft_id)
            else
              # Bonus timer expired - trigger auto-selection
              case handle_team_timer_expiry(session, current_team) do
                {:ok, _updated_session} -> 
                  Process.sleep(2000)  # Reduced frequency  
                  timer_tick_loop(draft_id)
                {:error, _reason} ->
                  Process.sleep(5000)
                  timer_tick_loop(draft_id)
              end
            end
          else
            # Team using main timer
            if team_main_timer && team_main_timer > 0 do
              # Main timer still running - reduce query frequency for better performance
              Process.sleep(2000)  # Increased from 1000ms to 2000ms
              timer_tick_loop(draft_id)
            else
              # Main timer expired - check for bonus time or auto-select
              if session.timer_config["timer_strategy_enabled"] && 
                 (session.timer_config["#{current_team}_bonus_time"] || 0) > 0 do
                # Start bonus timer
                case start_team_bonus_time(session, current_team) do
                  {:ok, _updated_session} ->
                    Process.sleep(2000)  # Reduced frequency
                    timer_tick_loop(draft_id)
                  {:error, _reason} ->
                    Process.sleep(5000)
                    timer_tick_loop(draft_id)
                end
              else
                # No bonus time, trigger auto-selection
                case handle_team_timer_expiry(session, current_team) do
                  {:ok, _updated_session} -> 
                    Process.sleep(2000)  # Reduced frequency
                    timer_tick_loop(draft_id)
                  {:error, _reason} ->
                    Process.sleep(5000)
                    timer_tick_loop(draft_id)
                end
              end
            end
          end
        else
          # Not in active phase - check much less frequently
          case session.status do
            "Completed" ->
              # Draft is complete, stop ticking entirely
              :ok
            "cancelled" ->
              # Draft is cancelled, stop ticking entirely
              :ok
            _ ->
              # Draft exists but not active - check every minute
              Process.sleep(60000)  # 60 seconds
              timer_tick_loop(draft_id)
          end
        end
    end
  end
end