defmodule PredecessorDraftWeb.Layouts do
  @moduledoc """
  This module holds different layouts used by your application.

  See the `layouts` directory for all templates.
  """
  use PredecessorDraftWeb, :html
  import PredecessorDraftWeb.CoreComponents

  embed_templates "layouts/*"
end