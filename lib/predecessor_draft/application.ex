defmodule PredecessorDraft.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    # Skip custom logging in production to avoid startup issues
    # Note: Mix.env() is not available in releases, so we check MIX_ENV
    if System.get_env("MIX_ENV") != "prod" do
      try do
        PredecessorDraft.Logger.setup()
        PredecessorDraft.Logger.log(:info, "APPLICATION", "Starting PredecessorDraft application")
      rescue
        error ->
          IO.puts("Logger setup failed: #{inspect(error)}")
      end
    else
      IO.puts("Starting PredecessorDraft application (production mode)")
    end
    
    # Initialize ETS tables for security features - create once at application startup
    initialize_ets_tables()
    
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
    
    # Mix.env() is not available in releases, check MIX_ENV instead
    if System.get_env("MIX_ENV") != "prod" do
      try do
        PredecessorDraft.Logger.log(:info, "APPLICATION", "PredecessorDraft application started successfully")
      rescue
        _ -> IO.puts("PredecessorDraft application started successfully")
      end
    else
      IO.puts("PredecessorDraft application started successfully (production mode)")
    end
    
    result
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    PredecessorDraftWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  # Initialize ETS tables at application startup to avoid race conditions
  defp initialize_ets_tables do
    # Rate limiting table for security
    case :ets.whereis(:rate_limit_table) do
      :undefined ->
        try do
          :ets.new(:rate_limit_table, [:named_table, :public, :set])
          IO.puts("Created rate_limit_table ETS table")
        rescue
          error ->
            IO.puts("Failed to create rate_limit_table: #{inspect(error)}")
        end
      _ ->
        IO.puts("rate_limit_table already exists")
    end
    
    # Hero cache table 
    case :ets.whereis(:hero_cache) do
      :undefined ->
        try do
          :ets.new(:hero_cache, [:named_table, :public, :set])
          IO.puts("Created hero_cache ETS table")
        rescue
          error ->
            IO.puts("Failed to create hero_cache: #{inspect(error)}")
        end
      _ ->
        IO.puts("hero_cache already exists")
    end
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