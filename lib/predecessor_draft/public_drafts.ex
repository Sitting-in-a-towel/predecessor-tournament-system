defmodule PredecessorDraft.PublicDrafts do
  @moduledoc """
  Context for managing public drafts - standalone draft system without authentication.
  """
  
  import Ecto.Query, warn: false
  alias PredecessorDraft.Repo
  alias PredecessorDraft.PublicDrafts.PublicDraft
  alias PredecessorDraft.Drafts
  
  @doc """
  Creates a new public draft.
  """
  def create_public_draft(attrs \\ %{}) do
    PublicDraft.create_changeset(attrs)
    |> Repo.insert()
  end
  
  @doc """
  Gets a public draft by draft code.
  """
  def get_by_draft_code(draft_code) do
    Repo.get_by(PublicDraft, draft_code: draft_code)
  end
  
  @doc """
  Gets a public draft by any token (captain1, captain2, or spectator).
  """
  def get_by_token(token) do
    query = from p in PublicDraft,
      where: p.captain1_token == ^token or 
             p.captain2_token == ^token or 
             p.spectator_token == ^token
    
    Repo.one(query)
  end
  
  @doc """
  Determines the role (captain1, captain2, spectator) based on token.
  """
  def get_role_from_token(public_draft, token) do
    cond do
      public_draft.captain1_token == token -> :captain1
      public_draft.captain2_token == token -> :captain2
      public_draft.spectator_token == token -> :spectator
      true -> :invalid
    end
  end
  
  @doc """
  Claims a captain spot for a public draft.
  """
  def claim_captain_spot(public_draft, role) when role in [:captain1, :captain2] do
    field_name = if role == :captain1, do: :captain1_claimed, else: :captain2_claimed
    
    # Check if spot is already claimed
    if Map.get(public_draft, field_name) do
      {:error, :already_claimed}
    else
      attrs = %{field_name => true, last_activity: DateTime.utc_now()}
      
      public_draft
      |> PublicDraft.changeset(attrs)
      |> Repo.update()
    end
  end
  
  @doc """
  Starts the actual draft session when both captains are ready.
  """
  def start_draft_session(public_draft) do
    if both_captains_claimed?(public_draft) do
      # Create a regular draft session
      draft_attrs = %{
        "team1_name" => public_draft.team1_name,
        "team2_name" => public_draft.team2_name,
        "is_public" => true,
        "public_draft_id" => public_draft.id
      }
      
      case Drafts.create_session(draft_attrs) do
        {:ok, draft_session} ->
          # Link the public draft to the actual draft session
          public_draft
          |> PublicDraft.changeset(%{
            draft_session_id: draft_session.id,
            status: "active",
            last_activity: DateTime.utc_now()
          })
          |> Repo.update()
          
          {:ok, draft_session}
          
        error ->
          error
      end
    else
      {:error, :waiting_for_captains}
    end
  end
  
  @doc """
  Updates the last activity timestamp.
  """
  def update_activity(public_draft) do
    public_draft
    |> PublicDraft.changeset(%{last_activity: DateTime.utc_now()})
    |> Repo.update()
  end
  
  @doc """
  Checks if both captain spots are claimed.
  """
  def both_captains_claimed?(public_draft) do
    public_draft.captain1_claimed && public_draft.captain2_claimed
  end
  
  @doc """
  Marks a public draft as completed.
  """
  def complete_draft(public_draft) do
    public_draft
    |> PublicDraft.changeset(%{
      status: "completed",
      last_activity: DateTime.utc_now()
    })
    |> Repo.update()
  end
  
  @doc """
  Cleans up expired public drafts.
  """
  def cleanup_expired_drafts do
    now = DateTime.utc_now()
    
    # Delete drafts that are expired OR completed more than 30 minutes ago
    query = from p in PublicDraft,
      where: p.expires_at < ^now or 
             (p.status == "completed" and p.last_activity < ^DateTime.add(now, -30 * 60, :second))
    
    {count, _} = Repo.delete_all(query)
    {:ok, count}
  end
  
  @doc """
  Gets active public drafts (for admin/debugging).
  """
  def list_active_drafts do
    query = from p in PublicDraft,
      where: p.status in ["waiting", "active"],
      order_by: [desc: p.inserted_at]
    
    Repo.all(query)
  end
end