defmodule PredecessorDraftWeb.Components.BansDisplay do
  @moduledoc """
  Shared bans display component for showing banned heroes across all views.
  
  Provides consistent styling and layout for banned heroes in both captain
  and spectator interfaces. Supports different display modes and team layouts.
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
      |> assign_new(:display_mode, fn -> :spectator end)   # :spectator, :compact
      |> assign_new(:team1_bans, fn -> [] end)
      |> assign_new(:team2_bans, fn -> [] end)
      |> assign_new(:heroes, fn -> [] end)
      |> assign_new(:max_bans_per_team, fn -> 4 end)
      |> assign_new(:show_labels, fn -> true end)

    ~H"""
    <div class={bans_container_class(@display_mode)}>
      <%= if @display_mode == :spectator do %>
        <%!-- Spectator Mode: Bottom section with team separation --%>
        <div class="bans-container">
          <%!-- Team 1 Bans --%>
          <div class="team-bans">
            <%= for i <- 1..@max_bans_per_team do %>
              <% ban_id = Enum.at(@team1_bans, i - 1) %>
              <% hero = if ban_id && ban_id != "skipped", do: Enum.find(@heroes, &(&1.id == ban_id)), else: nil %>
              
              <div class={["ban-slot", if(hero, do: "filled", else: "")]}>
                <%= if hero do %>
                  <img src={hero.image} alt={hero.name} class="ban-portrait" 
                       onerror="this.src='/images/heroes/placeholder.jpg'" />
                  <div class="ban-x">✕</div>
                  <div class="ban-name"><%= hero.name %></div>
                <% else %>
                  <%= if ban_id == "skipped" do %>
                    <div style="color: #6b7280; font-size: 11px;">Skipped</div>
                  <% else %>
                    <div style="color: #6b7280; font-size: 11px;">Ban <%= i %></div>
                  <% end %>
                <% end %>
              </div>
            <% end %>
          </div>
          
          <%= if @show_labels do %>
            <div class="bans-label">BANS</div>
          <% end %>
          
          <%!-- Team 2 Bans --%>
          <div class="team-bans">
            <%= for i <- 1..@max_bans_per_team do %>
              <% ban_id = Enum.at(@team2_bans, i - 1) %>
              <% hero = if ban_id && ban_id != "skipped", do: Enum.find(@heroes, &(&1.id == ban_id)), else: nil %>
              
              <div class={["ban-slot", if(hero, do: "filled", else: "")]}>
                <%= if hero do %>
                  <img src={hero.image} alt={hero.name} class="ban-portrait" 
                       onerror="this.src='/images/heroes/placeholder.jpg'" />
                  <div class="ban-x">✕</div>
                  <div class="ban-name"><%= hero.name %></div>
                <% else %>
                  <%= if ban_id == "skipped" do %>
                    <div style="color: #6b7280; font-size: 11px;">Skipped</div>
                  <% else %>
                    <div style="color: #6b7280; font-size: 11px;">Ban <%= i %></div>
                  <% end %>
                <% end %>
              </div>
            <% end %>
          </div>
        </div>
      <% else %>
        <%!-- Compact Mode: Single row display for captain view --%>
        <div class="compact-bans-display">
          <%= if @show_labels do %>
            <div class="compact-bans-label">Banned Heroes</div>
          <% end %>
          <div class="compact-bans-grid">
            <%= for ban_id <- (@team1_bans ++ @team2_bans) do %>
              <%= if ban_id && ban_id != "skipped" do %>
                <% hero = Enum.find(@heroes, &(&1.id == ban_id)) %>
                <%= if hero do %>
                  <div class="compact-ban-item">
                    <img src={hero.image} alt={hero.name} class="compact-ban-portrait" 
                         onerror="this.src='/images/heroes/placeholder.jpg'" />
                    <div class="compact-ban-x">✕</div>
                  </div>
                <% end %>
              <% end %>
            <% end %>
          </div>
        </div>
      <% end %>
    </div>
    """
  end

  # Helper functions for styling
  defp bans_container_class(:spectator), do: "bans-section"
  defp bans_container_class(:compact), do: "compact-bans-container"
  defp bans_container_class(_), do: "bans-section"
end