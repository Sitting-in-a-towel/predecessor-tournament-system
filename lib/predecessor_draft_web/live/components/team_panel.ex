defmodule PredecessorDraftWeb.Components.TeamPanel do
  @moduledoc """
  Shared team panel component for displaying team information, picks, bans, and timers.
  
  Used in both captain view (side panels) and spectator view (team display areas).
  Supports different layout modes and customizable content sections.
  """
  use Phoenix.LiveComponent
  
  alias PredecessorDraftWeb.Components.TimerDisplay

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
      |> assign_new(:team_position, fn -> :left end)       # :left, :right
      |> assign_new(:team_name, fn -> "Team" end)
      |> assign_new(:team_picks, fn -> [] end)
      |> assign_new(:team_bans, fn -> [] end)
      |> assign_new(:show_timers, fn -> true end)
      |> assign_new(:show_draft_order, fn -> true end)
      |> assign_new(:show_coin_info, fn -> true end)
      |> assign_new(:coin_choice, fn -> nil end)
      |> assign_new(:coin_winner, fn -> false end)
      |> assign_new(:timer_state, fn -> %{} end)
      |> assign_new(:current_team, fn -> nil end)
      |> assign_new(:heroes, fn -> [] end)
      |> assign_new(:current_phase, fn -> "waiting" end)
      |> assign_new(:draft_sequence, fn -> [] end)
      |> assign_new(:current_draft_position, fn -> 1 end)

    ~H"""
    <div class={team_panel_class(@display_mode, @team_position)}>
      <%= if @display_mode == :spectator do %>
        <%!-- Spectator Mode: Large hero slots for picks --%>
        <%= for i <- 1..5 do %>
          <% hero_id = Enum.at(@team_picks, i - 1) %>
          <% hero = if hero_id && hero_id != "skipped", do: Enum.find(@heroes, &(&1.id == hero_id)), else: nil %>
          <% team_pick_count = length(@team_picks) %>
          <% team_id = if @team_position == :left, do: "team1", else: "team2" %>
          <% is_current = @current_team == team_id && @current_phase == "Pick Phase" && i == team_pick_count + 1 %>
          
          <div class={["hero-slot", if(hero, do: "filled", else: ""), if(is_current, do: "active", else: "")]}>
            <div class="slot-number">Pick <%= i %></div>
            <%= if hero do %>
              <img src={hero.image} alt={hero.name} class="hero-portrait-small" 
                   onerror="this.src='/images/heroes/placeholder.jpg'" />
              <div class="hero-info">
                <div class="hero-name"><%= hero.name %></div>
                <div class="hero-role"><%= hero.role %></div>
              </div>
            <% else %>
              <div class="empty-slot-text">Empty</div>
            <% end %>
          </div>
        <% end %>
      <% else %>
        <%!-- Captain Mode: Compact side panel layout --%>
        
        <%!-- Timer Display --%>
        <%= if @show_timers do %>
          <% team_key = if(@team_position == :left, do: "team1", else: "team2") %>
          <% is_this_teams_turn = @current_team == team_key %>
          <% main_timer = if is_this_teams_turn && Map.get(@timer_state, :current_phase) == :main_timer do
              Map.get(@timer_state, :current_timer_remaining, 20)
            else
              Map.get(@timer_state, :"#{team_key}_main_remaining", 20)
            end %>
          <.live_component
            module={TimerDisplay}
            id={"timer-#{@team_position}-#{team_key}"}
            display_mode={:full}
            team_name={@team_name}
            is_active={is_this_teams_turn}
            timer_remaining={main_timer}
            bonus_remaining={Map.get(@timer_state, :"#{team_key}_bonus_remaining", 10)}
            in_bonus={is_this_teams_turn && Map.get(@timer_state, :current_phase) == :bonus_timer}
            timer_enabled={Map.get(@timer_state, :timer_enabled, true)}
            show_bonus_timer={true}
          />
        <% end %>
        
        <%!-- Team Name --%>
        <h3 class="text-center text-white font-bold mb-1 text-sm"><%= @team_name %></h3>
        
        <%!-- Coin Toss Info --%>
        <%= if @show_coin_info do %>
          <div class="text-center mb-3 text-xs">
            <div class="text-gray-400">Chose: <span class="text-yellow-400"><%= String.capitalize(@coin_choice || "none") %></span></div>
            <%= if @coin_winner do %>
              <div class="text-green-400">🏆 Won Coin Toss</div>
            <% end %>
            <div class="text-gray-500 mt-1">Captain: <%= String.capitalize(to_string(@team_position)) %></div>
          </div>
        <% end %>
        
        <%!-- Draft Order/Sequence --%>
        <%= if @show_draft_order do %>
          <div class="text-white text-xs font-semibold mb-2">Draft Order</div>
          <%= for slot <- @draft_sequence do %>
            <div class={draft_slot_classes(slot, @current_draft_position, @current_phase, @current_team)} 
                 style={draft_slot_styles(slot)}>
              <div style="position: absolute; top: 2px; right: 4px; font-size: 10px; color: #9ca3af;"><%= slot.position %></div>
              <span class="text-xs">
                <%= if slot.selection do %>
                  <span class={if slot.action == :pick, do: "text-green-400", else: "text-red-400"}><%= get_hero_name(slot.selection, @heroes) %></span>
                <% else %>
                  <span class="text-gray-500"><%= slot.label %></span>
                <% end %>
              </span>
            </div>
          <% end %>
        <% end %>
      <% end %>
    </div>
    """
  end

  # Helper functions for CSS classes and styling
  defp team_panel_class(:spectator, :left), do: "team-panel team-panel-left"
  defp team_panel_class(:spectator, :right), do: "team-panel team-panel-right"  
  defp team_panel_class(:captain, _), do: "width: 140px; background-color: #2f3136; padding: 8px; overflow-y: auto;"
  defp team_panel_class(:captain_side, :left), do: "team-panel team-panel-left"
  defp team_panel_class(:captain_side, :right), do: "team-panel team-panel-right"

  defp draft_slot_classes(slot, current_position, current_phase, current_team) do
    classes = []
    classes = if slot.position == current_position && 
                 current_phase in ["Ban Phase", "Pick Phase"] && 
                 slot.team == current_team do
      ["active-slot" | classes]
    else
      classes
    end
    Enum.join(classes, " ")
  end

  defp draft_slot_styles(slot) do
    height = if slot.action == :pick, do: "50px", else: "40px"
    background = if slot.selection do
      if slot.action == :pick, do: "#1e5c1e", else: "#5c1e1e"
    else
      "#4a4a4a"
    end
    
    "height: #{height}; background-color: #{background}; border-radius: 4px; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; position: relative; border: 2px solid transparent;"
  end

  # Helper function to get hero name from hero list
  defp get_hero_name(hero_id, heroes) do
    case Enum.find(heroes, &(&1.id == hero_id)) do
      nil -> String.capitalize(hero_id)
      hero -> hero.name
    end
  end
end