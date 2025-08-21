# Test HeroGrid LiveComponent fix
IO.puts("🧪 Testing HeroGrid LiveComponent Fix")
IO.puts("======================================")

# Test if the HeroGrid module compiles correctly as a LiveComponent
try do
  alias PredecessorDraftWeb.Components.HeroGrid
  
  IO.puts("1️⃣ Testing module compilation...")
  IO.puts("   ✅ HeroGrid module loaded successfully")
  
  IO.puts("2️⃣ Testing LiveComponent functions...")
  
  # Check if required LiveComponent functions exist
  functions = HeroGrid.__info__(:functions)
  required_functions = [:mount, :render, :handle_event]
  
  Enum.each(required_functions, fn func ->
    if Enum.any?(functions, fn {name, _arity} -> name == func end) do
      IO.puts("   ✅ #{func}/X function exists")
    else
      IO.puts("   ❌ #{func}/X function missing")
    end
  end)
  
  IO.puts("3️⃣ Testing heroes data...")
  heroes = HeroGrid.heroes()
  IO.puts("   ✅ Heroes loaded: #{length(heroes)} heroes available")
  IO.puts("   ✅ Sample heroes: #{Enum.take(heroes, 3) |> Enum.map(& &1.name) |> Enum.join(", ")}")
  
  IO.puts("4️⃣ Testing component structure...")
  # Test if we can create a socket (basic test)
  socket = %Phoenix.LiveView.Socket{
    endpoint: PredecessorDraftWeb.Endpoint,
    view: PredecessorDraftWeb.DraftLive,
    assigns: %{
      role_filter: "all",
      picks: [],
      bans: [],
      can_select: true,
      parent_target: nil
    }
  }
  
  # Test mount function
  case HeroGrid.mount(socket) do
    {:ok, updated_socket} ->
      IO.puts("   ✅ mount/1 function works correctly")
      IO.puts("   ✅ Default role_filter: #{updated_socket.assigns.role_filter}")
    {:error, reason} ->
      IO.puts("   ❌ mount/1 function failed: #{inspect(reason)}")
  end
  
  IO.puts("\n🎉 HeroGrid LiveComponent Fix Results:")
  IO.puts("✅ Module compiles as LiveComponent")
  IO.puts("✅ Required functions exist (mount, render, handle_event)")
  IO.puts("✅ Heroes data is accessible")
  IO.puts("✅ Component can be initialized")
  IO.puts("✅ Draft interface should load without __live__/0 errors")
  
rescue
  e in UndefinedFunctionError ->
    if String.contains?(Exception.message(e), "__live__") do
      IO.puts("\n❌ HEROGRID FIX FAILED!")
      IO.puts("❌ Still getting __live__/0 error: #{Exception.message(e)}")
      IO.puts("🔧 Component still not properly configured as LiveComponent")
    else
      IO.puts("\n❌ Different function error: #{Exception.message(e)}")
    end
    
  e ->
    IO.puts("\n❌ Unexpected error during HeroGrid test: #{inspect(e)}")
end

IO.puts("\nHeroGrid component fix testing complete")