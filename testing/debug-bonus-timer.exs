# Debug script to directly trigger bonus timer and test calculation
# Run with: elixir debug-bonus-timer.exs

# Get the existing draft
draft_id = "test_draft_playwright"
session = PredecessorDraft.Drafts.get_session_by_draft_id(draft_id)

if session do
  # Set up draft to Ban Phase with main timer expired and bonus timer active
  now = NaiveDateTime.utc_now()
  timer_started = NaiveDateTime.add(now, -35, :second)  # Started 35 seconds ago
  bonus_started_string = NaiveDateTime.to_iso8601(now)   # Bonus started now
  
  IO.puts("Setting up draft for bonus timer test...")
  IO.puts("Current time: #{now}")
  IO.puts("Main timer started: #{timer_started} (35 seconds ago)")
  IO.puts("Bonus timer started: #{bonus_started_string}")
  
  # Update the draft to be in Ban Phase with expired main timer and active bonus
  attrs = %{
    "status" => "In Progress",
    "current_phase" => "Ban Phase",
    "current_turn" => "team1",
    "first_pick_team" => "team1",
    "team1_connected" => true,
    "team2_connected" => true,
    "current_timer_started_at" => timer_started,
    "current_timer_duration" => 30,
    "current_timer_extra_time" => 0,
    "timer_expired" => false,  # Not marked as expired yet - should trigger bonus
    "timer_config" => %{
      "base_time" => 30,
      "bonus_time_per_team" => 10,
      "team1_extra_time" => 10,
      "team2_extra_time" => 10,
      "timer_strategy" => "per pick",
      "timer_strategy_enabled" => true,
      "in_bonus_time" => true,
      "bonus_time_started_at" => bonus_started_string,
      "bonus_time_duration" => 10,
      "bonus_time_team" => "team1"
    }
  }
  
  # Apply the update
  case PredecessorDraft.Drafts.Session.picks_changeset(session, attrs) |> PredecessorDraft.Repo.update() do
    {:ok, updated_session} ->
      IO.puts("✅ Draft updated successfully!")
      
      # Test timer calculations
      main_remaining = PredecessorDraft.Drafts.Session.get_timer_remaining(updated_session)
      bonus_remaining = PredecessorDraft.Drafts.Session.get_bonus_timer_remaining(updated_session, "team1")
      
      IO.puts("Main timer remaining: #{main_remaining || "nil"}")
      IO.puts("Bonus timer remaining: #{bonus_remaining || "nil"}")
      
      # Start timer tick to see debug output
      IO.puts("\nStarting timer tick to see debug output...")
      PredecessorDraft.Drafts.start_timer_tick(draft_id)
      
      # Wait to see debug output
      Process.sleep(3000)
      
    {:error, changeset} ->
      IO.puts("❌ Failed to update draft:")
      IO.inspect(changeset.errors)
  end
else
  IO.puts("❌ Draft not found: #{draft_id}")
end