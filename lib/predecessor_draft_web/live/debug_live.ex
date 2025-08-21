defmodule PredecessorDraftWeb.DebugLive do
  use PredecessorDraftWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, assign(socket, :message, "LiveView is working!")}
  end

  def render(assigns) do
    ~H"""
    <div class="p-8 bg-gray-900 text-white min-h-screen">
      <h1 class="text-3xl font-bold mb-4">Debug LiveView</h1>
      <p class="text-green-400 text-xl"><%= @message %></p>
      <p class="text-gray-300 mt-4">If you can see this, LiveView is working properly.</p>
      <p class="text-gray-300">Environment: <%= Mix.env() %></p>
      <p class="text-gray-300">Phoenix Version: <%= Application.spec(:phoenix, :vsn) %></p>
    </div>
    """
  end
end