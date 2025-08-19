defmodule PredecessorDraftWeb.Telemetry do
  use Supervisor
  import Telemetry.Metrics

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    children = [
      # Telemetry poller will execute the given period measurements
      # every 10_000ms. Learn more here: https://hexdocs.pm/telemetry_metrics
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
      # Add reporters as children of your supervision tree.
      # {Telemetry.Metrics.ConsoleReporter, metrics: metrics()}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  def metrics do
    [
      # Phoenix Metrics
      summary("phoenix.endpoint.stop.duration",
        unit: {:native, :millisecond}
      ),
      summary("phoenix.router.dispatch.stop.duration",
        tags: [:route],
        unit: {:native, :millisecond}
      ),

      # LiveView Metrics
      summary("phoenix.live_view.mount.stop.duration",
        unit: {:native, :millisecond}
      ),
      summary("phoenix.live_view.handle_event.stop.duration",
        unit: {:native, :millisecond}
      ),
      summary("phoenix.live_view.handle_params.stop.duration",
        unit: {:native, :millisecond}
      ),

      # Database Metrics
      summary("predecessor_draft.repo.query.total_time",
        unit: {:native, :millisecond}
      ),
      summary("predecessor_draft.repo.query.decode_time",
        unit: {:native, :millisecond}
      ),
      summary("predecessor_draft.repo.query.query_time",
        unit: {:native, :millisecond}
      ),
      summary("predecessor_draft.repo.query.queue_time",
        unit: {:native, :millisecond}
      ),
      summary("predecessor_draft.repo.query.idle_time",
        unit: {:native, :millisecond}
      ),

      # VM Metrics
      summary("vm.memory.total", unit: {:byte, :kilobyte}),
      summary("vm.total_run_queue_lengths.total"),
      summary("vm.total_run_queue_lengths.cpu"),
      summary("vm.total_run_queue_lengths.io"),

      # Draft-specific Metrics
      counter("draft.coin_toss.attempts"),
      counter("draft.websocket.connections"),
      summary("draft.presence.update.duration",
        unit: {:native, :millisecond}
      ),
      counter("draft.sessions.active"),
      counter("draft.sessions.completed")
    ]
  end

  defp periodic_measurements do
    [
      # A module, function and arguments to be invoked periodically.
      # This function must call :telemetry.execute/3 and a metric must be added above.
      # {PredecessorDraftWeb, :count_users, []}
    ]
  end
end