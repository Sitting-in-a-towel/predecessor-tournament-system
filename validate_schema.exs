# Development Schema Validation Script
# Run with: mix run validate_schema.exs

IO.puts("""
🔍 PHOENIX DRAFT SCHEMA VALIDATION
=====================================

This script validates that the Phoenix draft system schema is correctly
configured to prevent the "cannot load `[]` as type :map" error.

Running comprehensive validation...
""")

# Import validation modules
alias PredecessorDraft.SchemaValidator
alias PredecessorDraft.CompileTimeValidator

try do
  # 1. Compile-time validation (critical)
  IO.puts("1️⃣ Running compile-time validation...")
  CompileTimeValidator.validate!()
  IO.puts("   ✅ Compile-time validation passed\n")
  
  # 2. Comprehensive runtime validation  
  IO.puts("2️⃣ Running comprehensive schema validation...")
  case SchemaValidator.validate_all() do
    :ok -> 
      IO.puts("   ✅ All schema validation passed\n")
    :error -> 
      IO.puts("   ❌ Schema validation failed - check logs above\n")
      exit({:shutdown, 1})
  end
  
  # 3. Generate validation report
  IO.puts("3️⃣ Generating validation report...")
  report = SchemaValidator.generate_validation_report()
  
  IO.puts("""
  📋 VALIDATION REPORT
  ===================
  Status: #{report.overall_status}
  Timestamp: #{report.timestamp}
  
  Field Types: #{report.field_types}
  Database Types: #{report.database_types}  
  Application Functions: #{report.application_functions}
  Schema Defaults: #{report.schema_defaults}
  
  💡 RECOMMENDATIONS:
  """)
  
  Enum.each(report.recommendations, fn rec ->
    IO.puts("  #{rec}")
  end)
  
  case report.overall_status do
    :passed -> 
      IO.puts("""
      
      🎉 SUCCESS: Schema validation completely passed!
      
      ✅ No "cannot load `[]` as type :map" errors should occur
      ✅ All picks/bans fields are correctly configured as arrays
      ✅ Application functions work with array data
      ✅ Schema defaults are correct
      
      🛡️  PERMANENT PREVENTION: 
      - Run this script before deploying: mix run validate_schema.exs  
      - Add to CI/CD pipeline for automated validation
      - Check documentation/MASTER_TROUBLESHOOTING_GUIDE.md for details
      
      🚀 The Phoenix draft system is ready for use!
      """)
      exit(:normal)
      
    :failed ->
      IO.puts("""
      
      ❌ FAILURE: Schema validation found issues!
      
      🚨 These issues WILL cause "cannot load `[]` as type :map" errors
      🚨 Fix these before deploying to prevent system breakage
      
      📚 Check documentation/MASTER_TROUBLESHOOTING_GUIDE.md for solutions
      🔧 Most common fix: Change :map fields to {:array, :string} in schema
      
      ❌ The Phoenix draft system needs fixes before use!
      """)
      exit({:shutdown, 1})
  end
  
rescue
  error in CompileError ->
    IO.puts("""
    
    ❌ COMPILE-TIME VALIDATION FAILED
    ================================
    
    #{error.description}
    
    🚨 FIX REQUIRED: This error prevents the system from working correctly.
    📚 See documentation/MASTER_TROUBLESHOOTING_GUIDE.md for solutions.
    """)
    exit({:shutdown, 1})
    
  error ->
    IO.puts("""
    
    ❌ UNEXPECTED ERROR DURING VALIDATION
    ====================================
    
    #{inspect(error)}
    
    🔧 This might indicate a deeper issue with the schema or database.
    📋 Check the error details and consult troubleshooting documentation.
    """)
    exit({:shutdown, 1})
end