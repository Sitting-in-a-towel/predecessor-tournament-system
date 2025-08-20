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
        <p class="status">✅ Deployed on Fly.io</p>
        <p class="status">✅ Network binding fixed</p>
        <p class="status">✅ SSL configuration fixed</p>
        
        <h2>Next Steps:</h2>
        <ul>
            <li>Re-enable database connection</li>
            <li>Test draft functionality</li>
            <li>Update frontend to use this URL</li>
        </ul>
        
        <p><strong>Health Check:</strong> <a href="/api/health" style="color: #60a5fa;">/api/health</a></p>
        
        <p><em>Phoenix deployment successful after fixing CA certificates issue!</em></p>
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