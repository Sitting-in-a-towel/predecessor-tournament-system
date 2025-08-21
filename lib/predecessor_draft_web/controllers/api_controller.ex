defmodule PredecessorDraftWeb.APIController do
  use PredecessorDraftWeb, :controller
  
  def skip_ban(conn, %{"draft_id" => draft_id, "team" => team}) do
    case PredecessorDraft.Drafts.get_session_by_draft_id(draft_id) do
      nil ->
        conn
        |> put_status(404)
        |> json(%{error: "Draft not found"})
        
      draft ->
        case PredecessorDraft.Drafts.skip_current_turn(draft, team) do
          {:ok, _updated_draft} ->
            conn
            |> json(%{success: true})
            
          {:error, message} ->
            conn
            |> put_status(400)
            |> json(%{error: message})
        end
    end
  end
end