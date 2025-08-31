defmodule PredecessorDraft.PublicDrafts.PublicDraft do
  @moduledoc """
  Schema for public drafts - standalone draft system without authentication.
  """
  
  use Ecto.Schema
  import Ecto.Changeset
  
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  
  @formats ["classic", "chaos", "speed"]
  @statuses ["waiting", "active", "completed", "expired"]
  
  schema "public_drafts" do
    field :draft_code, :string
    field :format, :string, default: "classic"
    
    field :team1_name, :string, default: "Team Blue"
    field :team2_name, :string, default: "Team Orange"
    
    field :captain1_token, :string
    field :captain2_token, :string
    field :spectator_token, :string
    
    field :captain1_claimed, :boolean, default: false
    field :captain2_claimed, :boolean, default: false
    
    field :status, :string, default: "waiting"
    field :draft_session_id, :binary_id
    field :expires_at, :utc_datetime
    field :last_activity, :utc_datetime
    
    # Association with actual draft session
    belongs_to :draft_session, PredecessorDraft.Drafts.Session, foreign_key: :draft_id
    
    timestamps()
  end
  
  @doc false
  def changeset(public_draft, attrs) do
    public_draft
    |> cast(attrs, [
      :draft_code, :format, :team1_name, :team2_name, 
      :captain1_token, :captain2_token, :spectator_token,
      :captain1_claimed, :captain2_claimed, :status,
      :draft_session_id, :expires_at, :last_activity
    ])
    |> validate_required([:draft_code])
    |> validate_inclusion(:format, @formats)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint(:draft_code)
    |> validate_format(:draft_code, ~r/^draft_\d+_[a-z0-9]+$/)
  end
  
  def create_changeset(attrs \\ %{}) do
    %__MODULE__{}
    |> changeset(attrs)
    |> put_draft_code()
    |> put_tokens()
    |> put_expiry()
  end
  
  defp put_draft_code(changeset) do
    if get_field(changeset, :draft_code) do
      changeset
    else
      timestamp = System.system_time(:millisecond)
      random_suffix = generate_random_suffix()
      draft_code = "draft_#{timestamp}_#{random_suffix}"
      put_change(changeset, :draft_code, draft_code)
    end
  end
  
  defp put_tokens(changeset) do
    changeset
    |> put_change(:captain1_token, generate_token("captain1"))
    |> put_change(:captain2_token, generate_token("captain2"))
    |> put_change(:spectator_token, generate_token("spectator"))
  end
  
  defp put_expiry(changeset) do
    expires_at = DateTime.utc_now() |> DateTime.add(24 * 60 * 60, :second) # 24 hours
    changeset
    |> put_change(:expires_at, expires_at)
    |> put_change(:last_activity, DateTime.utc_now())
  end
  
  defp generate_random_suffix do
    :crypto.strong_rand_bytes(4)
    |> Base.encode16(case: :lower)
    |> String.slice(0, 8)
  end
  
  defp generate_token(prefix) do
    timestamp = System.system_time(:millisecond)
    random = :crypto.strong_rand_bytes(16) |> Base.url_encode64(padding: false)
    "#{prefix}_#{timestamp}_#{random}"
  end
end