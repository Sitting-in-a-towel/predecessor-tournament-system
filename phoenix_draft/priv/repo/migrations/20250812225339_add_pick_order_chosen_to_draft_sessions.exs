defmodule PredecessorDraft.Repo.Migrations.AddPickOrderChosenToDraftSessions do
  use Ecto.Migration

  def change do
    alter table(:draft_sessions) do
      add :pick_order_chosen, :boolean, default: false, null: false
    end
  end
end
