defmodule PredecessorDraft.TimerSupervisor do
  @moduledoc """
  Dynamic supervisor for managing timer processes.
  Each draft gets its own timer process that is supervised and can be restarted if it crashes.
  """
  
  use DynamicSupervisor
  require Logger

  @doc """
  Starts the timer supervisor.
  """
  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @doc """
  Initializes the supervisor with a one-for-one strategy.
  This means if a timer process crashes, only that process is restarted.
  """
  @impl true
  def init(_init_arg) do
    Logger.info("TimerSupervisor starting...")
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  @doc """
  Starts a timer manager for a specific draft.
  Returns {:ok, pid} if successful, or {:error, {:already_started, pid}} if already running.
  """
  def start_timer_for_draft(draft_id) when is_binary(draft_id) do
    Logger.info("Starting timer manager for draft: #{draft_id}")
    
    child_spec = %{
      id: {PredecessorDraft.TimerManager, draft_id},
      start: {PredecessorDraft.TimerManager, :start_link, [draft_id]},
      restart: :transient  # Only restart if it crashes abnormally
    }
    
    case DynamicSupervisor.start_child(__MODULE__, child_spec) do
      {:ok, pid} -> 
        Logger.info("Timer manager started successfully for draft #{draft_id} with pid #{inspect(pid)}")
        {:ok, pid}
      {:error, {:already_started, pid}} -> 
        Logger.info("Timer manager already running for draft #{draft_id} with pid #{inspect(pid)}")
        {:error, {:already_started, pid}}
      error -> 
        Logger.error("Failed to start timer manager for draft #{draft_id}: #{inspect(error)}")
        error
    end
  end

  @doc """
  Stops the timer manager for a specific draft.
  """
  def stop_timer_for_draft(draft_id) when is_binary(draft_id) do
    Logger.info("Stopping timer manager for draft: #{draft_id}")
    
    case Registry.lookup(PredecessorDraft.TimerRegistry, draft_id) do
      [{pid, _}] ->
        DynamicSupervisor.terminate_child(__MODULE__, pid)
      [] ->
        Logger.warn("No timer manager found for draft #{draft_id}")
        {:error, :not_found}
    end
  end

  @doc """
  Lists all active timer managers.
  """
  def list_active_timers do
    DynamicSupervisor.which_children(__MODULE__)
    |> Enum.map(fn {_, pid, _, _} -> pid end)
    |> Enum.filter(&is_pid/1)
  end

  @doc """
  Gets the count of active timer managers.
  """
  def active_timer_count do
    DynamicSupervisor.count_children(__MODULE__).active
  end
end