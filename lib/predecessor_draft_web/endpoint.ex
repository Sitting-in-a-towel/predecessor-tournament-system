defmodule PredecessorDraftWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :predecessor_draft

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  @session_options [
    store: :cookie,
    key: "_predecessor_draft_key",
    signing_salt: "draft_session_salt",
    same_site: "Lax"
  ]

  socket "/live", Phoenix.LiveView.Socket, 
    websocket: [connect_info: [session: @session_options]],
    longpoll: [connect_info: [session: @session_options]]

  # Serve at "/" the static files from "priv/static" directory.
  #
  # You should set gzip to true if you are running phx.digest
  # when deploying your static files in production.
  plug Plug.Static,
    at: "/",
    from: :predecessor_draft,
    gzip: false,
    only: PredecessorDraftWeb.static_paths()

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
    # Temporarily disable migration check to test draft functionality
    # plug Phoenix.Ecto.CheckRepoStatus, otp_app: :predecessor_draft
  end

  plug Phoenix.LiveDashboard.RequestLogger,
    param_key: "request_logger",
    cookie_key: "request_logger"

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  
  # Add CORS headers for React app
  plug PredecessorDraftWeb.Plugs.CORS
  
  plug Plug.Session, @session_options
  plug PredecessorDraftWeb.Router
end