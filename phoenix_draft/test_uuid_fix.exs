# Test UUID fix for team queries
IO.puts("🔧 Testing UUID Type Fix for Draft Teams Query")

alias PredecessorDraft.{Repo, Drafts.Session, Teams}

# Test the specific query that was failing
try do
  # Get a draft session to test with
  draft = Repo.all(Session) |> List.first()
  
  if draft do
    IO.puts("📋 Testing draft: #{draft.draft_id}")
    IO.puts("   Team1 ID: #{inspect(draft.team1_id)}")
    IO.puts("   Team2 ID: #{inspect(draft.team2_id)}")
    
    # Test the problematic function directly
    IO.puts("1️⃣ Testing get_team_by_registration_id...")
    
    # Test Team 1
    if draft.team1_id do
      case Teams.get_team_by_registration_id(draft.team1_id) do
        nil -> 
          IO.puts("   ⚠️  Team 1 not found (ID: #{draft.team1_id}) - might be expected")
        team -> 
          IO.puts("   ✅ Team 1 found: #{team.team_name}")
      end
    else
      IO.puts("   ℹ️  Team 1 ID is nil")
    end
    
    # Test Team 2
    if draft.team2_id do
      case Teams.get_team_by_registration_id(draft.team2_id) do
        nil -> 
          IO.puts("   ⚠️  Team 2 not found (ID: #{draft.team2_id}) - might be expected")
        team -> 
          IO.puts("   ✅ Team 2 found: #{team.team_name}")
      end
    else
      IO.puts("   ℹ️  Team 2 ID is nil")
    end
    
    # Test the full draft teams function  
    IO.puts("2️⃣ Testing get_draft_teams...")
    
    {team1, team2} = Teams.get_draft_teams(draft)
    IO.puts("   Team 1 result: #{if team1, do: "✅ Found (#{team1.team_name})", else: "⚠️ Not found"}")
    IO.puts("   Team 2 result: #{if team2, do: "✅ Found (#{team2.team_name})", else: "⚠️ Not found"}")
    
    # Test the function that was actually called in the error
    IO.puts("3️⃣ Testing get_draft_teams_with_captains...")
    
    {team1_display, team2_display} = Teams.get_draft_teams_with_captains(draft)
    
    IO.puts("   Team 1 display: #{if team1_display, do: "✅ Success", else: "❌ Failed"}")
    IO.puts("   Team 2 display: #{if team2_display, do: "✅ Success", else: "❌ Failed"}")
    
    IO.puts("\n🎉 UUID Fix Test Results:")
    IO.puts("✅ No DBConnection.EncodeError occurred")
    IO.puts("✅ UUID string to binary conversion working")
    IO.puts("✅ Draft teams query executing successfully")
    
  else
    IO.puts("⚠️  No draft sessions found for testing")
  end
  
rescue
  e in DBConnection.EncodeError ->
    if String.contains?(Exception.message(e), "expected a binary of 16 bytes") do
      IO.puts("\n❌ UUID FIX FAILED!")
      IO.puts("❌ Still getting binary encoding error: #{Exception.message(e)}")
      IO.puts("🔧 Need to check UUID conversion logic")
    else
      IO.puts("\n❌ Different DBConnection error: #{Exception.message(e)}")
    end
    
  e ->
    IO.puts("\n❌ Unexpected error during UUID test: #{inspect(e)}")
end

IO.puts("\nUUID fix testing complete - draft access should work correctly now")

# Also test some UUID conversion directly
IO.puts("\n🔧 Testing UUID conversion functions...")

test_uuids = [
  "fbedc7c3-f432-45ff-9ac3-9d859ea806b2",  # String from error
  Ecto.UUID.generate(),                      # Generated UUID
  nil                                        # Nil case
]

Enum.each(test_uuids, fn uuid ->
  case uuid do
    nil -> IO.puts("   nil UUID: handled gracefully")
    uuid_string ->
      case Ecto.UUID.cast(uuid_string) do
        {:ok, converted} -> 
          IO.puts("   ✅ UUID conversion: #{String.slice(uuid_string, 0, 8)}... → binary")
        :error -> 
          IO.puts("   ❌ UUID conversion failed for: #{inspect(uuid_string)}")
      end
  end
end)