defmodule PredecessorDraft.Repo.Migrations.UpdateDraftPhases do
  use Ecto.Migration

  def change do
    # Drop the existing constraint
    execute """
    ALTER TABLE draft_sessions 
    DROP CONSTRAINT IF EXISTS draft_sessions_current_phase_check;
    """, ""

    # Add the new constraint with updated phases
    execute """
    ALTER TABLE draft_sessions 
    ADD CONSTRAINT draft_sessions_current_phase_check 
    CHECK (current_phase IN ('Coin Toss', 'Pick Order Selection', 'Ban Phase', 'Pick Phase', 'Complete'));
    """, """
    ALTER TABLE draft_sessions 
    DROP CONSTRAINT IF EXISTS draft_sessions_current_phase_check;
    """
  end
end
