defmodule PredecessorDraftWeb.Presence do
  @moduledoc """
  Provides presence tracking to channels and processes.

  See the [`Phoenix.Presence`](https://hexdocs.pm/phoenix/Phoenix.Presence.html)
  docs for more details.
  """
  use Phoenix.Presence,
    otp_app: :predecessor_draft,
    pubsub_server: PredecessorDraft.PubSub

  @doc """
  Fetch presence information with enhanced user data
  """
  def fetch(_topic, presences) do
    for {key, %{metas: metas}} <- presences, into: %{} do
      user_info = get_user_info(hd(metas)[:user_id])
      {key, %{
        metas: metas,
        user: user_info
      }}
    end
  end

  @doc """
  Get user information from the database
  """
  defp get_user_info(user_id) when is_nil(user_id), do: %{id: nil, name: "Anonymous"}
  
  defp get_user_info(user_id) do
    case PredecessorDraft.Repo.get(PredecessorDraft.Accounts.User, user_id) do
      nil -> %{id: user_id, name: "Unknown User"}
      user -> %{id: user.id, name: user.username || "User #{user.id}"}
    end
  rescue
    _ -> %{id: user_id, name: "User #{user_id}"}
  end

  @doc """
  Check if both captains are present for a draft
  """
  def both_captains_present?(draft_id) do
    topic = "draft:#{draft_id}"
    presence_map = list(topic)
    
    team1_present = Map.has_key?(presence_map, "team1")
    team2_present = Map.has_key?(presence_map, "team2")
    
    team1_present && team2_present
  end

  @doc """
  Get the count of connected users for a draft
  """
  def connected_count(draft_id) do
    "draft:#{draft_id}"
    |> list()
    |> map_size()
  end

  @doc """
  Get list of connected users for a draft
  """
  def connected_users(draft_id) do
    "draft:#{draft_id}"
    |> list()
    |> Enum.map(fn {_key, %{user: user}} -> user end)
  end
end