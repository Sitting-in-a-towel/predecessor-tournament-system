defmodule PredecessorDraft.Repo do
  use Ecto.Repo,
    otp_app: :predecessor_draft,
    adapter: Ecto.Adapters.Postgres
end