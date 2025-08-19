defmodule PredecessorDraftWeb.Components.TimerDisplay do
  @moduledoc """
  Shared timer display component for both captain and spectator views.
  
  Renders main timers, bonus timers, and timer states consistently across all interfaces.
  Supports different display modes (compact, full, spectator) for various UI contexts.
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
      |> assign_new(:display_mode, fn -> :full end)      # :compact, :full, :spectator
      |> assign_new(:show_bonus_timer, fn -> true end)
      |> assign_new(:team_name, fn -> "Team" end)
      |> assign_new(:is_active, fn -> false end)
      |> assign_new(:timer_remaining, fn -> 20 end)
      |> assign_new(:bonus_remaining, fn -> 10 end)
      |> assign_new(:in_bonus, fn -> false end)
      |> assign_new(:timer_enabled, fn -> true end)

    ~H"""
    <div class={timer_container_class(@display_mode)}>
      <%= if @display_mode == :spectator do %>
        <%!-- Spectator Mode: Header-style timer display --%>
        <div class="timer-box">
          <div class="timer-label">
            <%= if @in_bonus do %>🔥 BONUS TIMER<% else %>Main Timer<% end %>
          </div>
          <div class={["timer-value", if(@is_active, do: "active", else: "")]}>
            <%= if @is_active do %>
              <%= if @in_bonus do %>
                <%= @timer_remaining || @bonus_remaining %>s
              <% else %>
                <%= @timer_remaining %>s
              <% end %>
            <% else %>
              <%= @timer_remaining %>s
            <% end %>
          </div>
          <%= if @show_bonus_timer && @timer_enabled do %>
            <div class="bonus-time">
              Bonus: <%= @bonus_remaining %>s
            </div>
          <% end %>
        </div>
      <% else %>
        <%!-- Captain Mode: Side panel timer display --%>
        <%= if @show_bonus_timer && @timer_enabled do %>
          <div class="text-center mb-2">
            <%= if @in_bonus do %>
              <div class="bg-red-600 text-white px-2 py-1 rounded text-xs font-mono animate-pulse">
                🔥 BONUS: <%= @bonus_remaining %>s
              </div>
            <% else %>
              <div class="bg-blue-600 text-white px-2 py-1 rounded text-xs font-mono">
                Bonus: <%= @bonus_remaining %>s
              </div>
            <% end %>
          </div>
        <% end %>
        
        <%!-- Main Timer Display --%>
        <div class="text-center mb-2">
          <%= if @is_active && @timer_enabled do %>
            <div class="bg-yellow-500 text-black px-2 py-2 rounded text-sm font-mono font-bold animate-pulse">
              ⏱️ <%= if @in_bonus, do: 0, else: @timer_remaining %>s
            </div>
          <% else %>
            <div class="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs font-mono">
              Timer: <%= @timer_remaining %>s
            </div>
          <% end %>
        </div>
        
        <%!-- Bonus Bank Display --%>
        <%= if @show_bonus_timer && @timer_enabled do %>
          <div class="text-center mb-1">
            <div class="text-xs text-gray-300">
              Bonus Bank: <%= @bonus_remaining %>s
            </div>
          </div>
        <% end %>
      <% end %>
    </div>
    """
  end

  # Helper function to determine container CSS classes based on display mode
  defp timer_container_class(:spectator), do: "timer-box"
  defp timer_container_class(:compact), do: "timer-compact"
  defp timer_container_class(:full), do: "timer-full"
  defp timer_container_class(_), do: "timer-full"
end