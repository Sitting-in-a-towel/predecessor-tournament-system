# Simple test to verify schema fix works
# This tests if we can load draft sessions without the "cannot load `[]` as type :map" error

IO.puts("Testing Phoenix Draft Schema Fix...")

# Test loading a draft session from database
alias PredecessorDraft.{Repo, Drafts}

# Try to get any existing draft session to test schema loading
try do
  draft_session = Repo.all(Drafts.Session) |> List.first()
  
  if draft_session do
    IO.puts("✅ Successfully loaded draft session: #{draft_session.draft_id}")
    IO.puts("✅ team1_picks: #{inspect(draft_session.team1_picks)} (#{inspect(is_list(draft_session.team1_picks))})")
    IO.puts("✅ team2_picks: #{inspect(draft_session.team2_picks)} (#{inspect(is_list(draft_session.team2_picks))})")
    IO.puts("✅ team1_bans: #{inspect(draft_session.team1_bans)} (#{inspect(is_list(draft_session.team1_bans))})")
    IO.puts("✅ team2_bans: #{inspect(draft_session.team2_bans)} (#{inspect(is_list(draft_session.team2_bans))})")
    IO.puts("✅ SCHEMA FIX SUCCESSFUL - Arrays are loading correctly!")
  else
    # Create a test draft session to verify schema works
    IO.puts("No existing draft sessions found. Creating test session...")
    
    test_session = %Drafts.Session{
      draft_id: "test_schema_validation_#{:rand.uniform(1000)}",
      team1_id: Ecto.UUID.generate(),
      team2_id: Ecto.UUID.generate(),
      team1_picks: [],  # Test empty array
      team2_picks: [],  # Test empty array
      team1_bans: [],   # Test empty array
      team2_bans: [],   # Test empty array
      status: "Waiting"
    }
    
    case Repo.insert(test_session) do
      {:ok, inserted_session} ->
        IO.puts("✅ Successfully created test session: #{inserted_session.draft_id}")
        IO.puts("✅ team1_picks: #{inspect(inserted_session.team1_picks)} (#{inspect(is_list(inserted_session.team1_picks))})")
        IO.puts("✅ SCHEMA FIX SUCCESSFUL - Arrays are working correctly!")
        
        # Clean up test session
        Repo.delete(inserted_session)
        IO.puts("🧹 Test session cleaned up")
        
      {:error, changeset} ->
        IO.puts("❌ Error creating test session: #{inspect(changeset.errors)}")
    end
  end
  
rescue
  e in ArgumentError ->
    if String.contains?(Exception.message(e), "cannot load") and String.contains?(Exception.message(e), "as type :map") do
      IO.puts("❌ SCHEMA FIX FAILED - Still getting type casting error:")
      IO.puts("❌ #{Exception.message(e)}")
      IO.puts("❌ The schema fields are still configured as :map instead of {:array, :string}")
    else
      IO.puts("❌ Different error occurred: #{Exception.message(e)}")
    end
    
  e ->
    IO.puts("❌ Unexpected error: #{inspect(e)}")
end

IO.puts("Schema fix verification complete.")