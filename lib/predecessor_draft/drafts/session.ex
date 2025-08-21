defmodule PredecessorDraft.Drafts.Session do
  @moduledoc """
  Draft Session schema for the existing PostgreSQL database.
  
  This schema maps to the existing 'draft_sessions' table and manages
  the complete draft lifecycle including coin toss and hero selection.
  """
  
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  # Draft phases - match database constraints exactly
  @phases ["Coin Toss", "Pick Order Selection", "Ban Phase", "Pick Phase", "Complete"]
  @statuses ["Waiting", "In Progress", "Completed", "Stopped"]
  @coin_choices ["heads", "tails"]

  schema "draft_sessions" do
    field :draft_id, :string
    field :status, :string, default: "Waiting"
    field :current_phase, :string
    
    # Tournament and match relationships
    field :tournament_id, :string
    field :match_id, :binary_id
    
    # Team relationships
    field :team1_id, :binary_id
    field :team2_id, :binary_id
    
    # Captain tracking
    field :team1_captain_id, :string
    field :team2_captain_id, :string
    
    # Coin toss fields
    field :team1_coin_choice, :string
    field :team2_coin_choice, :string
    field :coin_toss_result, :string
    field :coin_toss_winner, :string  # "team1" or "team2"
    
    # Draft order and picks
    field :first_pick, :string         # "team1" or "team2" - actual database column name
    field :first_pick_team, :string    # "team1" or "team2" - alias for compatibility
    field :pick_order_chosen, :boolean, default: false
    field :current_turn, :string       # "team1" or "team2" - whose turn it is
    field :pick_order, :map            # jsonb field in database
    field :ban_order, :map             # jsonb field in database
    field :team1_picks, {:array, :string}, default: []    # jsonb array in database
    field :team2_picks, {:array, :string}, default: []    # jsonb array in database  
    field :team1_bans, {:array, :string}, default: []     # jsonb array in database
    field :team2_bans, {:array, :string}, default: []     # jsonb array in database
    
    # Connection tracking
    field :team1_connected, :boolean, default: false
    field :team2_connected, :boolean, default: false
    
    # Timing
    field :coin_toss_started_at, :utc_datetime
    field :coin_toss_completed_at, :utc_datetime
    field :draft_started_at, :utc_datetime
    field :draft_completed_at, :utc_datetime
    field :start_time, :utc_datetime
    field :completed_at, :utc_datetime
    field :stopped_at, :utc_datetime
    field :both_teams_connected_at, :naive_datetime
    field :coin_choices_enabled_at, :naive_datetime
    
    # Timer System
    field :current_timer_started_at, :naive_datetime
    field :current_timer_duration, :integer, default: 20  # seconds for current pick/ban
    field :current_timer_extra_time, :integer, default: 0  # extra seconds available
    field :timer_expired, :boolean, default: false
    field :timer_config, :map, default: %{
      "base_time" => 20,           # Base timer duration
      "timer_strategy_enabled" => true,   # Controls bonus time
      "timer_strategy" => "per pick",     # "per pick" | "per round"
      
      # Per-team timer system
      "team1_timer" => 20,         # Team1's current main timer
      "team1_timer_started_at" => nil,    # When team1's timer started
      "team1_timer_active" => false,      # Is team1's timer running?
      "team1_bonus_time" => 10,    # Team1's remaining bonus time
      "team1_in_bonus" => false,   # Is team1 using bonus time?
      "team1_bonus_started_at" => nil,    # When team1's bonus started
      
      "team2_timer" => 20,         # Team2's current main timer  
      "team2_timer_started_at" => nil,    # When team2's timer started
      "team2_timer_active" => false,      # Is team2's timer running?
      "team2_bonus_time" => 10,    # Team2's remaining bonus time
      "team2_in_bonus" => false,   # Is team2 using bonus time?
      "team2_bonus_started_at" => nil,    # When team2's bonus started
      
      # Round tracking for "per round" strategy
      "current_round" => "ban_phase_1",   # Track current round
      "team1_actions_this_round" => 0,    # Actions taken by team1 in current round
      "team2_actions_this_round" => 0,    # Actions taken by team2 in current round
      
      # Legacy fields for backward compatibility
      "team1_extra_time" => 10,    # Kept for compatibility
      "team2_extra_time" => 10,    # Kept for compatibility
      "bonus_time_per_team" => 10  # Kept for compatibility
    }
    
    # Additional database fields
    field :spectator_link, :string
    field :created_by, :binary_id
    field :stopped_by, :binary_id
    
    # Metadata
    field :settings, :map, default: %{}
    field :metadata, :map, default: %{}
    
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  @doc """
  Changeset for creating a new draft session
  """
  def create_changeset(session, attrs) do
    session
    |> cast(attrs, [:draft_id, :tournament_id, :match_id, :team1_id, :team2_id, 
                    :team1_captain_id, :team2_captain_id, :settings, :timer_config])
    |> validate_required([:draft_id, :team1_id, :team2_id])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:current_phase, @phases, allow_blank: true)
    |> unique_constraint(:draft_id)
    |> validate_different_teams()
    |> validate_timer_config()
    |> foreign_key_constraint(:team1_captain_id, name: :draft_sessions_team1_captain_id_fkey)
    |> foreign_key_constraint(:team2_captain_id, name: :draft_sessions_team2_captain_id_fkey)
  end

  @doc """
  Changeset for updating draft status and phase
  """
  def status_changeset(session, attrs) do
    session
    |> cast(attrs, [:status, :current_phase, :team1_connected, :team2_connected])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:current_phase, @phases)
    |> validate_phase_transition()
  end

  @doc """
  Changeset for coin toss operations
  """
  def coin_toss_changeset(session, attrs) do
    session
    |> cast(attrs, [:team1_coin_choice, :team2_coin_choice, :coin_toss_result, 
                    :coin_toss_winner, :first_pick_team, :coin_toss_started_at, 
                    :coin_toss_completed_at, :current_phase, :status])
    |> validate_inclusion(:team1_coin_choice, @coin_choices, allow_blank: true)
    |> validate_inclusion(:team2_coin_choice, @coin_choices, allow_blank: true)
    |> validate_inclusion(:coin_toss_result, @coin_choices, allow_blank: true)
    |> validate_inclusion(:coin_toss_winner, ["team1", "team2"], allow_blank: true)
    |> validate_inclusion(:first_pick_team, ["team1", "team2"], allow_blank: true)
    |> validate_inclusion(:current_phase, @phases, allow_blank: true)
    |> validate_inclusion(:status, @statuses, allow_blank: true)
    |> validate_coin_toss_logic()
  end

  @doc """
  Changeset for hero picks and bans
  """
  def picks_changeset(session, attrs) do
    session
    |> cast(attrs, [:team1_picks, :team2_picks, :team1_bans, :team2_bans, 
                    :draft_started_at, :draft_completed_at, :current_phase, :status,
                    :current_timer_started_at, :current_timer_duration, :current_timer_extra_time, :timer_expired,
                    :pick_order_chosen, :first_pick_team, :current_turn])
    |> validate_inclusion(:current_turn, ["team1", "team2"], allow_blank: true)
    |> validate_pick_counts()
    |> validate_no_duplicate_heroes()
  end

  @doc """
  Changeset for timer operations
  """
  def timer_changeset(session, attrs) do
    session
    |> cast(attrs, [:current_timer_started_at, :current_timer_duration, :current_timer_extra_time, 
                    :timer_expired, :timer_config, :current_phase, :status])
    |> validate_timer_config()
  end

  @doc """
  Get all valid phases
  """
  def phases, do: @phases

  @doc """
  Get all valid statuses
  """
  def statuses, do: @statuses

  @doc """
  Check if both teams have made coin choices
  """
  def both_teams_chose_coin?(session) do
    session.team1_coin_choice && session.team2_coin_choice
  end

  @doc """
  Check if coin toss is complete
  """
  def coin_toss_complete?(session) do
    session.coin_toss_result && session.coin_toss_winner
  end

  @doc """
  Check if both captains are connected
  """
  def both_captains_connected?(session) do
    session.team1_connected && session.team2_connected
  end

  @doc """
  Check if draft is ready to start
  """
  def ready_to_draft?(session) do
    coin_toss_complete?(session) && both_captains_connected?(session)
  end

  @doc """
  Get the team that should pick next based on Predecessor draft order:
  1st-Ban, 2nd-Ban, 1st-Ban, 2nd-Ban, 1st-Pick, 2nd-Pick, 2nd-Pick, 1st-Pick, 
  1st-Pick, 2nd-Pick, 2nd-Ban, 1st-Ban, 2nd-Pick, 1st-Pick, 1st-Pick, 2nd-Pick
  """
  def next_pick_team(session) do
    return_if_draft_complete(session) || calculate_next_team(session)
  end
  
  defp return_if_draft_complete(session) do
    if draft_complete?(session), do: nil
  end
  
  defp calculate_next_team(session) do
    total_picks = length(session.team1_picks || []) + length(session.team2_picks || [])
    total_bans = length(session.team1_bans || []) + length(session.team2_bans || [])
    total_actions = total_picks + total_bans
    
    # Predecessor draft sequence with first team being the one who won coin toss
    first_team = session.first_pick_team
    second_team = other_team(first_team)
    
    # Define the exact sequence: {team, action_type}
    sequence = [
      {first_team, :ban},    # 1. 1st-Ban
      {second_team, :ban},   # 2. 2nd-Ban  
      {first_team, :ban},    # 3. 1st-Ban
      {second_team, :ban},   # 4. 2nd-Ban
      {first_team, :pick},   # 5. 1st-Pick
      {second_team, :pick},  # 6. 2nd-Pick
      {second_team, :pick},  # 7. 2nd-Pick (back-to-back)
      {first_team, :pick},   # 8. 1st-Pick  
      {first_team, :pick},   # 9. 1st-Pick (back-to-back)
      {second_team, :pick},  # 10. 2nd-Pick
      {second_team, :ban},   # 11. 2nd-Ban (second ban phase)
      {first_team, :ban},    # 12. 1st-Ban
      {second_team, :pick},  # 13. 2nd-Pick
      {first_team, :pick},   # 14. 1st-Pick
      {first_team, :pick},   # 15. 1st-Pick (back-to-back)
      {second_team, :pick}   # 16. 2nd-Pick
    ]
    
    # Handle variable ban counts by adding extra bans after position 12 (after first 3 picks each)
    total_expected_bans = get_total_expected_bans(session)
    
    if total_expected_bans > 6 do
      # Add extra bans after position 12, alternating teams
      extra_bans = total_expected_bans - 6
      extra_ban_sequence = generate_extra_bans(extra_bans, first_team, second_team)
      
      # Insert extra bans after position 12 (index 11)
      {before_extra, after_extra} = Enum.split(sequence, 12)
      sequence = before_extra ++ extra_ban_sequence ++ after_extra
    end
    
    if total_actions < length(sequence) do
      {team, _action} = Enum.at(sequence, total_actions)
      team
    else
      nil  # Draft complete
    end
  end
  
  def get_total_expected_bans(session) do
    # Default to 6 bans, but could be configured per tournament
    Map.get(session.settings || %{}, "total_bans", 6)
  end
  
  defp generate_extra_bans(count, first_team, second_team) do
    # Extra bans alternate, starting with second team (continuing from position 11)
    0..(count - 1)
    |> Enum.map(fn i -> 
      if rem(i, 2) == 0, do: {first_team, :ban}, else: {second_team, :ban}
    end)
  end

  @doc """
  Get the action type (pick or ban) that should happen next
  """
  def next_action_type(session) do
    total_picks = length(session.team1_picks || []) + length(session.team2_picks || [])
    total_bans = length(session.team1_bans || []) + length(session.team2_bans || [])
    total_actions = total_picks + total_bans
    
    first_team = session.first_pick_team
    second_team = other_team(first_team)
    
    # Same sequence as in next_pick_team
    sequence = [
      {first_team, :ban}, {second_team, :ban}, {first_team, :ban}, {second_team, :ban},
      {first_team, :pick}, {second_team, :pick}, {second_team, :pick}, {first_team, :pick},
      {first_team, :pick}, {second_team, :pick}, {second_team, :ban}, {first_team, :ban},
      {second_team, :pick}, {first_team, :pick}, {first_team, :pick}, {second_team, :pick}
    ]
    
    total_expected_bans = get_total_expected_bans(session)
    
    if total_expected_bans > 6 do
      extra_bans = total_expected_bans - 6
      extra_ban_sequence = generate_extra_bans(extra_bans, first_team, second_team)
      {before_extra, after_extra} = Enum.split(sequence, 12)
      sequence = before_extra ++ extra_ban_sequence ++ after_extra
    end
    
    if total_actions < length(sequence) do
      {_team, action} = Enum.at(sequence, total_actions)
      action
    else
      nil
    end
  end

  @doc """
  Check if draft is complete
  """
  def draft_complete?(session) do
    # Draft is complete when both teams have 5 picks each
    # Bans are optional and can be skipped
    team1_picks = length(session.team1_picks || [])
    team2_picks = length(session.team2_picks || [])
    
    # Only check picks - bans can be skipped
    team1_picks >= 5 && team2_picks >= 5
  end

  # Private validation functions

  defp validate_different_teams(changeset) do
    team1_id = get_field(changeset, :team1_id)
    team2_id = get_field(changeset, :team2_id)
    
    if team1_id && team2_id && team1_id == team2_id do
      add_error(changeset, :team2_id, "must be different from team1")
    else
      changeset
    end
  end

  defp validate_phase_transition(changeset) do
    # Add logic to ensure valid phase transitions
    changeset
  end

  defp validate_coin_toss_logic(changeset) do
    team1_choice = get_field(changeset, :team1_coin_choice)
    team2_choice = get_field(changeset, :team2_coin_choice)
    result = get_field(changeset, :coin_toss_result)
    winner = get_field(changeset, :coin_toss_winner)
    
    cond do
      team1_choice && team2_choice && team1_choice == team2_choice ->
        add_error(changeset, :team2_coin_choice, "teams cannot choose the same side")
      
      result && winner ->
        expected_winner = if team1_choice == result, do: "team1", else: "team2"
        if winner != expected_winner do
          add_error(changeset, :coin_toss_winner, "does not match coin toss result")
        else
          changeset
        end
      
      true -> changeset
    end
  end

  defp validate_pick_counts(changeset) do
    team1_picks = get_field(changeset, :team1_picks) || []
    team2_picks = get_field(changeset, :team2_picks) || []
    
    cond do
      length(team1_picks) > 5 ->
        add_error(changeset, :team1_picks, "cannot have more than 5 picks")
      length(team2_picks) > 5 ->
        add_error(changeset, :team2_picks, "cannot have more than 5 picks")
      true -> changeset
    end
  end

  defp validate_no_duplicate_heroes(changeset) do
    team1_picks = get_field(changeset, :team1_picks) || []
    team2_picks = get_field(changeset, :team2_picks) || []
    team1_bans = get_field(changeset, :team1_bans) || []
    team2_bans = get_field(changeset, :team2_bans) || []
    
    # Filter out "skipped" entries since they can appear multiple times
    all_selections = (team1_picks ++ team2_picks ++ team1_bans ++ team2_bans)
    |> Enum.filter(fn selection -> selection != "skipped" end)
    
    unique_selections = Enum.uniq(all_selections)
    
    if length(all_selections) != length(unique_selections) do
      add_error(changeset, :base, "duplicate hero selections are not allowed")
    else
      changeset
    end
  end

  defp validate_timer_config(changeset) do
    timer_config = get_field(changeset, :timer_config) || %{}
    
    changeset
    |> validate_timer_values(timer_config)
  end
  
  defp validate_timer_values(changeset, timer_config) do
    cond do
      is_integer(timer_config["base_time"]) and timer_config["base_time"] < 5 ->
        add_error(changeset, :timer_config, "base_time must be at least 5 seconds")
      
      is_integer(timer_config["base_time"]) and timer_config["base_time"] > 300 ->
        add_error(changeset, :timer_config, "base_time must be less than 300 seconds")
      
      is_integer(timer_config["extra_time"]) and timer_config["extra_time"] < 0 ->
        add_error(changeset, :timer_config, "extra_time cannot be negative")
        
      is_integer(timer_config["extra_time"]) and timer_config["extra_time"] > 60 ->
        add_error(changeset, :timer_config, "extra_time must be less than 60 seconds")
      
      true -> changeset
    end
  end

  @doc """
  Calculate remaining timer seconds for current phase
  """
  def get_timer_remaining(session) do
    # ALWAYS return main timer - never bonus timer
    if session.current_timer_started_at && session.current_phase in ["Ban Phase", "Pick Phase"] do
      elapsed = NaiveDateTime.diff(NaiveDateTime.utc_now(), session.current_timer_started_at, :second)
      base_time = session.current_timer_duration || session.timer_config["base_time"] || 20
      total_time = base_time + (session.current_timer_extra_time || 0)
      
      max(0, total_time - elapsed)
    else
      nil
    end
  end
  
  @doc """
  Get bonus timer remaining for a specific team
  """
  def get_bonus_timer_remaining(session, team) do
    if Map.get(session.timer_config || %{}, "in_bonus_time", false) && 
       session.timer_config["bonus_time_team"] == team do
      # Calculate bonus timer remaining
      bonus_started_raw = session.timer_config["bonus_time_started_at"]
      bonus_duration = session.timer_config["bonus_time_duration"] || 0
      
      IO.puts("DEBUG: get_bonus_timer_remaining for #{team}")
      IO.puts("DEBUG: bonus_started_raw = #{inspect(bonus_started_raw)}")
      IO.puts("DEBUG: bonus_duration = #{bonus_duration}")
      
      if bonus_started_raw do
        # Handle both NaiveDateTime struct and string (from JSON storage)
        bonus_started = case bonus_started_raw do
          %NaiveDateTime{} -> 
            IO.puts("DEBUG: bonus_started is NaiveDateTime struct")
            bonus_started_raw
          binary when is_binary(binary) ->
            IO.puts("DEBUG: bonus_started is string, parsing...")
            case NaiveDateTime.from_iso8601(binary) do
              {:ok, dt} -> 
                IO.puts("DEBUG: Successfully parsed: #{inspect(dt)}")
                dt
              {:error, reason} -> 
                IO.puts("DEBUG: Failed to parse: #{inspect(reason)}")
                nil
            end
          _ -> 
            IO.puts("DEBUG: bonus_started is unknown type: #{inspect(bonus_started_raw)}")
            nil
        end
        
        if bonus_started do
          now = NaiveDateTime.utc_now()
          elapsed = NaiveDateTime.diff(now, bonus_started, :second)
          remaining = max(0, bonus_duration - elapsed)
          IO.puts("DEBUG: now = #{inspect(now)}")
          IO.puts("DEBUG: elapsed = #{elapsed}s, remaining = #{remaining}s")
          remaining
        else
          IO.puts("DEBUG: Could not parse bonus_started, returning 0")
          0
        end
      else
        IO.puts("DEBUG: No bonus_started_raw, returning 0")
        0
      end
    else
      IO.puts("DEBUG: Not in bonus time or wrong team")
      nil
    end
  end

  @doc """
  Check if timer has expired
  """
  def timer_expired?(session) do
    case get_timer_remaining(session) do
      nil -> false
      0 -> true
      remaining when remaining <= 0 -> true
      _ -> false
    end
  end

  @doc """
  Get timer for specific action type (pick vs ban)
  """
  def get_timer_for_action(session, action) when action in [:pick, :ban] do
    timer_config = session.timer_config || %{}
    action_key = "#{action}_time"
    
    cond do
      not timer_config["enabled"] -> nil
      is_integer(timer_config[action_key]) -> timer_config[action_key]
      true -> timer_config["base_time"] || 20
    end
  end

  @doc """
  Reset bonus timers based on timer strategy
  """
  def reset_bonus_timer_if_needed(session, team, current_action) do
    timer_config = session.timer_config || %{}
    
    case timer_config["timer_strategy"] do
      "per pick" ->
        # Reset bonus time for the team that just made a pick/ban
        reset_team_bonus_time(session, team)
        
      "per round" ->
        # Reset bonus time when entering a new round (ban -> pick or pick -> ban)
        if should_reset_for_round_change?(session, current_action) do
          reset_both_teams_bonus_time(session)
        else
          session
        end
        
      _ ->
        # No reset strategy
        session
    end
  end
  
  @doc """
  Reset bonus time for a specific team
  """
  def reset_team_bonus_time(session, team) do
    bonus_time = session.timer_config["bonus_time_per_team"] || 10
    timer_config = session.timer_config || %{}
    
    case team do
      "team1" -> 
        updated_config = Map.put(timer_config, "team1_extra_time", bonus_time)
        %{session | timer_config: updated_config}
      "team2" -> 
        updated_config = Map.put(timer_config, "team2_extra_time", bonus_time)
        %{session | timer_config: updated_config}
      _ -> session
    end
  end
  
  @doc """
  Reset bonus time for both teams
  """
  def reset_both_teams_bonus_time(session) do
    bonus_time = session.timer_config["bonus_time_per_team"] || 10
    timer_config = session.timer_config || %{}
    
    updated_config = timer_config
    |> Map.put("team1_extra_time", bonus_time)
    |> Map.put("team2_extra_time", bonus_time)
    
    %{session | timer_config: updated_config}
  end
  
  @doc """
  Check if we should reset timers due to round change
  """
  def should_reset_for_round_change?(session, current_action) do
    # Round changes when we transition between ban and pick phases
    total_actions = length(session.team1_bans || []) + length(session.team2_bans || []) + 
                   length(session.team1_picks || []) + length(session.team2_picks || [])
    
    # Ban phase: actions 1-8 (4 bans each team)
    # Pick phase: actions 9-12 (2 picks each team) 
    # Ban phase: actions 13-16 (2 more bans each team)
    # Pick phase: actions 17-28 (6 more picks each team)
    
    case total_actions do
      8 -> current_action == :pick  # Transition from ban to pick
      12 -> current_action == :ban  # Transition from pick to ban
      16 -> current_action == :pick # Transition from ban to pick (final)
      _ -> false
    end
  end

  @doc """
  Get the current main timer for a specific team
  """
  def get_team_main_timer(session, team) do
    timer_config = session.timer_config || %{}
    timer_key = "#{team}_timer"
    timer_started_key = "#{team}_timer_started_at"
    active_key = "#{team}_timer_active"
    
    IO.puts("DEBUG: get_team_main_timer for #{team}")
    IO.puts("DEBUG: timer_config keys: #{inspect(Map.keys(timer_config))}")
    IO.puts("DEBUG: #{active_key} = #{inspect(timer_config[active_key])}")
    IO.puts("DEBUG: #{timer_started_key} = #{inspect(timer_config[timer_started_key])}")
    IO.puts("DEBUG: #{timer_key} = #{inspect(timer_config[timer_key])}")
    
    if timer_config[active_key] && timer_config[timer_started_key] do
      started_at = case timer_config[timer_started_key] do
        %NaiveDateTime{} -> timer_config[timer_started_key]
        binary when is_binary(binary) ->
          case NaiveDateTime.from_iso8601(binary) do
            {:ok, dt} -> dt
            _ -> nil
          end
        _ -> nil
      end
      
      if started_at do
        now = NaiveDateTime.utc_now()
        elapsed = NaiveDateTime.diff(now, started_at, :second)
        timer_value = timer_config[timer_key] || 20
        remaining = max(0, timer_value - elapsed)
        
        IO.puts("DEBUG: Timer calculation - started_at: #{inspect(started_at)}, now: #{inspect(now)}, elapsed: #{elapsed}s, timer_value: #{timer_value}, remaining: #{remaining}")
        
        remaining
      else
        IO.puts("DEBUG: started_at is nil, returning default timer value")
        timer_config[timer_key] || 20
      end
    else
      # Timer not active, return configured value
      IO.puts("DEBUG: Timer not active or started_at not set, returning configured value")
      timer_config[timer_key] || 20
    end
  end
  
  @doc """
  Start a team's main timer
  """
  def start_team_timer(session, team) do
    now_string = NaiveDateTime.to_iso8601(NaiveDateTime.utc_now())
    base_time = session.timer_config["base_time"] || 20
    
    updated_config = session.timer_config
    |> Map.put("#{team}_timer", base_time)
    |> Map.put("#{team}_timer_started_at", now_string)
    |> Map.put("#{team}_timer_active", true)
    |> Map.put("#{team}_in_bonus", false)
    
    %{session | timer_config: updated_config}
  end
  
  @doc """
  Stop a team's timer
  """
  def stop_team_timer(session, team) do
    updated_config = session.timer_config
    |> Map.put("#{team}_timer_active", false)
    |> Map.put("#{team}_in_bonus", false)
    
    %{session | timer_config: updated_config}
  end
  
  @doc """
  Check if a team's main timer has expired
  """
  def team_timer_expired?(session, team) do
    get_team_main_timer(session, team) <= 0 && 
    session.timer_config["#{team}_timer_active"] == true
  end
  
  @doc """
  Start bonus timer for a team
  """
  def start_team_bonus_timer(session, team) do
    bonus_time = session.timer_config["#{team}_bonus_time"] || 0
    
    if bonus_time > 0 do
      now_string = NaiveDateTime.to_iso8601(NaiveDateTime.utc_now())
      
      updated_config = session.timer_config
      |> Map.put("#{team}_in_bonus", true)
      |> Map.put("#{team}_bonus_started_at", now_string)
      |> Map.put("#{team}_timer_active", false)  # Stop main timer
      
      %{session | timer_config: updated_config}
    else
      session
    end
  end
  
  @doc """
  Get remaining bonus time for a team
  """
  def get_team_bonus_timer_remaining(session, team) do
    timer_config = session.timer_config || %{}
    
    if timer_config["#{team}_in_bonus"] do
      bonus_started_raw = timer_config["#{team}_bonus_started_at"]
      bonus_time = timer_config["#{team}_bonus_time"] || 0
      
      if bonus_started_raw do
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
    else
      nil
    end
  end
  
  @doc """
  Determine the current round based on draft progress
  """
  def get_current_round(session) do
    total_bans = length(session.team1_bans || []) + length(session.team2_bans || [])
    total_picks = length(session.team1_picks || []) + length(session.team2_picks || [])
    total_expected_bans = get_total_expected_bans(session)
    
    cond do
      total_bans < 4 -> "ban_phase_1"                    # First 4 bans
      total_picks < 6 -> "pick_phase_1"                  # First 6 picks  
      total_bans < total_expected_bans -> "ban_phase_2"  # Remaining bans (dynamic)
      true -> "pick_phase_2"                             # Final picks
    end
  end
  
  @doc """
  Check if we should reset timers based on timer strategy
  """
  def should_reset_team_timer?(session, team, action) do
    strategy = session.timer_config["timer_strategy"] || "per pick"
    
    case strategy do
      "per pick" -> 
        # Reset after every action
        true
        
      "per round" ->
        # Only reset when round changes
        current_round = get_current_round(session)
        config_round = session.timer_config["current_round"] || "ban_phase_1"
        current_round != config_round
        
      _ -> 
        # Default to per pick
        true
    end
  end

  defp other_team("team1"), do: "team2"
  defp other_team("team2"), do: "team1"
  defp other_team(_), do: nil
end