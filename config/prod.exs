import Config

# For production, don't forget to configure the url host
# to something meaningful, Phoenix uses this information
# when generating URLs.
config :predecessor_draft, PredecessorDraftWeb.Endpoint,
  url: [host: "predecessor-tournament-system.onrender.com", port: 443, scheme: "https"],
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true

# Configures Swoosh API Client
config :swoosh, api_client: false

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.