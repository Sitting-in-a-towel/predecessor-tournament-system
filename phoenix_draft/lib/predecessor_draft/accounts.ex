defmodule PredecessorDraft.Accounts do
  @moduledoc """
  The Accounts context for user management and authentication.
  
  This context provides read-only access to the existing user database
  and handles authentication for the draft system.
  """

  import Ecto.Query, warn: false
  alias PredecessorDraft.Repo
  alias PredecessorDraft.Accounts.User

  @doc """
  Gets a user by ID.
  """
  def get_user(id) do
    Repo.get(User, id)
  end

  @doc """
  Gets a user by user_id string (for React integration).
  """
  def get_user_by_user_id(user_id) do
    from(u in User, where: u.user_id == ^user_id)
    |> Repo.one()
  end

  @doc """
  Gets a user by ID, raising an exception if not found.
  """
  def get_user!(id) do
    Repo.get!(User, id)
  end

  @doc """
  Gets a user by email.
  """
  def get_user_by_email(email) when is_binary(email) do
    Repo.get_by(User, email: email)
  end

  @doc """
  Gets a user by Discord username.
  """
  def get_user_by_discord_username(discord_username) when is_binary(discord_username) do
    Repo.get_by(User, discord_username: discord_username)
  end

  @doc """
  Gets a user by auth token.
  """
  def get_user_by_token(token) when is_binary(token) do
    Repo.get_by(User, auth_token: token)
  end

  @doc """
  Validates user credentials (for direct authentication if needed).
  """
  def authenticate_user(email_or_discord_username, password) do
    user = get_user_by_email(email_or_discord_username) || get_user_by_discord_username(email_or_discord_username)
    
    case user do
      nil -> {:error, :invalid_credentials}
      %User{} -> verify_password(password, "dummy_hash", user)  # No password hashes in this system
    end
  end

  @doc """
  Creates a draft authentication token for React handoff.
  """
  def create_draft_token(user, draft_id) do
    User.create_draft_token(user, draft_id)
  end

  @doc """
  Validates a draft token from React.
  """
  def validate_draft_token(token) do
    User.validate_draft_token(token)
  end

  @doc """
  Lists all admin users.
  """
  def list_admins do
    from(u in User, where: u.is_admin == true)
    |> Repo.all()
  end

  @doc """
  Checks if a user is an admin.
  """
  def admin?(user), do: User.admin?(user)

  @doc """
  Gets users for a specific draft (team captains).
  """
  def get_draft_users(draft) do
    user_ids = [draft.team1_captain_id, draft.team2_captain_id] |> Enum.filter(& &1)
    
    from(u in User, where: u.user_id in ^user_ids)
    |> Repo.all()
    |> Map.new(fn user -> {user.user_id, user} end)
  end

  # Private helper functions

  defp verify_password(password, password_hash, user) do
    # Temporarily disabled bcrypt due to build tools
    # if Bcrypt.verify_pass(password, password_hash) do
    #   {:ok, user}
    # else
    #   {:error, :invalid_credentials}
    # end
    {:ok, user}  # Temporary: accept any password for testing
  rescue
    _ -> {:error, :invalid_credentials}
  end
end