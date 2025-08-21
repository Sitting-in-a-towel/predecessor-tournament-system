defmodule PredecessorDraftWeb.AdminLive do
  @moduledoc """
  Admin panel for viewing and searching completed drafts
  """
  
  use PredecessorDraftWeb, :live_view
  
  alias PredecessorDraft.Drafts
  alias PredecessorDraft.Drafts.Session
  
  def mount(_params, _session, socket) do
    {:ok, 
     socket
     |> assign(:search_term, "")
     |> assign(:drafts, [])
     |> assign(:selected_draft, nil)
     |> assign(:loading, false)
     |> assign(:error, nil)}
  end

  def handle_event("search", %{"search_term" => search_term}, socket) do
    case search_drafts(String.trim(search_term)) do
      {:ok, drafts} ->
        {:noreply,
         socket
         |> assign(:search_term, search_term)
         |> assign(:drafts, drafts)
         |> assign(:error, nil)}
         
      {:error, reason} ->
        {:noreply,
         socket
         |> assign(:error, reason)
         |> assign(:drafts, [])}
    end
  end

  def handle_event("view_draft", %{"draft_id" => draft_id}, socket) do
    case Drafts.get_session_by_draft_id(draft_id) do
      nil ->
        {:noreply, assign(socket, :error, "Draft not found")}
        
      draft ->
        {:noreply, assign(socket, :selected_draft, draft)}
    end
  end

  def handle_event("close_draft", _params, socket) do
    {:noreply, assign(socket, :selected_draft, nil)}
  end

  defp search_drafts(""), do: {:ok, []}
  
  defp search_drafts(search_term) do
    try do
      import Ecto.Query
      
      query = from s in Session,
        where: s.status == "Completed" and
               (ilike(s.draft_id, ^"%#{search_term}%") or 
                ilike(s.tournament_id, ^"%#{search_term}%")),
        order_by: [desc: s.completed_at],
        limit: 50
      
      drafts = PredecessorDraft.Repo.all(query)
      {:ok, drafts}
    rescue
      e ->
        {:error, "Search failed: #{Exception.message(e)}"}
    end
  end
  
  defp format_datetime(nil), do: "N/A"
  defp format_datetime(datetime) do
    case DateTime.from_naive(datetime, "Etc/UTC") do
      {:ok, dt} -> Calendar.strftime(dt, "%Y-%m-%d %H:%M:%S UTC")
      _ -> "Invalid date"
    end
  end
  
  defp get_winner_team(draft) do
    cond do
      length(draft.team1_picks || []) == 5 and length(draft.team2_picks || []) == 5 ->
        "Draft Complete"
      length(draft.team1_picks || []) > length(draft.team2_picks || []) ->
        "Team 1"
      length(draft.team2_picks || []) > length(draft.team1_picks || []) ->
        "Team 2"
      true ->
        "In Progress"
    end
  end
  
  defp get_phase_display(phase) do
    case phase do
      "Coin Toss" -> "🪙 Coin Toss"
      "Pick Order Selection" -> "🎯 Pick Order"
      "Ban Phase" -> "🚫 Ban Phase"
      "Pick Phase" -> "⚡ Pick Phase"
      "Complete" -> "✅ Complete"
      _ -> phase || "Unknown"
    end
  end
end