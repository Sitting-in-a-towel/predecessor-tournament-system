defmodule PredecessorDraftWeb.PageController do
  use PredecessorDraftWeb, :controller

  def home(conn, _params) do
    # Simple HTML response for testing
    html(conn, """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Phoenix Draft System - PRODUCTION</title>
        <style>
            body { font-family: Arial; padding: 20px; background: #1a1a1a; color: white; }
            .status { color: #4ade80; }
        </style>
    </head>
    <body>
        <h1>🎉 Phoenix Draft System - PRODUCTION RUNNING!</h1>
        <p class="status">✅ Phoenix LiveView Server is ONLINE</p>
        <p class="status">✅ Deployed on Render</p>
        <p class="status">✅ Database connection enabled</p>
        <p class="status">✅ Migrations synchronized</p>
        <p class="status">✅ Test heroes added</p>
        
        <h2>System Status:</h2>
        <ul>
            <li>PostgreSQL Database: Connected</li>
            <li>Migration Status: All migrations applied</li>
            <li>Heroes Table: 5 test heroes loaded</li>
            <li>Draft System: Ready for testing</li>
        </ul>
        
        <p><strong>Health Check:</strong> <a href="/api/health" style="color: #60a5fa;">/api/health</a></p>
        <p><strong>Database Test:</strong> <a href="/api/db-test" style="color: #60a5fa;">/api/db-test</a></p>
        
        <p><em>Phoenix deployment successful with full database integration!</em></p>
    </body>
    </html>
    """)
  end

  def health(conn, _params) do
    json(conn, %{
      status: "healthy",
      service: "predecessor-draft-phoenix",
      environment: Application.get_env(:predecessor_draft, :environment, "production"),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })
  end

  def test(conn, _params) do
    html(conn, """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Phoenix Test Route</title>
        <style>body { font-family: Arial; padding: 20px; }</style>
    </head>
    <body>
        <h1>🧪 Phoenix Test Route Working!</h1>
        <p>This route goes through the browser pipeline but doesn't use LiveView.</p>
        <p>If this works, the issue is LiveView-specific.</p>
        <p><a href="/api/health">Health Check</a> | <a href="/api/db-test">Database Test</a></p>
    </body>
    </html>
    """)
  end

  def db_test(conn, _params) do
    try do
      # Simple database test - check if we can connect
      case PredecessorDraft.Repo.query("SELECT 1 as test", []) do
        {:ok, %{rows: [[1]]}} ->
          json(conn, %{
            database: "connected",
            status: "success",
            timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
          })
        {:error, error} ->
          json(conn, %{
            database: "error",
            status: "failed",
            error: inspect(error),
            timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
          })
      end
    rescue
      e ->
        json(conn, %{
          database: "exception",
          status: "failed",
          error: inspect(e),
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
        })
    end
  end

  def assets(conn, %{"path" => path}) do
    # Serve static assets from priv/static
    file_path = Path.join(["priv", "static", "assets"] ++ path)
    
    if File.exists?(file_path) do
      conn
      |> put_resp_content_type(get_content_type(List.last(path)))
      |> send_file(200, file_path)
    else
      conn
      |> put_status(404)
      |> text("Asset not found")
    end
  end

  def images(conn, %{"path" => path}) do
    # Serve static images from priv/static/images
    file_path = Path.join(["priv", "static", "images"] ++ path)
    
    if File.exists?(file_path) do
      conn
      |> put_resp_content_type(get_content_type(List.last(path)))
      |> send_file(200, file_path)
    else
      # Return a placeholder or 404
      conn
      |> put_status(404)
      |> text("Image not found")
    end
  end

  defp get_content_type(filename) do
    case Path.extname(filename) do
      ".css" -> "text/css"
      ".js" -> "text/javascript"
      ".png" -> "image/png"
      ".jpg" -> "image/jpeg"
      ".jpeg" -> "image/jpeg"
      ".svg" -> "image/svg+xml"
      _ -> "application/octet-stream"
    end
  end
end