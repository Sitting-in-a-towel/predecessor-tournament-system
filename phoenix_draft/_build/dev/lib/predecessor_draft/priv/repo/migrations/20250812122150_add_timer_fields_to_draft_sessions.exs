defmodule PredecessorDraft.Repo.Migrations.AddTimerFieldsToDraftSessions do
  use Ecto.Migration

  def change do
    alter table(:draft_sessions) do
      add :current_timer_started_at, :utc_datetime
      add :current_timer_duration, :integer, default: 30
      add :current_timer_extra_time, :integer, default: 0
      add :timer_expired, :boolean, default: false
      add :timer_config, :map, default: %{
        "base_time" => 30,
        "extra_time" => 10,
        "ban_time" => 30,
        "pick_time" => 30,
        "enabled" => true
      }
    end
  end
end
