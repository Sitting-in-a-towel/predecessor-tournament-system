defmodule PredecessorDraft.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    # Initialize custom logging system
    PredecessorDraft.Logger.setup()
    PredecessorDraft.Logger.log(:info, "APPLICATION", "Starting PredecessorDraft application")
    
    # Try to start Repo with better error handling
    repo_child = if System.get_env("SKIP_DATABASE") == "true" do
      IO.puts("SKIPPING DATABASE CONNECTION - Running without database")
      nil
    else
      IO.puts("Starting database connection...")
      PredecessorDraft.Repo
    end
    
    children = [
      PredecessorDraftWeb.Telemetry,
      repo_child,
      {DNSCluster, query: Application.get_env(:predecessor_draft, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: PredecessorDraft.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: PredecessorDraft.Finch},
      # Start the presence tracker
      PredecessorDraftWeb.Presence,
      # Timer system components
      {Registry, keys: :unique, name: PredecessorDraft.TimerRegistry},
      PredecessorDraft.TimerSupervisor,
      # Start a worker by calling: PredecessorDraft.Worker.start_link(arg)
      # {PredecessorDraft.Worker, arg},
      # Start to serve requests, typically the last entry
      PredecessorDraftWeb.Endpoint
    ] |> Enum.filter(&(&1 != nil))

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: PredecessorDraft.Supervisor]
    
    result = Supervisor.start_link(children, opts)
    PredecessorDraft.Logger.log(:info, "APPLICATION", "PredecessorDraft application started successfully")
    result
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    PredecessorDraftWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end