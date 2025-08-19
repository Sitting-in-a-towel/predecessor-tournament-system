defmodule PredecessorDraftWeb.PageController do
  use PredecessorDraftWeb, :controller

  def home(conn, _params) do
    # The home page is often custom made,
    # so skip the default app layout.
    render(conn, :home, layout: false)
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