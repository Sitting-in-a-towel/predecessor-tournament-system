defmodule PredecessorDraftWeb.PublicDraftController do
  use PredecessorDraftWeb, :controller
  
  alias PredecessorDraft.PublicDrafts
  
  @doc """
  Creates a new public draft and returns the shareable links.
  
  POST /api/public-drafts
  
  Body:
  {
    "format": "classic",
    "team1_name": "Team Blue",
    "team2_name": "Team Orange"
  }
  
  Response:
  {
    "draft_code": "draft_1755994521234_abc123",
    "links": {
      "captain1": "https://host/draft/draft_1755994521234_abc123?token=captain1_token&captain=1",
      "captain2": "https://host/draft/draft_1755994521234_abc123?token=captain2_token&captain=2",
      "spectator": "https://host/draft/draft_1755994521234_abc123/spectate?token=spectator_token"
    },
    "expires_at": "2023-12-01T12:00:00Z"
  }
  """
  def create(conn, params) do
    # Rate limiting - 1 draft per IP every 2 minutes
    client_ip = get_client_ip(conn)
    
    case check_rate_limit(client_ip) do
      :ok ->
        create_attrs = %{
          "format" => Map.get(params, "format", "classic"),
          "team1_name" => Map.get(params, "team1_name", "Team Blue"),
          "team2_name" => Map.get(params, "team2_name", "Team Orange")
        }
        
        case PublicDrafts.create_public_draft(create_attrs) do
          {:ok, public_draft} ->
            links = generate_shareable_links(conn, public_draft)
            
            conn
            |> put_status(:created)
            |> json(%{
              success: true,
              draft_code: public_draft.draft_code,
              links: links,
              expires_at: public_draft.expires_at,
              format: public_draft.format,
              team1_name: public_draft.team1_name,
              team2_name: public_draft.team2_name
            })
            
          {:error, changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{
              success: false,
              errors: format_errors(changeset)
            })
        end
        
      {:error, :rate_limited} ->
        conn
        |> put_status(:too_many_requests)
        |> json(%{
          success: false,
          error: "Rate limit exceeded. Please wait 2 minutes before creating another draft."
        })
    end
  end
  
  @doc """
  Gets public draft information by draft code.
  
  GET /api/public-drafts/:draft_code
  """
  def show(conn, %{"draft_code" => draft_code}) do
    case PublicDrafts.get_by_draft_code(draft_code) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{success: false, error: "Draft not found"})
        
      public_draft ->
        # Update activity
        PublicDrafts.update_activity(public_draft)
        
        conn
        |> json(%{
          success: true,
          draft_code: public_draft.draft_code,
          format: public_draft.format,
          team1_name: public_draft.team1_name,
          team2_name: public_draft.team2_name,
          captain1_claimed: public_draft.captain1_claimed,
          captain2_claimed: public_draft.captain2_claimed,
          status: public_draft.status,
          expires_at: public_draft.expires_at,
          both_ready: PublicDrafts.both_captains_claimed?(public_draft)
        })
    end
  end
  
  @doc """
  Claims a captain spot using a token.
  
  POST /api/public-drafts/:draft_code/claim
  Body: {"token": "captain1_token_here"}
  """
  def claim_captain(conn, %{"draft_code" => draft_code, "token" => token}) do
    case PublicDrafts.get_by_draft_code(draft_code) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{success: false, error: "Draft not found"})
        
      public_draft ->
        role = PublicDrafts.get_role_from_token(public_draft, token)
        
        case role do
          :captain1 ->
            claim_spot(conn, public_draft, :captain1)
            
          :captain2 ->
            claim_spot(conn, public_draft, :captain2)
            
          :spectator ->
            # Spectators don't need to claim, just return success
            conn
            |> json(%{
              success: true,
              role: "spectator",
              message: "Spectator access granted"
            })
            
          :invalid ->
            conn
            |> put_status(:unauthorized)
            |> json(%{success: false, error: "Invalid token"})
        end
    end
  end
  
  # Private functions
  
  defp claim_spot(conn, public_draft, role) do
    case PublicDrafts.claim_captain_spot(public_draft, role) do
      {:ok, updated_draft} ->
        # Check if both captains are now ready
        if PublicDrafts.both_captains_claimed?(updated_draft) do
          # Start the actual draft session
          case PublicDrafts.start_draft_session(updated_draft) do
            {:ok, draft_session} ->
              conn
              |> json(%{
                success: true,
                role: Atom.to_string(role),
                message: "Captain spot claimed! Draft starting...",
                draft_ready: true,
                draft_id: draft_session.draft_id
              })
              
            {:error, reason} ->
              conn
              |> put_status(:unprocessable_entity)
              |> json(%{
                success: false,
                error: "Failed to start draft: #{inspect(reason)}"
              })
          end
        else
          conn
          |> json(%{
            success: true,
            role: Atom.to_string(role),
            message: "Captain spot claimed! Waiting for other captain...",
            draft_ready: false
          })
        end
        
      {:error, :already_claimed} ->
        conn
        |> put_status(:conflict)
        |> json(%{
          success: false,
          error: "This captain spot is already taken. You can spectate instead."
        })
        
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{success: false, error: "Failed to claim spot: #{inspect(reason)}"})
    end
  end
  
  defp generate_shareable_links(conn, public_draft) do
    base_url = get_base_url(conn)
    
    %{
      captain1: "#{base_url}/draft/#{public_draft.draft_code}?token=#{public_draft.captain1_token}&captain=1",
      captain2: "#{base_url}/draft/#{public_draft.draft_code}?token=#{public_draft.captain2_token}&captain=2",
      spectator: "#{base_url}/draft/#{public_draft.draft_code}/spectate?token=#{public_draft.spectator_token}"
    }
  end
  
  defp get_base_url(conn) do
    scheme = if conn.scheme == :https, do: "https", else: "http"
    host = conn.host
    port = if conn.port in [80, 443], do: "", else: ":#{conn.port}"
    "#{scheme}://#{host}#{port}"
  end
  
  defp get_client_ip(conn) do
    # Get the real IP, considering proxies
    case get_req_header(conn, "x-forwarded-for") do
      [forwarded | _] ->
        forwarded |> String.split(",") |> List.first() |> String.trim()
      [] ->
        case get_req_header(conn, "x-real-ip") do
          [real_ip | _] -> real_ip
          [] -> to_string(:inet.ntoa(conn.remote_ip))
        end
    end
  end
  
  defp check_rate_limit(ip) do
    # Simple rate limiting - 1 draft per IP every 2 minutes
    table_name = :public_draft_rate_limit
    current_time = System.system_time(:second)
    rate_limit_window = 2 * 60  # 2 minutes
    
    # Ensure ETS table exists
    case :ets.whereis(table_name) do
      :undefined ->
        :ets.new(table_name, [:named_table, :public, :set])
      _ -> :ok
    end
    
    case :ets.lookup(table_name, ip) do
      [{^ip, last_request_time}] ->
        if current_time - last_request_time >= rate_limit_window do
          :ets.insert(table_name, {ip, current_time})
          :ok
        else
          {:error, :rate_limited}
        end
      [] ->
        :ets.insert(table_name, {ip, current_time})
        :ok
    end
  end
  
  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end