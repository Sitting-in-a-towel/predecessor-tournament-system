defmodule PredecessorDraft.Logger do
  @moduledoc """
  Custom logger for the Phoenix Draft system that writes to both console and files.
  Helps with troubleshooting by creating persistent log files.
  """
  
  require Logger
  
  @log_dir "H:\\Project Folder\\Predecessor website\\logs"
  @phoenix_log_file Path.join(@log_dir, "phoenix_draft.log")
  @pubsub_log_file Path.join(@log_dir, "pubsub_events.log")
  @error_log_file Path.join(@log_dir, "system_errors.log")
  
  def setup do
    # Ensure log directory exists
    File.mkdir_p!(@log_dir)
    
    # Initialize log files
    write_to_file(@phoenix_log_file, "[#{timestamp()}] [PHOENIX] [INFO] [SYSTEM] Phoenix Draft Logger initialized\n")
    write_to_file(@pubsub_log_file, "[#{timestamp()}] [PUBSUB] [INFO] [SYSTEM] PubSub Event Logger initialized\n")
    write_to_file(@error_log_file, "[#{timestamp()}] [SYSTEM] [INFO] [INIT] Error Logger initialized\n")
  end
  
  # General Phoenix logging
  def log(level, component, message, extra_data \\ %{}) do
    log_entry = format_log_entry("PHOENIX", level, component, message, extra_data)
    
    # Write to console (existing behavior)
    case level do
      :info -> Logger.info(message)
      :warn -> Logger.warning(message)
      :error -> Logger.error(message)
      :debug -> Logger.debug(message)
    end
    
    # Write to file
    write_to_file(@phoenix_log_file, log_entry)
    
    # Also write errors to system error log
    if level == :error do
      write_to_file(@error_log_file, log_entry)
    end
  end
  
  # Draft-specific logging
  def log_draft_event(draft_id, event, data \\ %{}) do
    message = "Draft #{draft_id}: #{event}"
    extra = Map.put(data, :draft_id, draft_id)
    log(:info, "DRAFT", message, extra)
  end
  
  # PubSub event logging
  def log_pubsub_event(topic, event, data \\ %{}) do
    message = "Topic #{topic}: #{event}"
    log_entry = format_log_entry("PUBSUB", :info, "BROADCAST", message, data)
    
    # Write to PubSub-specific log
    write_to_file(@pubsub_log_file, log_entry)
    
    # Also write to main Phoenix log
    write_to_file(@phoenix_log_file, log_entry)
  end
  
  # Timer event logging
  def log_timer_event(draft_id, event, timer_data \\ %{}) do
    message = "Timer #{draft_id}: #{event}"
    extra = Map.merge(timer_data, %{draft_id: draft_id})
    log(:info, "TIMER", message, extra)
  end
  
  # LiveView event logging
  def log_liveview_event(draft_id, event, socket_data \\ %{}) do
    message = "LiveView #{draft_id}: #{event}"
    extra = Map.merge(socket_data, %{draft_id: draft_id})
    log(:info, "LIVEVIEW", message, extra)
  end
  
  # Error logging with stack traces
  def log_error(component, error, stacktrace \\ nil) do
    message = "ERROR in #{component}: #{inspect(error)}"
    extra_data = %{
      error: inspect(error),
      stacktrace: if(stacktrace, do: Exception.format_stacktrace(stacktrace), else: nil)
    }
    
    log(:error, component, message, extra_data)
  end
  
  # Private helper functions
  
  defp format_log_entry(service, level, component, message, extra_data) do
    timestamp = timestamp()
    level_str = String.upcase(to_string(level))
    
    # Create structured JSON log entry for AI analysis
    log_entry = %{
      timestamp: timestamp,
      service: service,
      level: level_str,
      component: component,
      message: message,
      metadata: extra_data
    }
    
    # Human-readable format with JSON data
    json_str = Jason.encode!(log_entry)
    "#{json_str}\n"
  end
  
  defp write_to_file(file_path, content) do
    try do
      File.write!(file_path, content, [:append])
    rescue
      error ->
        Logger.error("Failed to write to log file #{file_path}: #{inspect(error)}")
    end
  end
  
  defp timestamp do
    DateTime.utc_now()
    |> DateTime.to_string()
    |> String.replace("Z", " UTC")
  end
end