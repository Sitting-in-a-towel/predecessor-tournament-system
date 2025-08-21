defmodule PredecessorDraftWeb.Components.DraftStatus do
  @moduledoc """
  Shared draft status component for displaying current phase, turn, and action information.
  
  Used across captain and spectator views to show consistent draft state information.
  Supports different display formats for various UI contexts.
  """
  use Phoenix.LiveComponent

  @impl true
  def mount(socket) do
    {:ok, socket}
  end

  @impl true
  def update(assigns, socket) do
    {:ok, assign(socket, assigns)}
  end

  @impl true
  def render(assigns) do
    # Assign defaults for optional parameters
    assigns = 
      assigns
      |> assign_new(:display_mode, fn -> :header end)      # :header, :banner, :compact
      |> assign_new(:current_phase, fn -> "waiting" end)
      |> assign_new(:current_turn, fn -> nil end)
      |> assign_new(:current_action, fn -> :pick end)
      |> assign_new(:team1_name, fn -> "Team 1" end)
      |> assign_new(:team2_name, fn -> "Team 2" end)
      |> assign_new(:show_action, fn -> true end)
      |> assign_new(:show_team_names, fn -> true end)

    ~H"""
    <div class={status_container_class(@display_mode)}>
      <%= if @display_mode == :banner do %>
        <%!-- Banner Mode: Large central status display for spectator view --%>
        <div class="draft-status-box">
          <div class="status-phase">
            <%= phase_display_name(@current_phase) %>
          </div>
          <%= if @current_phase in ["Ban Phase", "Pick Phase"] && @current_turn do %>
            <div class="status-turn">
              <%= get_team_name(@current_turn, @team1_name, @team2_name) %>'s <%= if @current_action == :ban, do: "BAN", else: "PICK" %>
            </div>
          <% end %>
          <%= if @current_phase == "Complete" do %>
            <div class="status-turn" style="color: #10b981;">
              DRAFT COMPLETE
            </div>
          <% end %>
        </div>
      <% else %>
        <%!-- Header/Compact Mode: Inline status display for captain view --%>
        <div class="flex items-center space-x-4">
          <div class="px-2 py-1 bg-gray-700 rounded text-sm text-white">
            <%= phase_display_name(@current_phase) %>
          </div>
          
          <%= if @current_phase in ["Ban Phase", "Pick Phase"] && @current_turn && @show_action do %>
            <div class="px-3 py-1 bg-yellow-600 rounded text-sm text-white font-semibold">
              <%= get_team_name(@current_turn, @team1_name, @team2_name) %>'s 
              <%= if @current_action == :ban, do: "Ban", else: "Pick" %>
            </div>
          <% end %>
          
          <%= if @current_phase == "Complete" do %>
            <div class="px-3 py-1 bg-green-600 rounded text-sm text-white font-semibold">
              Draft Complete
            </div>
          <% end %>
        </div>
      <% end %>
    </div>
    """
  end

  # Helper functions for styling and data formatting
  defp status_container_class(:banner), do: "draft-status-banner"
  defp status_container_class(:header), do: "draft-status-header"
  defp status_container_class(:compact), do: "draft-status-compact"
  defp status_container_class(_), do: "draft-status-header"

  defp phase_display_name("Coin Toss"), do: "Coin Toss"
  defp phase_display_name("Pick Order Selection"), do: "Pick Order"
  defp phase_display_name("Ban Phase"), do: "Ban Phase"
  defp phase_display_name("Pick Phase"), do: "Pick Phase"
  defp phase_display_name("Complete"), do: "Complete"
  defp phase_display_name(phase), do: phase

  defp get_team_name("team1", team1_name, _team2_name), do: team1_name
  defp get_team_name("team2", _team1_name, team2_name), do: team2_name
  defp get_team_name(_, _team1_name, _team2_name), do: "Unknown Team"
end