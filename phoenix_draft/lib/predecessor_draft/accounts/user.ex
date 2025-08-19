defmodule PredecessorDraft.Accounts.User do
  @moduledoc """
  User schema for the existing PostgreSQL database.
  
  This schema maps to the existing 'users' table and provides
  read-only access for authentication and user information.
  """
  
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :string, autogenerate: false}
  @foreign_key_type :string

  schema "users" do
    field :user_id, :string
    field :discord_id, :string
    field :discord_username, :string
    field :discord_discriminator, :string
    field :email, :string
    field :avatar_url, :string
    field :is_admin, :boolean, default: false
    field :is_banned, :boolean, default: false
    field :omeda_player_id, :string
    field :omeda_profile_data, :map
    field :omeda_last_sync, :utc_datetime
    field :omeda_sync_enabled, :boolean, default: false
    field :last_active, :utc_datetime
    field :created_at, :utc_datetime
    field :updated_at, :utc_datetime

    # Virtual fields for draft system
    field :current_role, :string, virtual: true
    field :draft_permissions, :map, virtual: true

    # Relationships
    has_many :draft_sessions_as_team1_captain, PredecessorDraft.Drafts.Session, foreign_key: :team1_captain_id
    has_many :draft_sessions_as_team2_captain, PredecessorDraft.Drafts.Session, foreign_key: :team2_captain_id
  end

  @doc """
  Changeset for updating user information (read-only for most fields)
  """
  def changeset(user, attrs \\ %{}) do
    user
    |> cast(attrs, [:current_role, :draft_permissions])
    |> validate_inclusion(:current_role, ["team1", "team2", "spectator"])
  end

  @doc """
  Creates a draft token for authentication handoff from React
  """
  def create_draft_token(user, draft_id) do
    token = :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
    
    # In a full implementation, you'd store this token in the database
    # For now, we'll use a simple approach
    "#{user.user_id}_#{draft_id}_#{token}"  # Use string user_id instead of binary id
  end

  @doc """
  Validates a draft token from React authentication
  """
  def validate_draft_token(token) when is_binary(token) do
    # Token format: user_1234567890_abcdefghij_draft_1234567890_lmnopqrstu_tokenpart...
    # We need to find where "draft_" starts to properly split user_id from draft_id
    case Regex.run(~r/^(.+?)_(draft_.+?)_([^_]+)$/, token) do
      [_full_match, user_id, draft_id, _token_part] ->
        case PredecessorDraft.Repo.get_by(__MODULE__, user_id: user_id) do
          nil -> {:error, :invalid_token}
          user -> {:ok, user, draft_id}
        end
      _ ->
        {:error, :invalid_token_format}
    end
  end
  def validate_draft_token(_), do: {:error, :no_token}

  @doc """
  Check if user is admin
  """
  def admin?(user), do: user.is_admin == true

  @doc """
  Check if user can captain a specific team in a draft
  """
  def can_captain?(user, draft, captain_role) do
    cond do
      admin?(user) -> true  # Admins can represent any team
      captain_role == "team1" -> user.user_id == draft.team1_captain_id
      captain_role == "team2" -> user.user_id == draft.team2_captain_id
      true -> false
    end
  end

  @doc """
  Get user's display name
  """
  def display_name(user) do
    user.discord_username || user.email || "User #{String.slice(user.user_id || "", 0, 8)}"
  end
end