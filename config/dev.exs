import Config

# Load environment variables from .env file in development
if File.exists?(".env") do
  File.read!(".env")
  |> String.split("\n", trim: true)
  |> Enum.reject(&String.starts_with?(&1, "#"))
  |> Enum.each(fn line ->
    case String.split(line, "=", parts: 2) do
      [key, value] -> System.put_env(key, value)
      _ -> :ok
    end
  end)
end

# Configure your database (production-like with environment variable support)
config :predecessor_draft, PredecessorDraft.Repo,
  username: System.get_env("DB_USERNAME") || "postgres",
  password: System.get_env("DB_PASSWORD") || "Antigravity7@!89",
  database: System.get_env("DB_NAME") || "predecessor_tournaments",
  hostname: System.get_env("DB_HOST") || "localhost",
  port: String.to_integer(System.get_env("DB_PORT") || "5432"),
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
  show_sensitive_data_on_connection_error: true,
  log: false  # Disable SQL query logging for security

# For development, we disable any cache and enable
# debugging and code reloading.
config :predecessor_draft, PredecessorDraftWeb.Endpoint,
  # Binding to all interfaces like production for consistency
  # Use 0.0.0.0 to allow access from other machines (matches production behavior)
  http: [ip: {0, 0, 0, 0}, port: 4000],
  # Allow localhost origins like production allows specific origins
  check_origin: [
    "http://localhost:4000",
    "http://localhost:3000",  # React frontend
    "http://localhost:3001"   # React backend  
  ],
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "draft_system_development_secret_key_base_very_long_string_here_for_development",
  watchers: [
    esbuild: {Esbuild, :install_and_run, [:default, ~w(--sourcemap=inline --watch)]},
    tailwind: {Tailwind, :install_and_run, [:default, ~w(--watch)]}
  ]

# Watch static and templates for browser reloading.
config :predecessor_draft, PredecessorDraftWeb.Endpoint,
  live_reload: [
    patterns: [
      ~r"priv/static/.*(js|css|png|jpeg|jpg|gif|svg)$",
      ~r"priv/gettext/.*(po)$",
      ~r"lib/predecessor_draft_web/(controllers|live|components)/.*(ex|heex)$"
    ]
  ]

# Enable dev routes for dashboard and mailbox
config :predecessor_draft, dev_routes: true

# Do not include metadata nor timestamps in development logs
config :logger, :console, format: "[$level] $message\n"

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 20

# Initialize plugs at runtime for faster development compilation
config :phoenix, :plug_init_mode, :runtime

# React service URLs for local development (environment variable support)
config :predecessor_draft,
  react_backend_url: System.get_env("REACT_BACKEND_URL") || "http://localhost:3001",
  react_frontend_url: System.get_env("REACT_FRONTEND_URL") || "http://localhost:3000"