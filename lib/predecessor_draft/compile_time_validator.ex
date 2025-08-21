defmodule PredecessorDraft.CompileTimeValidator do
  @moduledoc """
  Compile-time validation to catch schema mismatches during build.
  
  This module runs validation during compilation, ensuring that any
  schema mismatches are caught before deployment.
  
  Add this to mix.exs compilers to run automatically:
  def project do
    [
      # ...
      compilers: [:schema_validator] ++ Mix.compilers(),
      # ...
    ]
  end
  """
  
  @doc """
  Validates schema at compile time.
  This will cause compilation to fail if schema is misconfigured.
  """
  def validate! do
    alias PredecessorDraft.Drafts.Session
    
    # Critical field type validations for picks/bans arrays
    critical_fields = [
      {:team1_picks, {:array, :string}},
      {:team2_picks, {:array, :string}},
      {:team1_bans, {:array, :string}},
      {:team2_bans, {:array, :string}}
    ]
    
    Enum.each(critical_fields, fn {field, expected_type} ->
      actual_type = Session.__schema__(:type, field)
      
      unless actual_type == expected_type do
        raise CompileError,
          description: """
          ❌ SCHEMA MISMATCH DETECTED - COMPILATION STOPPED
          
          Field: #{inspect(field)}
          Expected: #{inspect(expected_type)}
          Actual:   #{inspect(actual_type)}
          
          🚨 This will cause runtime errors: "cannot load `[]` as type :map"
          
          🔧 FIX: In lib/predecessor_draft/drafts/session.ex, change:
          
          ❌ field :#{field}, :map
          ✅ field :#{field}, {:array, :string}, default: []
          
          📚 See documentation/MASTER_TROUBLESHOOTING_GUIDE.md for details.
          """
      end
    end)
    
    # Validate default values for arrays
    test_struct = %Session{}
    
    Enum.each(critical_fields, fn {field, _type} ->
      default_value = Map.get(test_struct, field)
      
      unless is_list(default_value) do
        raise CompileError,
          description: """
          ❌ SCHEMA DEFAULT MISMATCH - COMPILATION STOPPED
          
          Field: #{inspect(field)}
          Expected default: []
          Actual default:   #{inspect(default_value)}
          
          🔧 FIX: Add default: [] to the field definition:
          field :#{field}, {:array, :string}, default: []
          """
      end
    end)
    
    # Note: UUID validation is done at runtime in SchemaValidator
    # to avoid compile-time dependencies on Teams module
    
    :ok
  end
end