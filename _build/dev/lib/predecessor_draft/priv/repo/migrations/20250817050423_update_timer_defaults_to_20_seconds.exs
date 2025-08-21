defmodule PredecessorDraft.Repo.Migrations.UpdateTimerDefaultsTo20Seconds do
  use Ecto.Migration

  def up do
    # Update column defaults from 30 seconds to 20 seconds
    alter table(:draft_sessions) do
      modify :current_timer_duration, :integer, default: 20
    end
    
    # Update existing timer_config defaults for existing records
    execute """
    UPDATE draft_sessions 
    SET timer_config = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(timer_config, '{}'::jsonb), 
            '{base_time}', '20'
          ), 
          '{ban_time}', '20'
        ), 
        '{pick_time}', '20'
      ),
      '{team1_timer}', '20'
    )
    WHERE timer_config->>'base_time' = '30' OR timer_config IS NULL
    """
    
    execute """
    UPDATE draft_sessions 
    SET timer_config = jsonb_set(timer_config, '{team2_timer}', '20')
    WHERE timer_config->>'team2_timer' = '30' OR timer_config->>'team2_timer' IS NULL
    """
    
    # Also update the current_timer_duration field for existing records
    execute """
    UPDATE draft_sessions 
    SET current_timer_duration = 20
    WHERE current_timer_duration = 30 OR current_timer_duration IS NULL
    """
  end

  def down do
    # Revert back to 30 seconds
    alter table(:draft_sessions) do
      modify :current_timer_duration, :integer, default: 30
    end
    
    # Revert timer_config defaults  
    execute """
    UPDATE draft_sessions 
    SET timer_config = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(timer_config, '{}'::jsonb), 
            '{base_time}', '30'
          ), 
          '{ban_time}', '30'
        ), 
        '{pick_time}', '30'
      ),
      '{team1_timer}', '30'
    )
    WHERE timer_config->>'base_time' = '20'
    """
    
    execute """
    UPDATE draft_sessions 
    SET timer_config = jsonb_set(timer_config, '{team2_timer}', '30')
    WHERE timer_config->>'team2_timer' = '20'
    """
  end
end
