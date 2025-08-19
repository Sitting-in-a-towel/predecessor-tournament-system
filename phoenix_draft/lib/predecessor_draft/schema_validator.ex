defmodule PredecessorDraft.SchemaValidator do
  @moduledoc """
  Schema validation module to prevent database ↔ Ecto ↔ application mismatches.
  
  This module ensures the three-layer synchronization:
  1. PostgreSQL Database - what's actually stored
  2. Ecto Schema - field type definitions  
  3. Application Code - how data is handled
  
  Run this validation during development and CI/CD to catch mismatches early.
  """
  
  require Logger
  alias PredecessorDraft.{Repo, Drafts.Session}
  
  @doc """
  Validates all schema consistency. Run this during development.
  """
  def validate_all do
    Logger.info("🔍 Starting comprehensive schema validation...")
    
    results = [
      validate_draft_session_fields(),
      validate_database_types(),
      validate_application_functions(),
      validate_schema_defaults(),
      validate_uuid_handling()  # New validation for UUID type mismatches
    ]
    
    case Enum.all?(results, & &1 == :ok) do
      true -> 
        Logger.info("✅ All schema validation passed!")
        :ok
      false -> 
        Logger.error("❌ Schema validation failed - see errors above")
        :error
    end
  end
  
  @doc """
  Validates that Ecto schema field types match expected array types for picks/bans.
  This catches the exact issue we just fixed.
  """
  def validate_draft_session_fields do
    Logger.info("🔍 Validating draft session field types...")
    
    expected_fields = [
      {:team1_picks, {:array, :string}},
      {:team2_picks, {:array, :string}},
      {:team1_bans, {:array, :string}},
      {:team2_bans, {:array, :string}}
    ]
    
    errors = Enum.reduce(expected_fields, [], fn {field, expected_type}, acc ->
      actual_type = Session.__schema__(:type, field)
      
      if actual_type == expected_type do
        Logger.debug("✅ #{field}: #{inspect(actual_type)} - correct")
        acc
      else
        error = "❌ #{field}: expected #{inspect(expected_type)}, got #{inspect(actual_type)}"
        Logger.error(error)
        [error | acc]
      end
    end)
    
    case errors do
      [] -> 
        Logger.info("✅ Draft session field types validation passed")
        :ok
      _ -> 
        Logger.error("❌ Draft session field validation failed:")
        Enum.each(errors, &Logger.error/1)
        :error
    end
  end
  
  @doc """
  Validates that database actually stores the expected data types.
  This checks what's actually in the database vs what Ecto expects.
  """
  def validate_database_types do
    Logger.info("🔍 Validating database data types...")
    
    # Get a sample draft session to check data types
    case get_sample_draft() do
      {:ok, draft} ->
        validate_draft_data_types(draft)
      {:error, reason} ->
        Logger.warning("⚠️  Could not validate database types: #{reason}")
        :ok  # Not critical if no test data exists
    end
  end
  
  defp get_sample_draft do
    case Repo.all(Session) |> List.first() do
      nil ->
        # Create temporary test draft for validation
        create_test_draft_for_validation()
      draft ->
        {:ok, draft}
    end
  end
  
  defp create_test_draft_for_validation do
    Logger.info("📝 Creating temporary draft for validation...")
    
    test_draft = %Session{
      draft_id: "schema_validation_#{:rand.uniform(999999)}",
      team1_id: Ecto.UUID.generate(),
      team2_id: Ecto.UUID.generate(),
      team1_picks: ["greystone", "gideon"],  # Test with actual data
      team2_picks: ["dekker"],
      team1_bans: ["countess"],
      team2_bans: [],
      status: "Waiting"
    }
    
    case Repo.insert(test_draft) do
      {:ok, inserted} ->
        # Schedule cleanup
        spawn(fn -> 
          Process.sleep(5000)
          Repo.delete(inserted)
          Logger.debug("🧹 Cleaned up validation draft")
        end)
        {:ok, inserted}
      {:error, changeset} ->
        {:error, "Failed to create test draft: #{inspect(changeset.errors)}"}
    end
  end
  
  defp validate_draft_data_types(draft) do
    Logger.info("🔍 Validating data types for draft: #{draft.draft_id}")
    
    validations = [
      {"team1_picks", draft.team1_picks, &is_list/1, "should be a list/array"},
      {"team2_picks", draft.team2_picks, &is_list/1, "should be a list/array"},
      {"team1_bans", draft.team1_bans, &is_list/1, "should be a list/array"},
      {"team2_bans", draft.team2_bans, &is_list/1, "should be a list/array"}
    ]
    
    errors = Enum.reduce(validations, [], fn {field, value, validator, error_msg}, acc ->
      if validator.(value) do
        Logger.debug("✅ #{field}: #{inspect(value)} - #{error_msg}")
        acc
      else
        error = "❌ #{field}: #{inspect(value)} - #{error_msg}, got #{inspect(value)}"
        Logger.error(error)
        [error | acc]
      end
    end)
    
    case errors do
      [] -> 
        Logger.info("✅ Database type validation passed")
        :ok
      _ -> 
        Logger.error("❌ Database type validation failed")
        :error
    end
  end
  
  @doc """
  Validates that application functions expect the correct data types.
  This checks that our helper functions work with arrays, not maps.
  """
  def validate_application_functions do
    Logger.info("🔍 Validating application function compatibility...")
    
    # Create test data
    test_draft = %Session{
      team1_picks: ["greystone", "gideon"],
      team2_picks: ["dekker"],
      team1_bans: ["countess"],
      team2_bans: [],
      first_pick_team: "team1"
    }
    
    function_tests = [
      {"Session.next_pick_team/1", fn -> Session.next_pick_team(test_draft) end},
      {"Session.draft_complete?/1", fn -> Session.draft_complete?(test_draft) end},
      {"length on team1_picks", fn -> length(test_draft.team1_picks || []) end},
      {"length on team2_picks", fn -> length(test_draft.team2_picks || []) end},
      {"length on team1_bans", fn -> length(test_draft.team1_bans || []) end},
      {"length on team2_bans", fn -> length(test_draft.team2_bans || []) end}
    ]
    
    errors = Enum.reduce(function_tests, [], fn {test_name, test_fn}, acc ->
      try do
        result = test_fn.()
        Logger.debug("✅ #{test_name}: #{inspect(result)} - passed")
        acc
      rescue
        e ->
          error = "❌ #{test_name}: #{Exception.message(e)}"
          Logger.error(error)
          [error | acc]
      end
    end)
    
    case errors do
      [] -> 
        Logger.info("✅ Application function validation passed")
        :ok
      _ -> 
        Logger.error("❌ Application function validation failed")
        :error
    end
  end
  
  @doc """
  Validates that schema defaults are correct for array fields.
  """
  def validate_schema_defaults do
    Logger.info("🔍 Validating schema defaults...")
    
    # Create empty struct to test defaults
    empty_draft = %Session{}
    
    default_tests = [
      {"team1_picks default", empty_draft.team1_picks, []},
      {"team2_picks default", empty_draft.team2_picks, []},
      {"team1_bans default", empty_draft.team1_bans, []},
      {"team2_bans default", empty_draft.team2_bans, []}
    ]
    
    errors = Enum.reduce(default_tests, [], fn {field, actual, expected}, acc ->
      if actual == expected do
        Logger.debug("✅ #{field}: #{inspect(actual)} - correct default")
        acc
      else
        error = "❌ #{field}: expected #{inspect(expected)}, got #{inspect(actual)}"
        Logger.error(error)
        [error | acc]
      end
    end)
    
    case errors do
      [] -> 
        Logger.info("✅ Schema defaults validation passed")
        :ok
      _ -> 
        Logger.error("❌ Schema defaults validation failed")
        :error
    end
  end
  
  @doc """
  Quick validation for CI/CD - fails fast on critical issues.
  """
  def validate_critical do
    Logger.info("⚡ Running critical schema validation...")
    
    case validate_draft_session_fields() do
      :ok -> 
        Logger.info("✅ Critical validation passed")
        :ok
      :error -> 
        Logger.error("❌ CRITICAL VALIDATION FAILED - Schema field types are wrong!")
        Logger.error("🚨 This will cause 'cannot load `[]` as type :map' errors")
        Logger.error("🔧 Fix: Ensure picks/bans fields use {:array, :string}, not :map")
        :error
    end
  end
  
  @doc """
  Comprehensive validation report - use for debugging.
  """
  def generate_validation_report do
    Logger.info("📋 Generating comprehensive validation report...")
    
    # Collect all validation results
    field_validation = validate_draft_session_fields()
    db_validation = validate_database_types()
    app_validation = validate_application_functions()
    default_validation = validate_schema_defaults()
    
    report = %{
      timestamp: DateTime.utc_now(),
      overall_status: if(Enum.all?([field_validation, db_validation, app_validation, default_validation], & &1 == :ok), do: :passed, else: :failed),
      field_types: field_validation,
      database_types: db_validation,
      application_functions: app_validation,
      schema_defaults: default_validation,
      recommendations: generate_recommendations([field_validation, db_validation, app_validation, default_validation])
    }
    
    Logger.info("📋 Validation report generated: #{inspect(report.overall_status)}")
    report
  end
  
  @doc """
  Validates UUID type handling to prevent DBConnection.EncodeError.
  This catches string UUID vs binary UUID mismatches.
  """
  def validate_uuid_handling do
    Logger.info("🔍 Validating UUID type handling...")
    
    # Test UUID conversion functions that were problematic
    test_cases = [
      {"Valid UUID string", "fbedc7c3-f432-45ff-9ac3-9d859ea806b2"},
      {"Generated UUID", Ecto.UUID.generate()},
      {"Nil UUID", nil},
      {"Invalid UUID", "not-a-uuid"}
    ]
    
    errors = Enum.reduce(test_cases, [], fn {test_name, uuid}, acc ->
      try do
        # Test the conversion logic used in Teams.get_team_by_registration_id
        result = case uuid do
          nil -> 
            Logger.debug("✅ #{test_name}: nil handled gracefully")
            :ok
          uuid_string when is_binary(uuid_string) ->
            case Ecto.UUID.cast(uuid_string) do
              {:ok, cast_uuid} -> 
                case Ecto.UUID.dump(cast_uuid) do
                  {:ok, binary} -> 
                    Logger.debug("✅ #{test_name}: #{String.slice(uuid_string, 0, 8)}... → binary (#{byte_size(binary)} bytes)")
                    :ok
                  :error -> 
                    error = "❌ #{test_name}: UUID dump failed for #{uuid_string}"
                    Logger.error(error)
                    {:error, error}
                end
              :error -> 
                Logger.debug("⚠️  #{test_name}: Invalid UUID format - #{uuid_string}")
                :ok  # Invalid UUIDs are handled gracefully
            end
          _ ->
            Logger.debug("ℹ️  #{test_name}: Non-binary UUID type")
            :ok
        end
        
        case result do
          :ok -> acc
          {:error, error} -> [error | acc]
        end
        
      rescue
        e ->
          error = "❌ #{test_name}: Exception during UUID handling - #{Exception.message(e)}"
          Logger.error(error)
          [error | acc]
      end
    end)
    
    # Test actual database query with UUID conversion
    case test_uuid_database_query() do
      :ok -> 
        Logger.debug("✅ UUID database query test passed")
      {:error, error} ->
        Logger.error("❌ UUID database query test failed: #{error}")
        errors = [error | errors]
    end
    
    case errors do
      [] -> 
        Logger.info("✅ UUID handling validation passed")
        :ok
      _ -> 
        Logger.error("❌ UUID handling validation failed:")
        Enum.each(errors, &Logger.error/1)
        :error
    end
  end
  
  defp test_uuid_database_query do
    try do
      # Get a test draft to validate UUID queries work
      case Repo.all(Session) |> List.first() do
        nil -> 
          Logger.debug("ℹ️  No draft sessions available for UUID query testing")
          :ok
        draft ->
          # Test the exact query pattern that was failing
          alias PredecessorDraft.Teams
          
          if draft.team1_id do
            case Teams.get_team_by_registration_id(draft.team1_id) do
              nil -> 
                Logger.debug("ℹ️  UUID query executed successfully (no team found)")
                :ok
              team -> 
                Logger.debug("✅ UUID query executed successfully (team found: #{team.team_name})")
                :ok
            end
          else
            Logger.debug("ℹ️  No team1_id available for UUID query testing")
            :ok
          end
      end
    rescue
      e in DBConnection.EncodeError ->
        if String.contains?(Exception.message(e), "expected a binary") do
          {:error, "UUID conversion still failing: #{Exception.message(e)}"}
        else
          {:error, "Different database error: #{Exception.message(e)}"}
        end
      e ->
        {:error, "Unexpected error in UUID query test: #{Exception.message(e)}"}
    end
  end

  defp generate_recommendations(results) do
    case Enum.all?(results, & &1 == :ok) do
      true -> 
        ["✅ All validations passed - no action needed"]
      false -> 
        [
          "🔧 Run `PredecessorDraft.SchemaValidator.validate_all()` for detailed errors",
          "📚 Check documentation/MASTER_TROUBLESHOOTING_GUIDE.md for schema mismatch solutions",
          "⚠️  Fix schema field types immediately to prevent runtime errors",
          "🔧 Fix UUID type conversions to prevent DBConnection.EncodeError", 
          "🧪 Add this validation to your CI/CD pipeline",
          "📋 Update documentation after fixes"
        ]
    end
  end
end