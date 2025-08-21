defmodule PredecessorDraftWeb.SpectateLive do
  use PredecessorDraftWeb, :live_view
  
  alias PredecessorDraft.Drafts
  alias PredecessorDraft.Teams
  alias Phoenix.PubSub
  
  # Import shared components
  alias PredecessorDraftWeb.Components.{DraftHeader, TeamPanel, BansDisplay, DraftStatus, TimerDisplay}
  
  require Logger

  @impl true
  def mount(%{"draft_id" => draft_id} = _params, _session, socket) do
    PredecessorDraft.Logger.log(:info, "SPECTATOR", "Spectator attempting to join draft: #{draft_id}")
    
    # Subscribe to draft updates
    subscription_result = PubSub.subscribe(PredecessorDraft.PubSub, "draft:#{draft_id}")
    PredecessorDraft.Logger.log(:info, "SPECTATOR", "PubSub subscription result: #{inspect(subscription_result)} for draft:#{draft_id}")
    
    # Also subscribe to timer events specifically
    timer_sub_result = PubSub.subscribe(PredecessorDraft.PubSub, "timer:#{draft_id}")
    PredecessorDraft.Logger.log(:info, "SPECTATOR", "Timer subscription result: #{inspect(timer_sub_result)} for timer:#{draft_id}")
    
    # Load draft session
    case Drafts.get_session_by_draft_id(draft_id) do
      nil ->
        {:ok, 
          socket
          |> assign(:error, "Draft not found")
          |> assign(:draft, nil)
          |> assign(:page_title, "Draft Not Found")
        }
        
      draft ->
        # DEBUG: Log the initial draft state to see what we're loading
        PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** SPECTATOR MOUNT: Loading initial draft state for #{draft_id}")
        PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** Initial draft data: team1_picks=#{length(draft.team1_picks || [])}, team1_bans=#{length(draft.team1_bans || [])}, team2_picks=#{length(draft.team2_picks || [])}, team2_bans=#{length(draft.team2_bans || [])}")
        PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** Draft current_phase: #{draft.current_phase}")
        
        # CRITICAL DEBUG: Log the actual hero IDs in picks to check for mismatches
        PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** Team1 actual picks: #{inspect(draft.team1_picks)}")
        PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** Team2 actual picks: #{inspect(draft.team2_picks)}")
        PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** Team1 actual bans: #{inspect(draft.team1_bans)}")
        PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** Team2 actual bans: #{inspect(draft.team2_bans)}")
        
        # Load teams using registration IDs (draft.team1_id and team2_id are registration IDs)
        team1 = Teams.get_team_by_registration_id(draft.team1_id) || %{team_name: "Team 1", id: draft.team1_id}
        team2 = Teams.get_team_by_registration_id(draft.team2_id) || %{team_name: "Team 2", id: draft.team2_id}
        
        # Get all heroes for display - use same list as captain views
        heroes = PredecessorDraftWeb.Components.HeroGrid.heroes()
        
        # Calculate timer state
        timer_state = calculate_timer_state(draft)
        
        {:ok,
          socket
          |> assign(:draft_id, draft_id)
          |> assign(:draft, draft)
          |> assign(:team1, team1)
          |> assign(:team2, team2)
          |> assign(:heroes, heroes)
          |> assign(:timer_state, timer_state)
          |> assign(:timer_remaining, get_remaining_time(draft))
          |> assign(:error, nil)
          |> assign(:page_title, "Spectating Draft")
        }
    end
  end
  
  # Handle draft updates from PubSub
  @impl true
  def handle_info({"draft_updated", draft}, socket) do
    Logger.info("Spectator received draft update")
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_state, calculate_timer_state(draft))
    }
  end
  
  @impl true
  def handle_info({"draft_updated", draft, remaining_time}, socket) do
    Logger.info("Spectator received draft update with timer")
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
      |> assign(:timer_state, calculate_timer_state(draft))
    }
  end
  
  @impl true
  def handle_info({"timer_tick", draft, remaining_time}, socket) do
    timer_config = draft.timer_config || %{}
    PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** SPECTATOR timer_tick: #{remaining_time}s, current_turn=#{draft.current_turn}, in_bonus=#{timer_config["in_bonus_time"]}, team1_bonus=#{timer_config["team1_bonus_time"]}, team2_bonus=#{timer_config["team2_bonus_time"]}")
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
      |> assign(:timer_state, calculate_timer_state(draft))
    }
  end
  
  @impl true
  def handle_info({"selection_made", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"selection_made", draft, remaining_time}, socket) do
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  @impl true
  def handle_info({"ban_skipped", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"ban_skipped", draft, remaining_time}, socket) do
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  # Critical missing handler - this is likely the main picks/bans event
  @impl true
  def handle_info({"hero_selected", draft}, socket) do
    PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** SPECTATOR RECEIVED hero_selected event for draft #{draft.draft_id}")
    PredecessorDraft.Logger.log_pubsub_event("draft:#{draft.draft_id}", "hero_selected_received_by_spectator", %{
      team1_picks: length(draft.team1_picks || []),
      team2_picks: length(draft.team2_picks || []),
      team1_bans: length(draft.team1_bans || []),
      team2_bans: length(draft.team2_bans || [])
    })
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"hero_selected", draft, remaining_time}, socket) do
    PredecessorDraft.Logger.log_pubsub_event("draft:#{draft.draft_id}", "hero_selected_with_timer", %{
      team1_picks: length(draft.team1_picks || []),
      team2_picks: length(draft.team2_picks || []),
      team1_bans: length(draft.team1_bans || []),
      team2_bans: length(draft.team2_bans || []),
      timer_remaining: remaining_time
    })
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  # Coin toss events
  @impl true
  def handle_info({"coin_choice_made", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"coin_choice_made", draft, remaining_time}, socket) do
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  @impl true
  def handle_info({"coin_toss_complete", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"coin_toss_complete", draft, remaining_time}, socket) do
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  @impl true
  def handle_info({"pick_order_chosen", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"pick_order_chosen", draft, remaining_time}, socket) do
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  # Timer events
  @impl true
  def handle_info({"timer_reset", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"timer_reset", draft, remaining_time}, socket) do
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  @impl true
  def handle_info({"bonus_timer_activated", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"bonus_timer_activated", draft, remaining_time}, socket) do
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  @impl true
  def handle_info({:timer_state_update, timer_state}, socket) do
    # Handle timer state updates from TimerManager for real-time updates
    socket = socket
    |> assign(:timer_state, timer_state)
    |> assign(:current_timer_team, timer_state.current_team)
    |> assign(:current_timer_phase, timer_state.current_phase)
    |> assign(:timer_remaining, timer_state.current_timer_remaining || 0)
    
    {:noreply, socket}
  end
  
  # Draft completion
  @impl true
  def handle_info({"draft_completed", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"draft_completed", draft, remaining_time}, socket) do
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  @impl true
  def handle_info({"phase_changed", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"phase_changed", draft, remaining_time}, socket) do
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
    }
  end
  
  # Handle 3-parameter status_updated events (the main issue)
  @impl true
  def handle_info({"status_updated", draft, remaining_time}, socket) do
    PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** SPECTATOR HANDLING 3-param status_updated event for draft #{draft.draft_id}")
    PredecessorDraft.Logger.log_pubsub_event("draft:#{draft.draft_id}", "status_updated_3param_handled", %{
      team1_picks: length(draft.team1_picks || []),
      team2_picks: length(draft.team2_picks || []),
      team1_bans: length(draft.team1_bans || []),
      team2_bans: length(draft.team2_bans || []),
      timer_remaining: remaining_time
    })
    {:noreply, 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
      |> assign(:timer_state, calculate_timer_state(draft))
    }
  end

  # Handle Phoenix.Socket.Broadcast format messages
  @impl true
  def handle_info(%Phoenix.Socket.Broadcast{topic: topic, event: event, payload: payload}, socket) do
    PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** SPECTATOR received Phoenix.Socket.Broadcast: topic=#{topic}, event=#{event}")
    
    case event do
      "hero_selected" ->
        if Map.has_key?(payload, :draft) do
          draft = payload.draft
          remaining_time = payload[:remaining_time]
          PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** PROCESSING hero_selected from broadcast for draft #{draft.draft_id}")
          
          socket = socket
          |> assign(:draft, draft)
          
          socket = if remaining_time do
            assign(socket, :timer_remaining, remaining_time)
          else
            socket
          end
          
          {:noreply, socket}
        else
          PredecessorDraft.Logger.log(:warn, "SPECTATOR", "*** hero_selected broadcast missing draft data")
          {:noreply, socket}
        end
        
      "status_updated" ->
        if Map.has_key?(payload, :draft) do
          draft = payload.draft
          remaining_time = payload[:remaining_time]
          PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** PROCESSING status_updated from broadcast for draft #{draft.draft_id}")
          
          socket = socket
          |> assign(:draft, draft)
          |> assign(:timer_state, calculate_timer_state(draft))
          
          socket = if remaining_time do
            assign(socket, :timer_remaining, remaining_time)
          else
            socket
          end
          
          {:noreply, socket}
        else
          PredecessorDraft.Logger.log(:warn, "SPECTATOR", "*** status_updated broadcast missing draft data")
          {:noreply, socket}
        end
        
      _ ->
        PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** SPECTATOR ignoring unknown broadcast event: #{event}")
        {:noreply, socket}
    end
  end

  # Handle other broadcast messages generically - WITH DEBUGGING
  @impl true
  def handle_info({event, data}, socket) do
    PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** SPECTATOR received UNKNOWN 2-param event: #{inspect(event)} with data type: #{inspect(data.__struct__ || :not_struct)}")
    {:noreply, socket}
  end
  
  @impl true
  def handle_info({event, data, extra}, socket) do
    PredecessorDraft.Logger.log(:info, "SPECTATOR", "*** SPECTATOR received UNKNOWN 3-param event: #{inspect(event)} with data type: #{inspect(data.__struct__ || :not_struct)}")
    {:noreply, socket}
  end
  
  # Catch ANY other message format  
  @impl true
  def handle_info(message, socket) do
    PredecessorDraft.Logger.log(:warn, "SPECTATOR", "*** SPECTATOR received UNEXPECTED message format: #{inspect(message)}")
    {:noreply, socket}
  rescue
    error ->
      PredecessorDraft.Logger.log(:error, "SPECTATOR", "*** SPECTATOR CRASH in handle_info: #{inspect(error)}")
      {:noreply, socket}
  end
  
  # Helper functions
  
  defp calculate_timer_state(draft) do
    timer_config = draft.timer_config || %{}
    current_team = get_current_turn_team(draft)
    
    # Get detailed timer state similar to captain view
    timer_strategy = timer_config["timer_strategy_enabled"] || false
    current_phase = if timer_config["in_bonus_time"], do: :bonus_timer, else: :main_timer
    
    # Calculate remaining times for both teams
    team1_main_remaining = timer_config["team1_timer"] || 20
    team2_main_remaining = timer_config["team2_timer"] || 20
    team1_bonus_remaining = timer_config["team1_bonus_time"] || 10  
    team2_bonus_remaining = timer_config["team2_bonus_time"] || 10
    
    # Adjust display based on whose turn it is and what phase
    team1_display_time = cond do
      current_team != "team1" -> team1_main_remaining
      current_phase == :bonus_timer -> 0
      true -> team1_main_remaining
    end
    
    team2_display_time = cond do
      current_team != "team2" -> team2_main_remaining  
      current_phase == :bonus_timer -> 0
      true -> team2_main_remaining
    end
    
    %{
      current_team: current_team,
      current_phase: current_phase,
      timer_enabled: timer_strategy,
      team1_main_timer: team1_display_time,
      team2_main_timer: team2_display_time,
      team1_bonus_remaining: team1_bonus_remaining,
      team2_bonus_remaining: team2_bonus_remaining,
      team1_in_bonus: current_team == "team1" && current_phase == :bonus_timer,
      team2_in_bonus: current_team == "team2" && current_phase == :bonus_timer
    }
  end
  
  defp get_remaining_time(draft) do
    case Drafts.Session.get_timer_remaining(draft) do
      nil -> 20
      time -> time
    end
  end
  
  
  # Helper functions for template
  
  def get_current_action_index(draft) do
    total_picks = length(draft.team1_picks || []) + length(draft.team2_picks || [])
    total_bans = length(draft.team1_bans || []) + length(draft.team2_bans || [])
    total_picks + total_bans + 1
  end
  
  # Use the authoritative current_turn from the draft record instead of calculating
  def get_current_turn_team(draft) do
    if draft.current_phase not in ["Ban Phase", "Pick Phase"] do
      nil
    else
      # Use the database field which is maintained by the draft system
      draft.current_turn
    end
  end
  
  # Helper function to get current turn using timer state for real-time updates (spectator version)
  def get_current_turn(assigns, fallback_draft) do
    # Use timer state if available for real-time updates
    if assigns[:timer_state] && assigns.timer_state[:current_team] do
      assigns.timer_state.current_team
    else
      # Fall back to draft state calculation
      get_current_turn_team(fallback_draft)
    end
  end
  
  def get_pick_index_for_team1(pick_number, draft) do
    # Map team1 pick positions to action indices in the draft sequence
    # Corrected mapping based on actual sequence:
    # Pick 1: action 4, Pick 2: action 7, Pick 3: action 8, Pick 4: action 13, Pick 5: action 14
    case pick_number do
      1 -> 4
      2 -> 7
      3 -> 8
      4 -> 13
      5 -> 14
      _ -> 999
    end
  end
  
  def get_pick_index_for_team2(pick_number, draft) do
    # Map team2 pick positions to action indices  
    # Corrected mapping based on actual sequence:
    # Pick 1: action 5, Pick 2: action 6, Pick 3: action 9, Pick 4: action 12, Pick 5: action 15
    case pick_number do
      1 -> 5
      2 -> 6
      3 -> 9
      4 -> 12
      5 -> 15
      _ -> 999
    end
  end
end