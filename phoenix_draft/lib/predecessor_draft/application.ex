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
    
    # Database connection for Render
    IO.puts("DATABASE_URL environment variable present: #{if System.get_env("DATABASE_URL"), do: "YES", else: "NO"}")
    
    # Migrations are manually managed - no auto-run needed
    if System.get_env("DATABASE_URL") do
      IO.puts("MIX_ENV: #{System.get_env("MIX_ENV")}")
      IO.puts("✅ Database URL configured - migrations handled manually")
    end
    
    # Enable database
    repo_child = PredecessorDraft.Repo
    IO.puts("✅ Database enabled for Render deployment")
    
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

  defp migrate do
    IO.puts("Starting Ecto repository for migrations...")
    {:ok, _} = PredecessorDraft.Repo.start_link([])
    
    IO.puts("Running migrations...")
    path = Application.app_dir(:predecessor_draft, "priv/repo/migrations")
    Ecto.Migrator.run(PredecessorDraft.Repo, path, :up, all: true)
    
    IO.puts("Stopping temporary Ecto repository...")
    :ok = Supervisor.stop(PredecessorDraft.Repo)
    
    IO.puts("✅ Migrations completed successfully")
  rescue
    error ->
      IO.puts("⚠️ Migration error (may be already run): #{inspect(error)}")
  end
end