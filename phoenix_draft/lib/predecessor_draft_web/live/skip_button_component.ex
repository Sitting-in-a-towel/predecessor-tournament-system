defmodule PredecessorDraftWeb.SkipButtonComponent do
  use PredecessorDraftWeb, :live_component

  def render(assigns) do
    ~H"""
    <div class="text-center mb-2" id={"skip-button-#{@id}"}>
      <% my_turn = PredecessorDraft.Drafts.Session.next_pick_team(@draft) == @captain_role %>
      <% current_action = PredecessorDraft.Drafts.determine_current_action(@draft) %>
      
      <%= if current_action == :ban do %>
        <button 
          phx-click="skip_ban"
          phx-target={@myself}
          phx-disable-with="Skipping..."
          class={[
            "px-4 py-1 text-sm rounded transition-all duration-150",
            if my_turn do
              "bg-yellow-600 text-white hover:bg-yellow-700 cursor-pointer shadow-lg"
            else
              "bg-gray-500 text-gray-300 cursor-not-allowed opacity-50"
            end
          ]}
          disabled={!my_turn}
        >
          Skip Ban
        </button>
      <% end %>
    </div>
    """
  end

  def handle_event("skip_ban", _params, socket) do
    draft = socket.assigns.draft
    captain_role = socket.assigns.captain_role
    
    # Send message to parent LiveView to handle skip
    send(self(), {:skip_ban_clicked, captain_role})
    
    {:noreply, socket}
  end
end