defmodule PredecessorDraft.TimerManager do
  @moduledoc """
  GenServer that manages all timer state for a single draft.
  
  Responsibilities:
  - Track team readiness for synchronized start
  - Manage main timer (30s, resets based on strategy)
  - Manage bonus timer (permanent consumption, never resets)
  - Broadcast timer updates to all connected clients
  - Handle timer expiry and auto-selection
  """
  
  use GenServer
  require Logger
  alias PredecessorDraft.Drafts
  alias PredecessorDraft.Drafts.Session

  # Client API
  
  @doc """
  Starts a timer manager for a specific draft.
  """
  def start_link(draft_id) when is_binary(draft_id) do
    GenServer.start_link(__MODULE__, draft_id, name: via_tuple(draft_id))
  end

  @doc """
  Mark a team as ready. When both teams are ready, timers start.
  """
  def team_ready(draft_id, team) when team in ["team1", "team2"] do
    GenServer.call(via_tuple(draft_id), {:team_ready, team})
  catch
    :exit, {:noproc, _} -> 
      Logger.error("Timer manager not running for draft #{draft_id}")
      {:error, :timer_not_running}
  end

  @doc """
  Start the main timer for a specific team.
  """
  def start_timer(draft_id, team, duration \\ 20) do
    GenServer.call(via_tuple(draft_id), {:start_timer, team, duration})
  catch
    :exit, {:noproc, _} -> 
      Logger.error("Timer manager not running for draft #{draft_id}")
      {:error, :timer_not_running}
  end

  @doc """
  Stop all timers for the draft.
  """
  def stop_timers(draft_id) do
    GenServer.call(via_tuple(draft_id), :stop_timers)
  catch
    :exit, {:noproc, _} -> 
      {:error, :timer_not_running}
  end

  @doc """
  Handle when a team completes an action (pick/ban).
  """
  def team_action_completed(draft_id, team, action_type, next_team) do
    GenServer.call(via_tuple(draft_id), {:action_completed, team, action_type, next_team})
  catch
    :exit, {:noproc, _} -> 
      {:error, :timer_not_running}
  end

  @doc """
  Get the current timer state for display.
  """
  def get_state(draft_id) do
    GenServer.call(via_tuple(draft_id), :get_state)
  catch
    :exit, {:noproc, _} -> 
      {:error, :timer_not_running}
  end

  @doc """
  Reset the timer manager to initial state (useful for testing).
  """
  def reset(draft_id) do
    GenServer.call(via_tuple(draft_id), :reset)
  catch
    :exit, {:noproc, _} -> 
      {:error, :timer_not_running}
  end

  @doc """
  Start timers when draft phase changes to pick/ban (if both teams ready).
  """
  def start_timers_for_phase(draft_id) do
    GenServer.call(via_tuple(draft_id), :start_timers_for_phase)
  catch
    :exit, {:noproc, _} -> 
      {:error, :timer_not_running}
  end

  # Server Callbacks

  @impl true
  def init(draft_id) do
    Logger.info("TimerManager starting for draft #{draft_id}")
    
    # Load draft configuration
    draft = Drafts.get_session_by_draft_id(draft_id)
    timer_config = draft.timer_config || %{}
    
    initial_state = %{
      # Draft identification
      draft_id: draft_id,
      
      # Team synchronization
      team1_ready: false,
      team2_ready: false,
      both_teams_ready: false,
      draft_started: false,
      
      # Timer references (Process IDs for active timers)
      main_timer_ref: nil,
      bonus_timer_ref: nil,
      
      # Current state
      current_team: nil,
      current_phase: :waiting,  # :waiting, :main_timer, :bonus_timer
      
      # Main timer values (reset based on strategy)
      team1_main_remaining: timer_config["base_time"] || 20,
      team2_main_remaining: timer_config["base_time"] || 20,
      
      # Bonus timer values (PERMANENT - never reset)
      team1_bonus_remaining: timer_config["team1_extra_time"] || timer_config["bonus_time_per_team"] || 10,
      team2_bonus_remaining: timer_config["team2_extra_time"] || timer_config["bonus_time_per_team"] || 10,
      
      # Timer configuration
      timer_strategy: timer_config["timer_strategy"] || "20s per pick",
      timer_strategy_enabled: timer_config["timer_strategy_enabled"] || true,
      base_timer_duration: timer_config["base_time"] || 20,
      
      # Timestamps for client-side calculation
      timer_started_at: nil,
      timer_duration: nil,
    }
    
    {:ok, initial_state}
  end

  @impl true
  def handle_call({:team_ready, team}, _from, state) do
    Logger.info("Team #{team} marked as ready for draft #{state.draft_id}")
    
    # Mark team as ready
    new_state = Map.put(state, :"#{team}_ready", true)
    
    # RESET STATE FIX: If draft was previously started but no timers are running, reset to fresh state
    # This fixes the persistence issue where draft_started=true prevents timer restart
    reset_state = if new_state.draft_started && 
                     is_nil(new_state.main_timer_ref) && 
                     is_nil(new_state.bonus_timer_ref) do
      Logger.info("🔄 RESET: Draft was started but no timers running - resetting to fresh state")
      
      # Get fresh timer config
      draft = Drafts.get_session_by_draft_id(new_state.draft_id)
      timer_config = draft.timer_config || %{}
      
      %{new_state | 
        draft_started: false,
        current_phase: :waiting,
        current_team: nil,
        team1_bonus_remaining: timer_config["team1_extra_time"] || timer_config["bonus_time_per_team"] || 10,
        team2_bonus_remaining: timer_config["team2_extra_time"] || timer_config["bonus_time_per_team"] || 10,
        team1_main_remaining: timer_config["base_time"] || 20,
        team2_main_remaining: timer_config["base_time"] || 20
      }
    else
      new_state
    end
    
    # DEBUG: Log the exact state values
    Logger.info("🔍 DEBUG STATE: team1_ready=#{reset_state.team1_ready}, team2_ready=#{reset_state.team2_ready}, draft_started=#{reset_state.draft_started}")
    
    # Check if both teams are ready AND we're in pick/ban phase
    if reset_state.team1_ready && reset_state.team2_ready && !reset_state.draft_started do
      # Get the draft to check phase
      draft = Drafts.get_session_by_draft_id(state.draft_id)
      
      # Only start timers during pick/ban phases
      if draft.current_phase in ["Ban Phase", "Pick Phase"] do
        Logger.info("🎯 Both teams ready for draft #{state.draft_id} and in pick/ban phase - starting timers!")
        first_team = Session.next_pick_team(draft) || draft.first_pick_team || "team1"
        
        # Start the main timer for the first team with real-time ticking
        timer_ref = Process.send_after(self(), {:main_timer_tick, first_team}, 1000)
        
        final_state = %{reset_state | 
          both_teams_ready: true,
          draft_started: true,
          current_team: first_team,
          current_phase: :main_timer,
          main_timer_ref: timer_ref,
          timer_started_at: System.system_time(:millisecond),
          timer_duration: state.base_timer_duration
        }
        
        # Broadcast the timer start
        broadcast_timer_update(final_state)
        
        {:reply, {:ok, :draft_started}, final_state}
      else
        Logger.info("🔍 Both teams ready but not in pick/ban phase (#{draft.current_phase}) - waiting")
        {:reply, {:ok, {:waiting_for_phase, draft.current_phase}}, reset_state}
      end
    else
      waiting_for = cond do
        !reset_state.team1_ready -> "team1"
        !reset_state.team2_ready -> "team2"
        true -> nil
      end
      
      {:reply, {:ok, {:waiting_for, waiting_for}}, reset_state}
    end
  end

  @impl true
  def handle_call({:start_timer, team, duration}, _from, state) do
    Logger.info("Starting #{duration}s timer for #{team} in draft #{state.draft_id}")
    
    # Cancel any existing timers
    if state.main_timer_ref, do: Process.cancel_timer(state.main_timer_ref)
    if state.bonus_timer_ref, do: Process.cancel_timer(state.bonus_timer_ref)
    
    # Start new main timer with real-time ticking
    timer_ref = Process.send_after(self(), {:main_timer_tick, team}, 1000)
    
    new_state = %{state | 
      main_timer_ref: timer_ref,
      bonus_timer_ref: nil,
      current_team: team,
      current_phase: :main_timer,
      timer_started_at: System.system_time(:millisecond),
      timer_duration: duration
    }
    
    broadcast_timer_update(new_state)
    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call(:stop_timers, _from, state) do
    Logger.info("Stopping all timers for draft #{state.draft_id}")
    
    # Cancel all active timers
    if state.main_timer_ref, do: Process.cancel_timer(state.main_timer_ref)
    if state.bonus_timer_ref, do: Process.cancel_timer(state.bonus_timer_ref)
    
    new_state = %{state | 
      main_timer_ref: nil,
      bonus_timer_ref: nil,
      current_phase: :waiting,
      timer_started_at: nil,
      timer_duration: nil
    }
    
    broadcast_timer_update(new_state)
    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call({:action_completed, team, action_type, next_team}, _from, state) do
    Logger.info("Action completed by #{team} (#{action_type}), next team: #{next_team}")
    
    # Cancel any active timers
    if state.main_timer_ref, do: Process.cancel_timer(state.main_timer_ref)
    if state.bonus_timer_ref, do: Process.cancel_timer(state.bonus_timer_ref)
    
    # Timer always resets per pick - no need to save remaining time
    state_with_saved_time = state
    
    # Determine if we should reset the main timer
    should_reset = should_reset_timer?(state_with_saved_time, action_type)
    
    # Timer always resets to base duration (20s per pick)
    timer_duration = state.base_timer_duration
    
    # No round tracking needed for per-pick strategy
    
    # Start timer for next team with real-time ticking
    timer_ref = Process.send_after(self(), {:main_timer_tick, next_team}, 1000)
    
    new_state = %{state_with_saved_time |
      main_timer_ref: timer_ref,
      bonus_timer_ref: nil,
      current_team: next_team,
      current_phase: :main_timer,
      timer_started_at: System.system_time(:millisecond),
      timer_duration: timer_duration
    }
    
    # Timer always resets - update both teams' remaining time
    final_state = new_state
    |> Map.put(:team1_main_remaining, state.base_timer_duration)
    |> Map.put(:team2_main_remaining, state.base_timer_duration)
    
    broadcast_timer_update(final_state)
    {:reply, :ok, final_state}
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    # Calculate current remaining times for display
    current_remaining = calculate_current_remaining(state)
    
    display_state = %{
      draft_id: state.draft_id,
      current_team: state.current_team,
      current_phase: state.current_phase,
      team1_ready: state.team1_ready,
      team2_ready: state.team2_ready,
      both_teams_ready: state.both_teams_ready,
      team1_main_remaining: state.team1_main_remaining,
      team2_main_remaining: state.team2_main_remaining,
      team1_bonus_remaining: state.team1_bonus_remaining,
      team2_bonus_remaining: state.team2_bonus_remaining,
      current_timer_remaining: current_remaining,
      timer_started_at: state.timer_started_at,
      timer_duration: state.timer_duration
    }
    
    {:reply, display_state, state}
  end

  @impl true
  def handle_call(:reset, _from, state) do
    Logger.info("Resetting timer manager for draft #{state.draft_id}")
    
    # Cancel any active timers
    if state.main_timer_ref, do: Process.cancel_timer(state.main_timer_ref)
    if state.bonus_timer_ref, do: Process.cancel_timer(state.bonus_timer_ref)
    
    # Reset to initial state
    {:ok, new_state} = init(state.draft_id)
    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call(:start_timers_for_phase, _from, state) do
    Logger.info("Phase change timer start request for draft #{state.draft_id}")
    
    # Check if both teams are ready and no timers running
    if state.team1_ready && state.team2_ready && !state.draft_started && 
       is_nil(state.main_timer_ref) && is_nil(state.bonus_timer_ref) do
      
      # Get the draft to determine first team
      draft = Drafts.get_session_by_draft_id(state.draft_id)
      
      if draft.current_phase in ["Ban Phase", "Pick Phase"] do
        Logger.info("🎯 Starting timers for phase change: #{draft.current_phase}")
        first_team = Session.next_pick_team(draft) || draft.first_pick_team || "team1"
        
        # Start the main timer
        timer_ref = Process.send_after(self(), {:main_timer_tick, first_team}, 1000)
        
        new_state = %{state | 
          draft_started: true,
          current_team: first_team,
          current_phase: :main_timer,
          main_timer_ref: timer_ref,
          timer_started_at: System.system_time(:millisecond),
          timer_duration: state.base_timer_duration
        }
        
        broadcast_timer_update(new_state)
        {:reply, {:ok, :timers_started}, new_state}
      else
        {:reply, {:ok, :wrong_phase}, state}
      end
    else
      {:reply, {:ok, :conditions_not_met}, state}
    end
  end

  @impl true
  def handle_info({:main_timer_tick, team}, state) do
    # Calculate remaining time for main timer
    elapsed = div(System.system_time(:millisecond) - state.timer_started_at, 1000)
    remaining = max(0, state.timer_duration - elapsed)
    
    if remaining > 0 do
      Logger.debug("Main timer tick for #{team}: #{remaining}s remaining")
      
      # Continue countdown - schedule next tick
      timer_ref = Process.send_after(self(), {:main_timer_tick, team}, 1000)
      
      new_state = %{state | main_timer_ref: timer_ref}
      broadcast_timer_update(new_state)
      {:noreply, new_state}
    else
      # Timer expired - handle like before
      Logger.info("Main timer expired for #{team} in draft #{state.draft_id}")
      handle_main_timer_expired(team, state)
    end
  end

  @impl true
  def handle_info({:main_timer_expired, team}, state) do
    handle_main_timer_expired(team, state)
  end
  
  defp handle_main_timer_expired(team, state) do
    # Check if team has bonus time available
    bonus_key = :"#{team}_bonus_remaining"
    bonus_remaining = Map.get(state, bonus_key, 0)
    
    if bonus_remaining > 0 && state.timer_strategy_enabled do
      Logger.info("Starting bonus timer for #{team} with #{bonus_remaining}s remaining")
      
      # Start bonus countdown (tick every second)
      timer_ref = Process.send_after(self(), {:bonus_timer_tick, team}, 1000)
      
      new_state = %{state |
        main_timer_ref: nil,
        bonus_timer_ref: timer_ref,
        current_phase: :bonus_timer,
        timer_started_at: System.system_time(:millisecond),
        timer_duration: bonus_remaining
      }
      
      broadcast_timer_update(new_state)
      {:noreply, new_state}
    else
      # No bonus time available - handle timeout
      Logger.info("No bonus time for #{team}, triggering auto-selection")
      handle_timer_timeout(state, team)
      
      {:noreply, %{state | 
        main_timer_ref: nil,
        current_phase: :waiting
      }}
    end
  end

  @impl true
  def handle_info({:bonus_timer_tick, team}, state) do
    bonus_key = :"#{team}_bonus_remaining"
    current_bonus = Map.get(state, bonus_key, 0)
    
    if current_bonus > 0 do
      # Decrease bonus time by 1 second (PERMANENT CONSUMPTION)
      new_bonus = current_bonus - 1
      new_state = Map.put(state, bonus_key, new_bonus)
      
      Logger.debug("Bonus timer tick for #{team}: #{new_bonus}s remaining")
      
      if new_bonus > 0 do
        # Continue countdown
        timer_ref = Process.send_after(self(), {:bonus_timer_tick, team}, 1000)
        
        final_state = %{new_state | 
          bonus_timer_ref: timer_ref
        }
        
        broadcast_timer_update(final_state)
        {:noreply, final_state}
      else
        # Bonus time exhausted - FIRST broadcast 0, THEN trigger auto-selection
        Logger.info("Bonus time reached 0 for #{team}, broadcasting 0 then triggering auto-selection")
        
        # Broadcast the 0 state first
        zero_state = %{new_state | 
          bonus_timer_ref: nil,
          current_phase: :waiting
        }
        broadcast_timer_update(zero_state)
        
        # Small delay to ensure UI shows 0, then trigger auto-selection
        Process.send_after(self(), {:trigger_auto_selection, team}, 500)
        
        {:noreply, zero_state}
      end
    else
      # Should not happen, but handle gracefully
      Logger.warn("Bonus timer tick but no bonus time remaining for #{team}")
      {:noreply, state}
    end
  end

  @impl true
  def handle_info({:trigger_auto_selection, team}, state) do
    Logger.info("Triggering delayed auto-selection for #{team}")
    handle_timer_timeout(state, team)
    {:noreply, state}
  end

  @impl true
  def handle_info(msg, state) do
    Logger.warn("TimerManager received unexpected message: #{inspect(msg)}")
    {:noreply, state}
  end

  # Private Helper Functions

  defp via_tuple(draft_id) do
    {:via, Registry, {PredecessorDraft.TimerRegistry, draft_id}}
  end

  defp broadcast_timer_update(state) do
    Phoenix.PubSub.broadcast(
      PredecessorDraft.PubSub,
      "draft:#{state.draft_id}",
      {:timer_state_update, format_timer_state(state)}
    )
  end

  defp format_timer_state(state) do
    %{
      draft_id: state.draft_id,
      current_team: state.current_team,
      current_phase: state.current_phase,
      team1_ready: state.team1_ready,
      team2_ready: state.team2_ready,
      both_teams_ready: state.both_teams_ready,
      team1_bonus_remaining: state.team1_bonus_remaining,
      team2_bonus_remaining: state.team2_bonus_remaining,
      timer_started_at: state.timer_started_at,
      timer_duration: state.timer_duration,
      current_timer_remaining: calculate_current_remaining(state)
    }
  end

  defp should_reset_timer?(_state, _action_type) do
    # Always reset timer after every pick/ban (20s per action)
    true
  end

  defp calculate_current_remaining(state) do
    case state.current_phase do
      :main_timer when state.timer_started_at != nil ->
        elapsed = div(System.system_time(:millisecond) - state.timer_started_at, 1000)
        max(0, state.timer_duration - elapsed)
      :bonus_timer ->
        Map.get(state, :"#{state.current_team}_bonus_remaining", 0)
      _ ->
        0
    end
  end

  defp handle_timer_timeout(state, team) do
    # Trigger auto-selection in the draft system
    Task.start(fn ->
      draft = Drafts.get_session_by_draft_id(state.draft_id)
      
      if draft && draft.current_phase in ["Ban Phase", "Pick Phase"] do
        Logger.info("Triggering auto-selection for #{team}")
        
        # Let the draft system handle the auto-selection
        Drafts.handle_team_timer_expiry(draft, team)
      end
    end)
  end
end