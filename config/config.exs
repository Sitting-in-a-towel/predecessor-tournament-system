# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
import Config

config :predecessor_draft,
  ecto_repos: [PredecessorDraft.Repo],
  generators: [timestamp_type: :utc_datetime]

# Configures the endpoint
config :predecessor_draft, PredecessorDraftWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Phoenix.Endpoint.Cowboy2Adapter,
  render_errors: [
    formats: [html: PredecessorDraftWeb.ErrorHTML, json: PredecessorDraftWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: PredecessorDraft.PubSub,
  live_view: [signing_salt: "draft_system_salt"]

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.17.11",
  default: [
    args:
      ~w(js/app.js --bundle --target=es2017 --outdir=../priv/static/assets --external:/fonts/* --external:/images/*),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

# Configure tailwind (the version is required)
config :tailwind,
  version: "3.3.0",
  default: [
    args: ~w(
      --config=tailwind.config.js
      --input=css/app.css
      --output=../priv/static/assets/app.css
    ),
    cd: Path.expand("../assets", __DIR__)
  ]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Configuration for draft-specific settings
config :predecessor_draft,
  # Maximum number of concurrent drafts
  max_concurrent_drafts: 20,
  
  # Draft timeout settings (in seconds)
  coin_toss_timeout: 60,
  pick_phase_timeout: 30,
  ban_phase_timeout: 25,
  
  # Real-time update settings
  presence_heartbeat_interval: 5_000,
  broadcast_debounce: 100

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"