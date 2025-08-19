# Test script to verify NaiveDateTime serialization/deserialization
# Run with: elixir test-naive-datetime.exs

# Test the bonus timer calculation logic
defmodule TimerTest do
  def test_bonus_timer_calculation do
    # Simulate what happens when we store and retrieve from JSON
    now = NaiveDateTime.utc_now()
    now_string = NaiveDateTime.to_iso8601(now)
    
    # Simulate timer config as it would be stored/retrieved from JSON
    timer_config = %{
      "in_bonus_time" => true,
      "bonus_time_started_at" => now_string,  # This is how it comes back from JSON
      "bonus_time_duration" => 10,
      "bonus_time_team" => "team1"
    }
    
    # Simulate the calculation logic
    bonus_started_raw = timer_config["bonus_time_started_at"]
    bonus_duration = timer_config["bonus_time_duration"]
    
    bonus_started = case bonus_started_raw do
      %NaiveDateTime{} -> bonus_started_raw
      binary when is_binary(binary) ->
        case NaiveDateTime.from_iso8601(binary) do
          {:ok, dt} -> dt
          {:error, _} -> nil
        end
      _ -> nil
    end
    
    if bonus_started do
      elapsed = NaiveDateTime.diff(NaiveDateTime.utc_now(), bonus_started, :second)
      remaining = max(0, bonus_duration - elapsed)
      
      IO.puts("✅ Bonus timer calculation working!")
      IO.puts("Started at: #{bonus_started}")
      IO.puts("Elapsed: #{elapsed} seconds")
      IO.puts("Remaining: #{remaining} seconds")
      
      remaining
    else
      IO.puts("❌ Failed to parse bonus_started time")
      0
    end
  end
end

# Run the test
TimerTest.test_bonus_timer_calculation()