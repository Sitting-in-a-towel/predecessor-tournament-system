defmodule PredecessorDraftWeb.Components.DraftHeader do
  @moduledoc """
  Shared draft header component for both captain and spectator views.
  
  Displays team names, connection status, timers, and draft status information.
  Supports different layout modes for various interface contexts.
  """
  use Phoenix.LiveComponent
  
  alias PredecessorDraftWeb.Components.{TimerDisplay, DraftStatus}

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
      |> assign_new(:display_mode, fn -> :captain end)     # :captain, :spectator
      |> assign_new(:draft_id, fn -> "unknown" end)
      |> assign_new(:current_phase, fn -> "waiting" end)
      |> assign_new(:team1, fn -> %{team_name: "Team 1"} end)
      |> assign_new(:team2, fn -> %{team_name: "Team 2"} end)
      |> assign_new(:team1_connected, fn -> false end)
      |> assign_new(:team2_connected, fn -> false end)
      |> assign_new(:captain_role, fn -> nil end)
      |> assign_new(:timer_state, fn -> %{} end)
      |> assign_new(:current_turn, fn -> nil end)
      |> assign_new(:current_action, fn -> :pick end)
      |> assign_new(:show_back_link, fn -> true end)

    ~H"""
    <header class={header_container_class(@display_mode)}>
      <%= if @display_mode == :spectator do %>
        <%!-- Spectator Mode: Full-width header with team sections and central status --%>
        <%!-- Team 1 Section --%>
        <div class="team-header-section">
          <div class="team-name-box team1-name">
            <%= @team1.team_name %>
          </div>
          <%= if Map.get(@timer_state, :timer_enabled, false) do %>
            <.live_component
              module={TimerDisplay}
              id="header-timer-team1"
              display_mode={:spectator}
              team_name={@team1.team_name}
              is_active={@current_turn == "team1"}
              timer_remaining={Map.get(@timer_state, :timer_remaining, 20)}
              bonus_remaining={Map.get(@timer_state, :team1_bonus_remaining, 10)}
              in_bonus={Map.get(@timer_state, :team1_in_bonus, false)}
              timer_enabled={true}
              show_bonus_timer={true}
            />
          <% end %>
        </div>
        
        <%!-- Team 2 Section --%>
        <div class="team-header-section" style="justify-content: flex-end;">
          <%= if Map.get(@timer_state, :timer_enabled, false) do %>
            <.live_component
              module={TimerDisplay}
              id="header-timer-team2"
              display_mode={:spectator}
              team_name={@team2.team_name}
              is_active={@current_turn == "team2"}
              timer_remaining={Map.get(@timer_state, :timer_remaining, 20)}
              bonus_remaining={Map.get(@timer_state, :team2_bonus_remaining, 10)}
              in_bonus={Map.get(@timer_state, :team2_in_bonus, false)}
              timer_enabled={true}
              show_bonus_timer={true}
            />
          <% end %>
          <div class="team-name-box team2-name">
            <%= @team2.team_name %>
          </div>
        </div>
        
        <%!-- Central Status Display --%>
        <.live_component
          module={DraftStatus}
          id="header-draft-status"
          display_mode={:banner}
          current_phase={@current_phase}
          current_turn={@current_turn}
          current_action={@current_action}
          team1_name={@team1.team_name}
          team2_name={@team2.team_name}
          show_action={true}
          show_team_names={true}
        />
      <% else %>
        <%!-- Captain Mode: Compact header layout --%>
        <div class="w-full px-4 h-full">
          <div class="flex justify-between items-center h-full">
            <div class="flex items-center">
              <h1 class="text-xl font-bold text-white">
                Draft <%= @draft_id %>
              </h1>
              
              <div class="ml-4">
                <.live_component
                  module={DraftStatus}
                  id="header-status-compact"
                  display_mode={:header}
                  current_phase={@current_phase}
                  current_turn={@current_turn}
                  current_action={@current_action}
                  team1_name={@team1.team_name}
                  team2_name={@team2.team_name}
                  show_action={false}
                  show_team_names={false}
                />
              </div>
              
              <%= if @captain_role do %>
                <div class="ml-6 px-3 py-1 bg-blue-600 rounded text-sm">
                  <span class="text-white font-semibold">
                    Drafting for: <%= if @captain_role == "team1", do: @team1.team_name, else: @team2.team_name %>
                  </span>
                </div>
              <% end %>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-4 text-xs text-gray-300">
                <div class="flex items-center">
                  <span class={["inline-block w-2 h-2 rounded-full mr-1", if(@team1_connected, do: "bg-green-400", else: "bg-gray-500")]}></span>
                  <%= @team1.team_name %> Captain
                </div>
                <div class="flex items-center">
                  <span class={["inline-block w-2 h-2 rounded-full mr-1", if(@team2_connected, do: "bg-green-400", else: "bg-gray-500")]}></span>
                  <%= @team2.team_name %> Captain
                </div>
              </div>
              
              <%= if @show_back_link do %>
                <a href="http://localhost:3000" class="text-gray-300 hover:text-white text-sm">
                  ← Back
                </a>
              <% end %>
            </div>
          </div>
        </div>
      <% end %>
    </header>
    """
  end

  # Helper function for header styling
  defp header_container_class(:spectator), do: "spectate-header"
  defp header_container_class(:captain), do: "shadow-lg bg-gray-800 h-10"
  defp header_container_class(_), do: "shadow-lg bg-gray-800 h-10"
end