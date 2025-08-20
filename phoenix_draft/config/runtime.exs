import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after config/config.exs and after the
# configuration for the current environment is loaded (config/dev.exs,
# config/test.exs, or config/prod.exs).
#
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/predecessor_draft start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.

# Always start server in production
IO.puts("PHX_SERVER environment variable: #{System.get_env("PHX_SERVER")}")
config :predecessor_draft, PredecessorDraftWeb.Endpoint, server: true

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :predecessor_draft, PredecessorDraft.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6,
    ssl: true,
    ssl_opts: [verify: :verify_none]

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "0.0.0.0"
  port = String.to_integer(System.get_env("PORT") || "10000")
  
  IO.puts("=== PHOENIX STARTUP DEBUG ===")
  IO.puts("HOST: #{host}")  
  IO.puts("PORT: #{port}")
  IO.puts("DATABASE_URL present: #{if System.get_env("DATABASE_URL"), do: "YES", else: "NO"}")
  IO.puts("PHX_SERVER: #{System.get_env("PHX_SERVER")}")
  IO.puts("================================")

  config :predecessor_draft, PredecessorDraftWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      # Bind on all IPv4 interfaces for Render compatibility
      ip: {0, 0, 0, 0},
      port: port
    ],
    secret_key_base: secret_key_base,
    server: true
end