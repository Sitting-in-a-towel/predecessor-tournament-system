defmodule PredecessorDraftWeb.AuthController do
  use PredecessorDraftWeb, :controller

  alias PredecessorDraft.Accounts

  @doc """
  Creates a draft authentication token for React handoff.
  
  This endpoint is called by the React tournament system to generate
  a token that can be used to authenticate users in the Phoenix draft system.
  """
  def create_token(conn, %{"user_id" => user_id, "draft_id" => draft_id} = params) do
    captain = Map.get(params, "captain")
    
    case Accounts.get_user_by_user_id(user_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "User not found"})
      
      user ->
        token = Accounts.create_draft_token(user, draft_id)
        
        # Build URL with captain parameter if provided
        base_url = url(~p"/draft/#{draft_id}?token=#{token}")
        draft_url = if captain, do: "#{base_url}&captain=#{captain}", else: base_url
        
        json(conn, %{
          token: token,
          draft_url: draft_url,
          user: %{
            id: user.user_id,  # Use string user_id instead of binary id
            name: Accounts.User.display_name(user),
            is_admin: Accounts.User.admin?(user)
          }
        })
    end
  end

  @doc """
  Validates a draft token and creates a Phoenix session.
  
  This is used internally by the LiveView to establish authentication.
  """
  def validate_token(conn, %{"token" => token}) do
    case Accounts.validate_draft_token(token) do
      {:ok, user, draft_id} ->
        conn
        |> put_session(:user_id, user.user_id)
        |> put_session(:draft_id, draft_id)
        |> put_session(:is_admin, Accounts.User.admin?(user))
        |> json(%{
          valid: true,
          user: %{
            id: user.user_id,  # Use string user_id instead of binary id
            name: Accounts.User.display_name(user),
            is_admin: Accounts.User.admin?(user)
          },
          draft_id: draft_id
        })
      
      {:error, reason} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{
          valid: false,
          error: format_auth_error(reason)
        })
    end
  end

  # Private helper functions

  defp format_auth_error(:invalid_token), do: "Invalid or expired token"
  defp format_auth_error(:invalid_token_format), do: "Malformed token"
  defp format_auth_error(:no_token), do: "Token required"
  defp format_auth_error(_), do: "Authentication failed"
end