defmodule PredecessorDraftWeb.DraftLive do
  use PredecessorDraftWeb, :live_view

  alias PredecessorDraft.Drafts
  alias PredecessorDraft.Accounts
  alias PredecessorDraftWeb.Presence
  alias PredecessorDraftWeb.Components.HeroGrid
  
  # Import shared components for refactoring
  alias PredecessorDraftWeb.Components.{DraftHeader, TeamPanel, BansDisplay, DraftStatus, TimerDisplay}

  @impl true
  def mount(%{"draft_id" => draft_id}, session, socket) do
    # Store draft_id and session for later use in handle_params
    socket = 
      socket
      |> assign(:draft_id, draft_id)
      |> assign(:session, session)
      |> assign(:error, nil)
    
    {:ok, socket}
  end

  @impl true
  def handle_params(params, _url, socket) do
    # Extract authentication and captain information from URL params
    draft_id = socket.assigns.draft_id
    captain_param = Map.get(params, "captain") || get_connect_params(socket)["captain"]
    token = Map.get(params, "token") || get_connect_params(socket)["token"] || Map.get(socket.assigns.session, "token")

    case initialize_draft_session(draft_id, captain_param, token) do
      {:ok, draft, user, captain_role} ->
        # Subscribe to draft updates
        Phoenix.PubSub.subscribe(PredecessorDraft.PubSub, "draft:#{draft_id}")
        
        # Start timer manager for this draft if not already running
        case PredecessorDraft.TimerSupervisor.start_timer_for_draft(draft_id) do
          {:ok, _pid} -> 
            IO.puts("Timer manager started for draft #{draft_id}")
          {:error, {:already_started, _pid}} -> 
            IO.puts("Timer manager already running for draft #{draft_id}")
          error -> 
            IO.puts("Error starting timer manager: #{inspect(error)}")
        end
        
        # Don't mark team ready yet - wait for page confirmation
        # PredecessorDraft.TimerManager.team_ready(draft_id, captain_role)
        
        # Get initial timer state
        timer_state = case PredecessorDraft.TimerManager.get_state(draft_id) do
          {:error, _} -> %{}
          state -> state
        end
        
        # Client-side timer disabled - GenServer broadcasts handle all timer updates
        
        # Track presence for this captain with anonymized display name
        # Use "Captain 1" or "Captain 2" instead of real Discord names for privacy
        anonymized_name = case captain_role do
          "team1" -> "Team 1 Captain"
          "team2" -> "Team 2 Captain"
          _ -> "Captain"
        end
        
        {:ok, _} = Presence.track(
          self(),
          "draft:#{draft_id}",
          captain_role,
          %{
            user_id: user.id,
            user_name: anonymized_name,  # Only anonymized name sent to clients
            joined_at: DateTime.utc_now(),
            captain_role: captain_role
            # Note: Discord names completely removed from WebSocket broadcasts
          }
        )

        # Get team information
        {team1, team2} = PredecessorDraft.Teams.get_draft_teams_with_captains(draft)

        # Update captain connection status
        {:ok, updated_draft} = Drafts.captain_join(draft, captain_role)

        # Fix draft phase if it's out of sync
        updated_draft = fix_draft_phase_if_needed(updated_draft)
        
        # Only show waiting modal if we're in the initial waiting phase
        # AND both captains are not present
        should_wait_for_captains = 
          updated_draft.current_phase == "waiting" && not both_captains_present?(draft_id)
        
        socket = 
          socket
          |> assign(:draft, updated_draft)
          |> assign(:user, user)
          |> assign(:captain_role, captain_role)
          |> assign(:team1, team1)
          |> assign(:team2, team2)
          |> assign(:waiting_for_captains, should_wait_for_captains)
          |> assign(:waiting_for_other_captain, false)
          |> assign(:both_captains_present, both_captains_present?(draft_id))
          |> assign(:presence, %{})
          |> assign(:error, nil)
          |> assign(:coin_flip_animation, false)
          |> assign(:page_title, "Draft #{draft_id}")
          |> assign(:role_filter, "all")
          |> assign(:timer, 20)
          |> assign(:timer_remaining, PredecessorDraft.Drafts.Session.get_timer_remaining(updated_draft))
          |> assign(:pick_order_transitioning, false)
          |> assign(:selected_hero, nil)
          |> assign(:timer_state, timer_state)
          |> assign(:page_ready, false)
          |> assign(:countdown_value, 0)
          |> assign(:show_countdown, false)
          |> assign(:preparing_draft, false)

        {:noreply, socket}

      {:error, reason} ->
        {:noreply,
         socket
         |> assign(:error, format_error(reason))
         |> assign(:draft, nil)
         |> assign(:page_title, "Draft Error")}
    end
  end


  @impl true
  def handle_event("page_fully_loaded", _params, socket) do
    # Page is fully loaded, now mark team as ready after a small delay
    if not socket.assigns[:page_ready] do
      draft_id = socket.assigns.draft.draft_id
      captain_role = socket.assigns.captain_role
      current_phase = socket.assigns.draft.current_phase
      
      # Mark that this page is ready (to prevent duplicate events)
      socket = assign(socket, :page_ready, true)
      
      # Add a small preparation delay (1 second) then mark team ready
      Process.send_after(self(), :mark_team_ready, 1000)
      
      # Only show "preparing draft" for Ban/Pick phases, not Coin Toss
      show_preparing = current_phase in ["Ban Phase", "Pick Phase"]
      
      {:noreply, assign(socket, :preparing_draft, show_preparing)}
    else
      # Already marked ready, ignore duplicate event
      {:noreply, socket}
    end
  end
  
  @impl true
  def handle_event("coin_choice", %{"choice" => choice}, socket) do
    case Drafts.make_coin_choice(socket.assigns.draft, socket.assigns.captain_role, choice) do
      {:ok, updated_draft} ->
        {:noreply, assign(socket, :draft, updated_draft)}
      
      {:error, error_message} ->
        {:noreply, 
         socket
         |> put_flash(:error, error_message)
         |> assign(:error, error_message)}
    end
  end

  @impl true
  def handle_event("choose_pick_order", %{"order" => order}, socket) do
    draft = socket.assigns.draft
    
    # Only the coin toss winner can choose pick order
    if draft.coin_toss_winner == socket.assigns.captain_role do
      first_pick = if order == "first", do: socket.assigns.captain_role, else: opposite_team(socket.assigns.captain_role)
      
      case Drafts.set_pick_order(draft, first_pick) do
        {:ok, updated_draft} ->
          # The countdown is now automatically triggered server-side in set_pick_order
          # Just update local state and broadcast the change
          socket = 
            socket
            |> assign(:draft, updated_draft)
            |> assign(:pick_order_transitioning, true)
          
          # Broadcast the update - countdown will be triggered server-side
          Phoenix.PubSub.broadcast(
            PredecessorDraft.PubSub,
            "draft:#{draft.draft_id}",
            {"pick_order_chosen", updated_draft}
          )
          {:noreply, socket}
        {:error, reason} ->
          {:noreply, put_flash(socket, :error, reason)}
      end
    else
      {:noreply, put_flash(socket, :error, "Only the coin toss winner can choose pick order")}
    end
  end
  
  @impl true
  def handle_event("filter_role", %{"role" => role}, socket) do
    {:noreply, assign(socket, :role_filter, role)}
  end
  
  @impl true
  def handle_event("select_hero", %{"hero" => hero_id}, socket) do
    draft = socket.assigns.draft
    captain_role = socket.assigns.captain_role
    
    # Check if it's this captain's turn and we're in draft phase
    next_team = PredecessorDraft.Drafts.Session.next_pick_team(draft)
    
    if next_team == captain_role && draft.current_phase in ["Ban Phase", "Pick Phase"] do
      if hero_id == "skipped" do
        # Handle skip - ONLY during ban phases
        current_action = PredecessorDraft.Drafts.determine_current_action(draft)
        
        if current_action == :ban && next_team == captain_role do
          require Logger
          Logger.info("=== LIVEVIEW SKIP START ===")
          Logger.info("Captain: #{captain_role}, Draft: #{draft.draft_id}")
          
          try do
            # Use the existing skip function
            case PredecessorDraft.Drafts.skip_current_turn(draft, captain_role) do
              {:ok, updated_draft} ->
                Logger.info("=== LIVEVIEW SKIP SUCCESS ===")
                socket = socket
                |> assign(:draft, updated_draft)
                |> assign(:selected_hero, nil)
                {:noreply, socket}
              {:error, reason} ->
                Logger.error("=== LIVEVIEW SKIP ERROR ===")
                Logger.error("Error: #{inspect(reason)}")
                {:noreply, put_flash(socket, :error, reason)}
            end
          rescue
            e ->
              Logger.error("=== LIVEVIEW SKIP CRASHED ===")
              Logger.error("Exception: #{inspect(e)}")
              Logger.error("Stack trace: #{Exception.format_stacktrace(__STACKTRACE__)}")
              {:noreply, put_flash(socket, :error, "Skip failed: #{inspect(e)}")}
          end
        else
          Logger.info("Skip blocked: action=#{current_action}, next_team=#{next_team}, captain=#{captain_role}")
          {:noreply, socket}
        end
      else
        # Regular hero selection - find the hero and assign it
        hero = Enum.find(HeroGrid.heroes(), fn hero -> hero.id == hero_id end)
        socket = assign(socket, :selected_hero, hero)
        {:noreply, socket}
      end
    else
      {:noreply, socket}
    end
  end
  
  @impl true  
  def handle_event("confirm_hero_selection", _params, socket) do
    case socket.assigns.selected_hero do
      nil -> 
        {:noreply, socket}
      hero ->
        draft = socket.assigns.draft
        captain_role = socket.assigns.captain_role
        
        case make_hero_selection(draft, captain_role, hero.id) do
          {:ok, updated_draft} ->
            # Determine action type and next team
            action_type = Drafts.determine_current_action(draft)
            next_team = PredecessorDraft.Drafts.Session.next_pick_team(updated_draft)
            
            # Notify timer manager of action completion
            if next_team do
              PredecessorDraft.TimerManager.team_action_completed(
                draft.draft_id, 
                captain_role, 
                action_type, 
                next_team
              )
            end
            
            # Broadcast the update
            Phoenix.PubSub.broadcast(
              PredecessorDraft.PubSub,
              "draft:#{draft.draft_id}",
              {"hero_selected", updated_draft}
            )
            socket = 
              socket
              |> assign(:draft, updated_draft)
              |> assign(:selected_hero, nil)  # Clear selection after locking
            {:noreply, socket}
            
          {:error, reason} ->
            {:noreply, put_flash(socket, :error, reason)}
        end
    end
  end
  
  @impl true
  def handle_event("cancel_hero_selection", _params, socket) do
    {:noreply, assign(socket, :selected_hero, nil)}
  end

  # Skip ban handler removed - now uses select_hero with "skipped"

  @impl true
  def handle_info(:mark_team_ready, socket) do
    # Now actually mark the team as ready in the timer manager
    draft_id = socket.assigns.draft.draft_id
    captain_role = socket.assigns.captain_role
    current_phase = socket.assigns.draft.current_phase
    
    PredecessorDraft.TimerManager.team_ready(draft_id, captain_role)
    
    # Only clear preparing_draft if we were actually showing it
    # (Don't change state unnecessarily during Coin Toss)
    new_preparing = if current_phase in ["Ban Phase", "Pick Phase"], do: false, else: socket.assigns[:preparing_draft] || false
    
    {:noreply, assign(socket, :preparing_draft, new_preparing)}
  end
  
  @impl true
  def handle_info(%{event: "presence_diff", payload: diff}, socket) do
    draft = socket.assigns.draft
    both_present = both_captains_present?(draft.draft_id)
    
    # Update socket with both_captains_present flag for button state
    socket = assign(socket, :both_captains_present, both_present)
    
    # If both captains just became present and we're in Coin Toss, broadcast ready message
    if both_present && draft.current_phase == "Coin Toss" && 
       !draft.team1_coin_choice && !draft.team2_coin_choice do
      # Broadcast that coin toss is ready to begin
      Phoenix.PubSub.broadcast(
        PredecessorDraft.PubSub,
        "draft:#{draft.draft_id}",
        {"coin_toss_ready", draft}
      )
    end
    
    # If both captains just became present and we're in Ban Phase with pick order chosen,
    # trigger the ban phase start (this handles the case where 2nd captain connects after pick order)
    if both_present && draft.current_phase == "Ban Phase" && draft.pick_order_chosen do
      # Check if we're currently waiting for the other captain
      if socket.assigns[:waiting_for_other_captain] do
        # Both captains now ready - start ban phase immediately
        PredecessorDraft.Drafts.start_ban_phase_sync_when_ready(draft.draft_id)
      end
    end
    
    # Show waiting modal if:
    # 1. We're in the waiting phase and not both captains are present, OR
    # 2. We're in pre-draft phases and someone disconnected
    # NOTE: Don't show waiting modal during active Ban/Pick phases to avoid flashing after selections
    # NOTE: For Coin Toss, only set waiting_for_captains once to avoid flashing
    should_wait = case draft.current_phase do
      "waiting" -> not both_present
      "Coin Toss" -> 
        # Only change waiting state if it would become false (both present)
        # This prevents flashing when presence temporarily becomes inconsistent
        current_waiting = socket.assigns[:waiting_for_captains] || false
        if both_present, do: false, else: current_waiting
      phase when phase in ["Pick Order Selection"] -> not both_present
      _ -> false  # Don't show waiting modal during Ban/Pick phases
    end
    
    socket = 
      socket
      |> handle_presence_diff(diff)
      |> assign(:waiting_for_captains, should_wait)
      |> assign(:both_captains_present, both_present)
    
    {:noreply, socket}
  end

  @impl true
  def handle_info({"draft_created", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"draft_created", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"status_updated", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"status_updated", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"coin_choice_made", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"coin_choice_made", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end
  
  @impl true
  def handle_info({"coin_toss_ready", draft}, socket) do
    # Both captains are now present, update the UI to show coin toss is ready
    socket = socket
    |> assign(:draft, draft)
    |> assign(:both_captains_present, true)
    
    {:noreply, socket}
  end

  @impl true
  def handle_info({"coin_toss_complete", draft}, socket) do
    socket = 
      socket
      |> assign(:draft, draft)
      |> assign(:coin_flip_animation, true)
      |> push_event("coin_flip_result", %{
        result: draft.coin_toss_result,
        winner: draft.coin_toss_winner
      })

    # Stop animation after 3 seconds
    Process.send_after(self(), :stop_coin_animation, 3000)

    {:noreply, socket}
  end
  
  @impl true
  def handle_info({"coin_toss_complete", draft, remaining_time}, socket) do
    socket = 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
      |> assign(:coin_flip_animation, true)
      |> push_event("coin_flip_result", %{
        result: draft.coin_toss_result,
        winner: draft.coin_toss_winner
      })

    Process.send_after(self(), :stop_coin_animation, 3000)

    {:noreply, socket}
  end

  @impl true
  def handle_info({"pick_order_chosen", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"pick_order_chosen", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"waiting_for_captain", _params}, socket) do
    socket = socket
    |> assign(:waiting_for_other_captain, true)
    |> assign(:pick_order_transitioning, true)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"ban_phase_starting", _params}, socket) do
    socket = socket
    |> assign(:waiting_for_other_captain, false)
    |> assign(:pick_order_transitioning, false)
    {:noreply, socket}
  end
  
  @impl true
  def handle_info({"ban_phase_started", draft}, socket) do
    # Ban phase started - just update draft
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"ban_phase_started", draft, remaining_time}, socket) do
    # Ban phase started with remaining time
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end
  
  @impl true
  def handle_info({"hero_selected", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"hero_selected", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end
  
  
  @impl true
  def handle_info({"selection_made", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"selection_made", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"draft_completed", draft}, socket) do
    socket = 
      socket
      |> assign(:draft, draft)
      |> put_flash(:info, "Draft completed successfully!")

    {:noreply, socket}
  end
  
  @impl true
  def handle_info({"draft_completed", draft, remaining_time}, socket) do
    socket = 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
      |> put_flash(:info, "Draft completed successfully!")

    {:noreply, socket}
  end

  @impl true
  def handle_info({"draft_cancelled", draft}, socket) do
    socket = 
      socket
      |> assign(:draft, draft)
      |> put_flash(:error, "Draft was cancelled")

    {:noreply, socket}
  end
  
  @impl true
  def handle_info({"draft_cancelled", draft, remaining_time}, socket) do
    socket = 
      socket
      |> assign(:draft, draft)
      |> assign(:timer_remaining, remaining_time)
      |> put_flash(:error, "Draft was cancelled")

    {:noreply, socket}
  end

  @impl true
  def handle_info(:stop_coin_animation, socket) do
    {:noreply, assign(socket, :coin_flip_animation, false)}
  end

  # Countdown tick handlers removed - now handled centrally

  # Transition to ban phase now handled centrally

  @impl true
  def handle_info({:check_timer, draft_id}, socket) do
    if socket.assigns.draft && socket.assigns.draft.draft_id == draft_id do
      case Drafts.handle_timer_expiry(socket.assigns.draft) do
        {:ok, updated_draft} ->
          {:noreply, assign(socket, :draft, updated_draft)}
        {:error, _reason} ->
          {:noreply, socket}
      end
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_info({"timer_started", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"timer_started", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"timer_expired", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"timer_expired", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"extra_time_added", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"extra_time_added", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"turn_skipped", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end

  @impl true
  def handle_info({"ban_skipped", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end

  @impl true
  def handle_info({"ban_skipped", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"timer_reset", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"timer_reset", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end
  
  @impl true
  def handle_info({"timer_tick", remaining_time}, socket) do
    # Also refresh the draft object to update bonus timer displays
    updated_draft = PredecessorDraft.Drafts.get_session_by_draft_id(socket.assigns.draft.draft_id)
    socket = socket
    |> assign(:timer_remaining, remaining_time)
    |> assign(:draft, updated_draft || socket.assigns.draft)
    {:noreply, socket}
  end

  @impl true
  def handle_info({"bonus_timer_activated", draft}, socket) do
    {:noreply, assign(socket, :draft, draft)}
  end
  
  @impl true
  def handle_info({"bonus_timer_activated", draft, remaining_time}, socket) do
    socket = socket
    |> assign(:draft, draft)
    |> assign(:timer_remaining, remaining_time)
    {:noreply, socket}
  end
  
  @impl true
  def handle_info({"bonus_timer_tick", %{team: team, remaining: remaining}}, socket) do
    # No logging in production for timer events
    
    # Store bonus timer values directly for immediate UI update
    socket = socket
    |> assign(:bonus_timer_team, team)
    |> assign(:bonus_timer_remaining, remaining)
    
    # Also refresh draft for timer_config updates
    updated_draft = PredecessorDraft.Drafts.get_session_by_draft_id(socket.assigns.draft.draft_id)
    {:noreply, assign(socket, :draft, updated_draft || socket.assigns.draft)}
  end

  @impl true
  def handle_info({:timer_state_update, timer_state}, socket) do
    # Update socket with new timer state from GenServer
    socket = socket
    |> assign(:timer_state, timer_state)
    |> assign(:current_timer_team, timer_state.current_team)
    |> assign(:current_timer_phase, timer_state.current_phase)
    |> assign(:timer_remaining, timer_state.current_timer_remaining || 0)
    
    {:noreply, socket}
  end

  # Client-side timer update disabled - GenServer handles all timer broadcasts
  @impl true
  def handle_info(:update_timer_display, socket) do
    # This handler is no longer used - timer updates come from GenServer broadcasts only
    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    # Clean up presence when user leaves
    if socket.assigns[:draft] && socket.assigns[:captain_role] do
      Drafts.captain_leave(socket.assigns.draft, socket.assigns.captain_role)
    end
    :ok
  end

  # Private helper functions

  defp initialize_draft_session(draft_id, captain_param, token) do
    with {:ok, draft} <- get_draft(draft_id),
         {:ok, user, captain_role} <- authenticate_user(token, captain_param, draft) do
      {:ok, draft, user, captain_role}
    else
      error -> error
    end
  end

  defp get_draft(draft_id) do
    case Drafts.get_session_by_draft_id(draft_id) do
      nil -> {:error, :draft_not_found}
      draft -> {:ok, draft}
    end
  end

  # Check if test access should be allowed based on environment and IP
  
  # Check if tournament draft token is expired (1 hour limit for tighter security)
  defp token_expired?(token) do
    try do
      # Extract timestamp from token if it contains one
      # Tournament tokens typically include timestamp info
      case String.split(token, "_") do
        [_, timestamp_str | _] when byte_size(timestamp_str) >= 10 ->
          case Integer.parse(timestamp_str) do
            {timestamp, _} ->
              # Check if token is older than 1 hour (tightened from 2 hours)
              current_time = System.system_time(:second)
              token_age = current_time - div(timestamp, 1000) # Convert from ms to seconds
              token_age > 3600 # 1 hour in seconds for better security
            _ ->
              false # Can't parse, assume valid to prevent breaking existing tokens
          end
        _ ->
          false # No timestamp found, assume valid for now
      end
    rescue
      _ -> false # Any error in parsing, assume valid to be safe
    end
  end
  
  # Add rate limiting for draft access attempts
  defp check_rate_limit(ip) do
    # Simple in-memory rate limiting - could be moved to Redis in future
    key = "draft_access_#{ip}"
    current_time = System.system_time(:second)
    
    case :ets.lookup(:rate_limit_table, key) do
      [{^key, count, last_attempt}] when current_time - last_attempt < 60 ->
        if count >= 10 do  # Max 10 attempts per minute
          {:error, :rate_limited}
        else
          :ets.insert(:rate_limit_table, {key, count + 1, current_time})
          :ok
        end
      _ ->
        # Create table if it doesn't exist (for dev environment)
        try do
          :ets.new(:rate_limit_table, [:named_table, :public])
        rescue
          _ -> :ok
        end
        :ets.insert(:rate_limit_table, {key, 1, current_time})
        :ok
    end
  end

  defp allow_test_access?(socket \\ nil) do
    # Always allow in dev/test environments
    if Application.get_env(:predecessor_draft, :environment) in [:dev, :test] do
      true
    else
      # In production, check IP whitelist
      # Get the remote IP from the socket if available
      remote_ip = get_remote_ip(socket)
      
      # Whitelist of allowed IPs (your local machine and localhost)
      whitelisted_ips = [
        "127.0.0.1",
        "::1", # IPv6 localhost
        "localhost",
        # Add your actual IP here if needed for Playwright testing
        # "YOUR_PUBLIC_IP"
      ]
      
      remote_ip in whitelisted_ips
    end
  end
  
  defp get_remote_ip(nil), do: nil
  defp get_remote_ip(socket) do
    # Get IP with proxy/load balancer awareness
    case socket do
      %{private: %{connect_info: %{peer_data: %{address: address}}}} ->
        # Convert IP to string
        ip_string = address |> :inet.ntoa() |> to_string()
        
        # Check for forwarded headers that might contain real IP
        forwarded_for = get_header(socket, "x-forwarded-for") || get_header(socket, "x-real-ip")
        
        case forwarded_for do
          # If behind proxy, use the first IP in x-forwarded-for chain
          forwarded_ip when is_binary(forwarded_ip) ->
            forwarded_ip |> String.split(",") |> List.first() |> String.trim()
          _ ->
            ip_string
        end
      _ -> nil
    end
  end
  
  defp get_header(socket, header_name) do
    case socket do
      %{private: %{connect_info: %{headers: headers}}} ->
        Enum.find_value(headers, fn {name, value} -> 
          if String.downcase(name) == header_name, do: value 
        end)
      _ -> nil
    end
  end

  defp authenticate_user(token, captain_param, draft) do
    # Check for test access - only allow in development or from whitelisted IPs
    if is_nil(token) or token == "" do
      # Check if we're in development environment or from a whitelisted IP
      if allow_test_access?() do
        # Create a test user for development/testing ONLY
        test_user = %Accounts.User{
          id: 1,
          user_id: "test_user_#{captain_param || "1"}",
          discord_username: "Captain #{captain_param || "1"}", # Anonymized
          is_admin: true
        }
        captain_role = if captain_param == "2", do: "team2", else: "team1"
        {:ok, test_user, captain_role}
      else
        # In production, require proper authentication
        {:error, :unauthorized}
      end
    else
      case Accounts.validate_draft_token(token) do
        {:ok, user, _draft_id} ->
          captain_role = determine_captain_role(user, captain_param, draft)
          {:ok, user, captain_role}
        
        {:error, _reason} ->
          {:error, :authentication_failed}
      end
    end
  end

  defp determine_captain_role(user, captain_param, draft) do
    cond do
      captain_param == "1" -> "team1"
      captain_param == "2" -> "team2"
      Accounts.User.admin?(user) -> "team1"  # Admins default to team1 but can switch
      user.id == draft.team1_captain_id -> "team1"
      user.id == draft.team2_captain_id -> "team2"
      true -> "team1"  # Default fallback
    end
  end

  defp both_captains_present?(draft_id) do
    Presence.both_captains_present?(draft_id)
  end

  defp handle_presence_diff(socket, %{joins: joins, leaves: leaves}) do
    presence = 
      socket.assigns.presence
      |> Map.merge(joins)
      |> Map.drop(Map.keys(leaves))
    
    assign(socket, :presence, presence)
  end

  defp format_error(:draft_not_found), do: "Draft session not found"
  defp format_error(:authentication_failed), do: "Authentication failed"
  defp format_error(error), do: "An error occurred: #{inspect(error)}"
  
  defp opposite_team("team1"), do: "team2"
  defp opposite_team("team2"), do: "team1"
  defp opposite_team(_), do: nil

  # UI Helper functions
  
  def is_my_turn?(draft, captain_role) do
    PredecessorDraft.Drafts.Session.next_pick_team(draft) == captain_role
  end
  
  # Updated version that uses timer state for real-time updates
  def is_my_turn?(assigns, draft, captain_role) do
    get_current_turn(assigns, draft) == captain_role
  end

  def coin_choice_disabled?(draft, team_role, both_captains_present) do
    # Disable coin choice if:
    # 1. This captain has already made a choice, OR
    # 2. Both captains are not yet connected
    already_chose = Map.get(draft, String.to_atom("#{team_role}_coin_choice")) != nil
    
    already_chose || !both_captains_present
  end

  def other_team_choice(draft, current_team) do
    other_team = if current_team == "team1", do: "team2", else: "team1"
    Map.get(draft, String.to_atom("#{other_team}_coin_choice"))
  end

  def show_coin_result?(draft) do
    PredecessorDraft.Drafts.Session.coin_toss_complete?(draft)
  end

  def coin_winner_class(draft, team_role) do
    if draft.coin_toss_winner == team_role do
      "text-green-600 font-bold"
    else
      "text-gray-500"
    end
  end

  def phase_display_name(phase) do
    case phase do
      "waiting" -> "Waiting for Captains"
      "Coin Toss" -> "Coin Toss"
      "Pick Order Selection" -> "Pick Order Selection"
      "Pick Phase" -> "Draft Phase"
      "Ban Phase" -> "Ban Phase"
      "Complete" -> "Draft Complete"
      "cancelled" -> "Draft Cancelled"
      nil -> "Unknown Phase"
      _ when is_binary(phase) -> String.capitalize(phase)
      _ -> "Invalid Phase"
    end
  end
  
  def get_hero_name(hero_id) do
    # Handle special case for skipped bans
    case hero_id do
      "skipped" -> "Skipped"
      _ ->
        hero = Enum.find(HeroGrid.heroes(), fn hero -> hero.id == hero_id end)
        if hero, do: hero.name, else: "Unknown Hero"
    end
  end
  
  def get_timer_remaining(draft) do
    PredecessorDraft.Drafts.Session.get_timer_remaining(draft)
  end
  
  
  defp make_hero_selection(draft, captain_role, hero_id) do
    # Determine if it's a pick or ban based on the draft sequence
    action = Drafts.determine_current_action(draft)
    
    # Use make_selection directly like auto-selection does
    # This avoids the complex state changes in confirm_hero_selection
    Drafts.make_selection(draft, captain_role, hero_id, to_string(action))
  end
  
  defp fix_draft_phase_if_needed(draft) do
    # Check if draft phase is out of sync and fix it
    cond do
      # If coin toss is complete and pick order is chosen, but still in Coin Toss phase
      draft.current_phase == "Coin Toss" && 
      draft.coin_toss_completed_at && 
      draft.pick_order_chosen ->
        case Drafts.update_session_status(draft, %{"current_phase" => "Ban Phase"}) do
          {:ok, updated_draft} -> updated_draft
          {:error, _} -> draft
        end
      
      # If coin toss is complete but no pick order chosen, should be in Pick Order Selection
      draft.current_phase == "Coin Toss" && 
      draft.coin_toss_completed_at && 
      not draft.pick_order_chosen ->
        case Drafts.update_session_status(draft, %{"current_phase" => "Pick Order Selection"}) do
          {:ok, updated_draft} -> updated_draft
          {:error, _} -> draft
        end
      
      # Otherwise, draft is in correct phase
      true -> draft
    end
  end

  # Helper function to get bonus timer for a team
  def get_team_bonus_timer(draft, team) do
    PredecessorDraft.Drafts.Session.get_bonus_timer_remaining(draft, team)
  end
  
  # Helper function to get main timer for a team
  def get_team_main_timer(draft, team) do
    PredecessorDraft.Drafts.Session.get_team_main_timer(draft, team)
  end
  
  # Calculate timer remaining client-side based on database timestamps
  defp calculate_team_timer_remaining(draft, team) do
    timer_config = draft.timer_config || %{}
    
    # Check if team is in bonus time
    in_bonus = timer_config["#{team}_in_bonus"] || false
    
    if in_bonus do
      # Calculate bonus timer remaining
      bonus_started_raw = timer_config["#{team}_bonus_started_at"]
      bonus_time = timer_config["#{team}_bonus_time"] || 0
      
      bonus_remaining = if bonus_started_raw do
        bonus_started = case bonus_started_raw do
          %NaiveDateTime{} -> bonus_started_raw
          binary when is_binary(binary) ->
            case NaiveDateTime.from_iso8601(binary) do
              {:ok, dt} -> dt
              _ -> nil
            end
          _ -> nil
        end
        
        if bonus_started do
          elapsed = NaiveDateTime.diff(NaiveDateTime.utc_now(), bonus_started, :second)
          max(0, bonus_time - elapsed)
        else
          0
        end
      else
        0
      end
      
      {0, bonus_remaining, true}  # {main_timer, bonus_timer, in_bonus}
    else
      # Calculate main timer remaining
      started_at_raw = timer_config["#{team}_timer_started_at"]
      timer_value = timer_config["#{team}_timer"] || 20
      
      main_remaining = if started_at_raw && timer_config["#{team}_timer_active"] do
        started_at = case started_at_raw do
          %NaiveDateTime{} -> started_at_raw
          binary when is_binary(binary) ->
            case NaiveDateTime.from_iso8601(binary) do
              {:ok, dt} -> dt
              _ -> nil
            end
          _ -> nil
        end
        
        if started_at do
          elapsed = NaiveDateTime.diff(NaiveDateTime.utc_now(), started_at, :second)
          max(0, timer_value - elapsed)
        else
          timer_value
        end
      else
        timer_value
      end
      
      bonus_time = timer_config["#{team}_bonus_time"] || 0
      {main_remaining, bonus_time, false}  # {main_timer, bonus_timer, in_bonus}
    end
  end
  
  # Helper function to check if team's timer is active
  def is_team_timer_active?(draft, team) do
    current_team = PredecessorDraft.Drafts.Session.next_pick_team(draft)
    current_team == team && draft.current_phase in ["Ban Phase", "Pick Phase"]
  end
  
  # Helper function to get current turn using timer state for real-time updates
  def get_current_turn(assigns, fallback_draft) do
    # Use timer state if available for real-time updates
    if assigns[:timer_state] && assigns.timer_state[:current_team] do
      assigns.timer_state.current_team
    else
      # Fall back to draft state calculation
      PredecessorDraft.Drafts.Session.next_pick_team(fallback_draft)
    end
  end
  
  # Helper function to get the current position in the draft sequence
  def get_current_draft_position(draft) do
    # Calculate total actions completed
    total_bans = length(draft.team1_bans || []) + length(draft.team2_bans || [])
    total_picks = length(draft.team1_picks || []) + length(draft.team2_picks || [])
    total_actions = total_bans + total_picks
    
    # Position is the next action (1-indexed)
    total_actions + 1
  end
  
  # Helper function to generate the visual draft sequence for both teams
  def get_draft_sequence(draft) do
    first_team = draft.first_pick_team || "team1"
    second_team = if first_team == "team1", do: "team2", else: "team1"
    
    # Get the configured ban count from settings or fall back to session logic
    # Check multiple places: settings.ban_count, settings.total_bans, or use default logic
    ban_count_from_settings = Map.get(draft.settings || %{}, "ban_count")
    total_bans_from_settings = Map.get(draft.settings || %{}, "total_bans")
    
    total_expected_bans = cond do
      ban_count_from_settings -> ban_count_from_settings * 2  # ban_count is per team, so double it
      total_bans_from_settings -> total_bans_from_settings
      true -> PredecessorDraft.Drafts.Session.get_total_expected_bans(draft)  # Use session logic (defaults to 6)
    end
    
    bans_per_team = div(total_expected_bans, 2)  # Split evenly between teams
    
    # Generate dynamic sequence based on configured ban count
    sequence = generate_draft_sequence(first_team, second_team, bans_per_team)

    # Add current selections to each slot
    team1_bans = draft.team1_bans || []
    team2_bans = draft.team2_bans || []
    team1_picks = draft.team1_picks || []
    team2_picks = draft.team2_picks || []
    
    # Only show content for positions up to the current draft progress
    current_position = get_current_draft_position(draft)
    
    Enum.map(sequence, fn slot ->
      # Only populate selection if we've reached this position in the draft
      selection = if slot.position <= current_position do
        case {slot.team, slot.action} do
          {"team1", :ban} -> 
            ban_index = Enum.count(sequence, fn s -> s.position < slot.position && s.team == "team1" && s.action == :ban end)
            Enum.at(team1_bans, ban_index)
          {"team2", :ban} ->
            ban_index = Enum.count(sequence, fn s -> s.position < slot.position && s.team == "team2" && s.action == :ban end)
            Enum.at(team2_bans, ban_index)
          {"team1", :pick} ->
            pick_index = Enum.count(sequence, fn s -> s.position < slot.position && s.team == "team1" && s.action == :pick end)
            Enum.at(team1_picks, pick_index)
          {"team2", :pick} ->
            pick_index = Enum.count(sequence, fn s -> s.position < slot.position && s.team == "team2" && s.action == :pick end)
            Enum.at(team2_picks, pick_index)
        end
      else
        nil  # Don't show content for future positions
      end
      
      Map.put(slot, :selection, selection)
    end)
  end
  
  # Generate the draft sequence dynamically based on ban count
  defp generate_draft_sequence(first_team, second_team, bans_per_team) do
    position = 1
    
    # Phase 1: First ban round (alternating, first team starts)
    ban_phase_1 = for i <- 1..2 do
      [
        %{position: position + (i-1)*2, team: first_team, action: :ban, label: "Ban #{i}"},
        %{position: position + (i-1)*2 + 1, team: second_team, action: :ban, label: "Ban #{i}"}
      ]
    end |> List.flatten()
    
    position = position + 4  # Move past first 4 bans
    
    # Phase 2: First pick round (1-2-2-1 pattern for 6 picks)
    pick_phase_1 = [
      %{position: position, team: first_team, action: :pick, label: "Pick 1"},
      %{position: position + 1, team: second_team, action: :pick, label: "Pick 1"},
      %{position: position + 2, team: second_team, action: :pick, label: "Pick 2"},
      %{position: position + 3, team: first_team, action: :pick, label: "Pick 2"},
      %{position: position + 4, team: first_team, action: :pick, label: "Pick 3"},
      %{position: position + 5, team: second_team, action: :pick, label: "Pick 3"}
    ]
    
    position = position + 6  # Move past first 6 picks
    
    # Phase 3: Second ban round (remaining bans, second team starts)
    remaining_bans_per_team = bans_per_team - 2
    ban_phase_2 = if remaining_bans_per_team > 0 do
      for i <- 1..remaining_bans_per_team do
        [
          %{position: position + (i-1)*2, team: second_team, action: :ban, label: "Ban #{i + 2}"},
          %{position: position + (i-1)*2 + 1, team: first_team, action: :ban, label: "Ban #{i + 2}"}
        ]
      end |> List.flatten()
    else
      []
    end
    
    position = position + remaining_bans_per_team * 2  # Move past second ban phase
    
    # Phase 4: Final pick round (4 picks, second team starts)
    pick_phase_2 = [
      %{position: position, team: second_team, action: :pick, label: "Pick 4"},
      %{position: position + 1, team: first_team, action: :pick, label: "Pick 4"},
      %{position: position + 2, team: first_team, action: :pick, label: "Pick 5"},
      %{position: position + 3, team: second_team, action: :pick, label: "Pick 5"}
    ]
    
    # Combine all phases
    ban_phase_1 ++ pick_phase_1 ++ ban_phase_2 ++ pick_phase_2
  end
end