defmodule PredecessorDraftWeb.Router do
  use PredecessorDraftWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {PredecessorDraftWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", PredecessorDraftWeb do
    pipe_through :browser

    get "/", PageController, :home
    live "/draft/:draft_id", DraftLive, :show
    live "/draft/:draft_id/spectate", SpectateLive, :show
    live "/admin", AdminLive, :index
    
    # Static asset routes
    get "/assets/*path", PageController, :assets
    get "/images/*path", PageController, :images
  end

  # Other scopes may use custom stacks.
  scope "/api", PredecessorDraftWeb do
    pipe_through :api
    
    get "/health", PageController, :health
    post "/auth/token", AuthController, :create_token
    get "/drafts", DraftController, :list
    post "/drafts", DraftController, :create
    get "/drafts/:draft_id/status", DraftController, :status
    post "/drafts/:draft_id/complete", DraftController, :complete
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:predecessor_draft, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: PredecessorDraftWeb.Telemetry
    end
  end
end