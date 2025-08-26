defmodule PredecessorDraftWeb.Components.HeroGrid do
  @moduledoc """
  Hero selection grid component for pick/ban phase
  """
  use Phoenix.LiveComponent
  
  
  # Static hero list - prioritizes local web server images first
  @static_heroes [
    # Carry Role
    %{id: "drongo", name: "Drongo", role: "Carry", image: "/images/heroes/portraits/drongo.jpg"},
    %{id: "grim_exe", name: "GRIM.exe", role: "Carry", image: "/images/heroes/portraits/grim_exe.jpg"},
    %{id: "murdock", name: "Murdock", role: "Carry", image: "/images/heroes/portraits/murdock.jpg"},
    %{id: "revenant", name: "Revenant", role: "Carry", image: "/images/heroes/portraits/revenant.jpg"},
    %{id: "sparrow", name: "Sparrow", role: "Carry", image: "/images/heroes/portraits/sparrow.jpg"},
    %{id: "twinblast", name: "TwinBlast", role: "Carry", image: "/images/heroes/portraits/twinblast.jpg"},
    %{id: "kira", name: "Kira", role: "Carry", image: "/images/heroes/portraits/kira.jpg"},
    
    # Support Role  
    %{id: "dekker", name: "Dekker", role: "Support", image: "/images/heroes/portraits/dekker.jpg"},
    %{id: "the_fey", name: "The Fey", role: "Support", image: "/images/heroes/portraits/the_fey.jpg"},
    %{id: "muriel", name: "Muriel", role: "Support", image: "/images/heroes/portraits/muriel.jpg"},
    %{id: "narbash", name: "Narbash", role: "Support", image: "/images/heroes/portraits/narbash.jpg"},
    %{id: "phase", name: "Phase", role: "Support", image: "/images/heroes/portraits/phase.jpg"},
    %{id: "riktor", name: "Riktor", role: "Support", image: "/images/heroes/portraits/riktor.jpg"},
    
    # Midlane Role
    %{id: "lt_belica", name: "Lt. Belica", role: "Midlane", image: "/images/heroes/portraits/lt_belica.jpg"},
    %{id: "countess", name: "Countess", role: "Midlane", image: "/images/heroes/portraits/countess.jpg"},
    %{id: "gadget", name: "Gadget", role: "Midlane", image: "/images/heroes/portraits/gadget.jpg"},
    %{id: "gideon", name: "Gideon", role: "Midlane", image: "/images/heroes/portraits/gideon.jpg"},
    %{id: "howitzer", name: "Howitzer", role: "Midlane", image: "/images/heroes/portraits/howitzer.jpg"},
    %{id: "morigesh", name: "Morigesh", role: "Midlane", image: "/images/heroes/portraits/morigesh.jpg"},
    %{id: "shinbi", name: "Shinbi", role: "Midlane", image: "/images/heroes/portraits/shinbi.jpg"},
    %{id: "argus", name: "Argus", role: "Midlane", image: "/images/heroes/portraits/argus.jpg"},
    
    # Offlane Role
    %{id: "aurora", name: "Aurora", role: "Offlane", image: "/images/heroes/portraits/aurora.jpg"},
    %{id: "crunch", name: "Crunch", role: "Offlane", image: "/images/heroes/portraits/crunch.jpg"},
    %{id: "feng_mao", name: "Feng Mao", role: "Offlane", image: "/images/heroes/portraits/feng_mao.jpg"},
    %{id: "greystone", name: "Greystone", role: "Offlane", image: "/images/heroes/portraits/greystone.jpg"},
    %{id: "iggy_scorch", name: "Iggy & Scorch", role: "Offlane", image: "/images/heroes/portraits/iggy_scorch.jpg"},
    %{id: "kwang", name: "Kwang", role: "Offlane", image: "/images/heroes/portraits/kwang.jpg"},
    %{id: "serath", name: "Serath", role: "Offlane", image: "/images/heroes/portraits/serath.jpg"},
    %{id: "sevarog", name: "Sevarog", role: "Offlane", image: "/images/heroes/portraits/sevarog.jpg"},
    %{id: "steel", name: "Steel", role: "Offlane", image: "/images/heroes/portraits/steel.jpg"},
    %{id: "terra", name: "Terra", role: "Offlane", image: "/images/heroes/portraits/terra.jpg"},
    %{id: "wukong", name: "Wukong", role: "Offlane", image: "/images/heroes/portraits/wukong.jpg"},
    %{id: "zarus", name: "Zarus", role: "Offlane", image: "/images/heroes/portraits/zarus.jpg"},
    
    # Jungle Role
    %{id: "grux", name: "Grux", role: "Jungle", image: "/images/heroes/portraits/grux.jpg"},
    %{id: "kallari", name: "Kallari", role: "Jungle", image: "/images/heroes/portraits/kallari.jpg"},
    %{id: "khaimera", name: "Khaimera", role: "Jungle", image: "/images/heroes/portraits/khaimera.jpg"},
    %{id: "rampage", name: "Rampage", role: "Jungle", image: "/images/heroes/portraits/rampage.jpg"}
  ]
  
  # Cache API results using ETS with safe table access
  def heroes do
    # Ensure ETS table exists before any operation
    ensure_hero_cache_table()
    
    case safe_ets_lookup(:hero_cache, :api_heroes) do
      [{:api_heroes, heroes, timestamp}] ->
        # Use cached data if less than 5 minutes old
        if :erlang.system_time(:millisecond) - timestamp < 300_000 do
          heroes
        else
          fetch_and_cache_heroes()
        end
      _ ->
        fetch_and_cache_heroes()
    end
  end

  defp fetch_and_cache_heroes do
    case get_heroes_from_api() do
      nil -> 
        @static_heroes
      heroes ->
        # Ensure ETS table exists and cache the results
        ensure_hero_cache_table()
        safe_ets_insert(:hero_cache, {:api_heroes, heroes, :erlang.system_time(:millisecond)})
        heroes
    end
  end
  
  defp ensure_hero_cache_table do
    case :ets.whereis(:hero_cache) do
      :undefined -> 
        :ets.new(:hero_cache, [:named_table, :public, :set])
      _ -> 
        :ok
    end
  end
  
  defp safe_ets_lookup(table, key) do
    try do
      :ets.lookup(table, key)
    rescue
      ArgumentError -> []
    end
  end
  
  defp safe_ets_insert(table, data) do
    try do
      :ets.insert(table, data)
    rescue
      ArgumentError -> false
    end
  end
  
  # Function to fetch heroes from Omeda City API and map to our roles
  defp get_heroes_from_api do
    # Omeda City role mapping to our role names
    role_mapping = %{
      "Carry" => "Carry",
      "Support" => "Support", 
      "Midlane" => "Midlane",
      "Offlane" => "Offlane",
      "Jungle" => "Jungle"
    }
    
    try do
      case HTTPoison.get("https://omeda.city/heroes.json", [], timeout: 5000, recv_timeout: 5000) do
        {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
          case Jason.decode(body) do
            {:ok, heroes_data} ->
              heroes_data
              |> Enum.map(fn hero ->
                # Get all valid roles for this hero and combine them
                valid_roles = hero["roles"]
                |> Enum.filter(&Map.has_key?(role_mapping, &1))
                |> Enum.map(&role_mapping[&1])
                
                # Join roles with "/"
                combined_roles = Enum.join(valid_roles, "/")
                
                hero_id = String.downcase(hero["display_name"]) |> String.replace(~r/[^a-z0-9]/, "_") |> String.replace(~r/_+/, "_") |> String.trim("_")
                
                %{
                  id: hero_id,
                  name: hero["display_name"],
                  role: combined_roles,
                  image: "/images/heroes/portraits/#{hero_id}.jpg",
                  api_image: "https://omeda.city" <> hero["image"]
                }
              end)
              |> Enum.filter(fn hero -> hero.role != "" end)
            {:error, _} -> nil
          end
        {:error, _} -> nil
      end
    rescue
      _ -> nil
    end
  end
  
  # Banner functionality for spectator views
  def get_random_hero_banner(hero_id) do
    # Hardcoded hero banner mappings to avoid filesystem access in production
    hero_banners = %{
      "aurora" => ["Banner_Aurora_Default.png", "Aurora_GlacialEmpress.png"],
      "argus" => ["Banner_Emerald_Default.png", "Emerald Warlord .png", "Emerald Winter .png"],
      "boris" => ["Banner_Boris_Default.png", "Banner_Boris_ShadowOps_Blue.png", "Boris Shadow Ops .png"],
      "countess" => ["Banner_Countess_Demon.png", "Banner_Countess_Hunt.png", "Countess_Login.png"],
      "crunch" => ["Banner_Crunch_Boxer.png", "Banner_Crunch_Default.png"],
      "dekker" => ["Banner_Dekker_Default.png", "Winter Dekker.png"],
      "drongo" => ["Banner_Drongo_Default.png"],
      "feng_mao" => ["Banner_FengMao_Default.png", "Feng Mao Undertow .png"],
      "gadget" => ["Banner_Gadget_Default.png"],
      "gideon" => ["Banner_Gideon_Default.png", "Gideon Undertow .png"],
      "greystone" => ["Banner_Greystone_ShadowOps.png", "Default_Greystone.png", "Greystone_Halloween.png"],
      "grim_exe" => ["Banner_GrimEXE_Default.png"],
      "grux" => ["Banner_Grux_Default.png", "Scarab Grux .png"],
      "howitzer" => ["Banner_Howitzer_Default.png", "Howi Odyssey .png"],
      "iggy_scorch" => ["Banner_Iggy_Default.png", "Banner_Iggy_Phoenix.png", "Iggy Mecha Terror .png"],
      "kallari" => ["Banner_Kallari_Default.png", "Rogue Kallari .png"],
      "khaimera" => ["Banner_Khaimera_Default.png", "Banner_Khaimera_Demon.png", "Khaimera Wasteland .png"],
      "kira" => ["Banner_Huntress_Default.png", "Default_Kira.png", "Huntress Halloween .png"],
      "kwang" => ["Banner_Kwang_Default.png", "Banner_Kwang_Rogue.png"],
      "lt_belica" => ["Banner_LtBelica_Default.png", "Lt Belica Cyberpunk .png", "Lt Belica Polar Strike .png"],
      "morigesh" => ["Default_Hero_Morigesh.png", "Default_Morigesh_Swamp.png", "Morigesh_Login.png"],
      "mourn" => ["Banner_Wood_Default.png", "Wood Purple Alien.png"],
      "murdock" => ["Banner_Murdock_Default.png", "Murdock Shogun .png"],
      "muriel" => ["Banner_Muriel_Cyber_Angel.png", "Banner_Muriel_Default.png"],
      "narbash" => ["Banner_Narbash_Summer_Red.png", "Default_Hero_Narbash.png", "Narbash_Login.png"],
      "phase" => ["Banner_Phase_Default.png"],
      "rampage" => ["T_Banner_Rampage_Default.png"],
      "renna" => ["Banner_Bright_Alternate.png", "LoadingScreen_Renna.png", "T_Banner_Renna_Default.png"],
      "revenant" => ["Banner_Revenant_Default.png", "Winterfest Frost King 01.png"],
      "riktor" => ["Banner_Riktor_Default.png", "Riktor Undertow .png"],
      "serath" => ["Banner_Serath_Default.png", "Banner_Serath_ShadowOps.png", "Default_Serath.png"],
      "sevarog" => ["Banner_Sevarog_Default.png", "Sevarog Angel .png"],
      "shinbi" => ["Banner_Shinbi_Default.png", "Banner_Shinbi_Prime.png", "Default_Shinbi.png"],
      "skylar" => ["Banner_Boost_Default.png", "Banner_Boost_Alien.png", "Banner_Boost_Convict.png"],
      "sparrow" => ["Banner_Sparrow_Default.png", "Banner_Sparrow_ZechinHuntress.png", "Rogue Sparrow .png"],
      "steel" => ["Banner_Steel_Default.png", "Steel Doomsday .png", "Steel Galactic Raider .png"],
      "terra" => ["Banner_Terra_Default.png", "Terra Gryphon Knight .png"],
      "the_fey" => ["Default_Hero_The_Fey.png"],
      "twinblast" => ["Banner_Twinblast_ShadowOps_Red.png", "Default_Hero_TwinBlast.png", "TwinBlast_Login.png"],
      "wraith" => ["Banner_Wraith_Default.png", "Banner_Wraith_Rogue.png"],
      "wukong" => ["Banner_Wukong_Default.png", "Banner_Wukong_ShadowOps.png"],
      "yin" => ["Banner_Yin_Default.png", "Banner_Yin_Bunny.png", "Banner_Yin_ShadowOps.png"],
      "yurei" => ["Banner_Yurei.png", "Banner_Yurei_Neon.png", "Banner_Tidebinder_Demon.png"],
      "yuri" => ["Banner_Yurei.png", "Banner_Yurei_Neon.png", "Banner_Tidebinder_Demon.png"],
      "zarus" => ["Banner_Lizard_Default.png", "Banner_Zarus_Demon.png", "Zarus Warlord Cbt.png"],
      "zinx" => ["Banner_Zinx_Default.png", "Zinx Starqueen.png"]
    }
    
    case Map.get(hero_banners, hero_id) do
      nil -> get_random_misc_banner() # Fallback to misc banner if hero not found
      banners -> 
        random_banner = Enum.random(banners)
        "/images/heroes/banners/#{hero_id}/#{random_banner}"
    end
  end
  
  def get_random_misc_banner do
    # Hardcoded list of misc banners to avoid filesystem access issues in production
    misc_banners = [
      "MainBackground.png",
      "EdSplash.png", 
      "LoadingScreen_Arena.png",
      "LoadingScreen_Legacy.png",
      "LoadingScreen_Practice.png",
      "LoadingScreen_Twilight_Dawn.png",
      "LoadingScreen_Twilight_Dusk.png",
      "Tecntacles.png",
      "Winterfest 2024.png",
      "GamemodePanel_Legacy_PopupBackground.png",
      "Banner Community Helper Black.png",
      "Banner Community Helper Blue.png",
      "Banner Community Helper Gold.png",
      "Banner Community Helper Orange.png",
      "Banner Community Helper Purple.png",
      "Banner Community Helper White.png",
      "Creator Bronze.png",
      "Creator Gold.png",
      "Creator Silver.png"
    ]
    
    random_banner = Enum.random(misc_banners)
    "/images/misc_banners/#{random_banner}"
  end
  
  @impl true
  def mount(socket) do
    # Don't set default role_filter here - let parent control it
    {:ok, socket}
  end
  
  @impl true
  def update(assigns, socket) do
    # Handle all the assigns passed from the parent
    {:ok, assign(socket, assigns)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="hero-grid-wrapper" style="display: flex; flex-direction: column; height: 100%; width: 100%;">
      <div class="hero-filters" style="display: flex; gap: 8px; margin-bottom: 12px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; flex-shrink: 0;">
        <button 
          phx-click="filter_role" 
          phx-value-role="all"
          class={["filter-btn", @role_filter == "all" && "active"]}
          style={"padding: 6px 12px; border-radius: 4px; border: none; font-size: 12px; cursor: pointer; #{if @role_filter == "all", do: "background: #5865f2; color: white;", else: "background: #4a5568; color: #d1d5db;"}"}
        >
          All
        </button>
        <button 
          phx-click="filter_role" 
          phx-value-role="Carry"
          class={["filter-btn", @role_filter == "Carry" && "active"]}
          style={"padding: 6px 12px; border-radius: 4px; border: none; font-size: 12px; cursor: pointer; #{if @role_filter == "Carry", do: "background: #5865f2; color: white;", else: "background: #4a5568; color: #d1d5db;"}"}
        >
          Carry
        </button>
        <button 
          phx-click="filter_role" 
          phx-value-role="Support"
          class={["filter-btn", @role_filter == "Support" && "active"]}
          style={"padding: 6px 12px; border-radius: 4px; border: none; font-size: 12px; cursor: pointer; #{if @role_filter == "Support", do: "background: #5865f2; color: white;", else: "background: #4a5568; color: #d1d5db;"}"}
        >
          Support
        </button>
        <button 
          phx-click="filter_role" 
          phx-value-role="Midlane"
          class={["filter-btn", @role_filter == "Midlane" && "active"]}
          style={"padding: 6px 12px; border-radius: 4px; border: none; font-size: 12px; cursor: pointer; #{if @role_filter == "Midlane", do: "background: #5865f2; color: white;", else: "background: #4a5568; color: #d1d5db;"}"}
        >
          Midlane
        </button>
        <button 
          phx-click="filter_role" 
          phx-value-role="Offlane"
          class={["filter-btn", @role_filter == "Offlane" && "active"]}
          style={"padding: 6px 12px; border-radius: 4px; border: none; font-size: 12px; cursor: pointer; #{if @role_filter == "Offlane", do: "background: #5865f2; color: white;", else: "background: #4a5568; color: #d1d5db;"}"}
        >
          Offlane
        </button>
        <button 
          phx-click="filter_role" 
          phx-value-role="Jungle"
          class={["filter-btn", @role_filter == "Jungle" && "active"]}
          style={"padding: 6px 12px; border-radius: 4px; border: none; font-size: 12px; cursor: pointer; #{if @role_filter == "Jungle", do: "background: #5865f2; color: white;", else: "background: #4a5568; color: #d1d5db;"}"}
        >
          Jungle
        </button>
      </div>
      
      <div style="display: grid !important; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)) !important; grid-auto-rows: 102px !important; gap: 2px !important; padding: 8px !important; flex: 1 !important; overflow-y: auto !important; height: 100% !important;">
        <%= for hero <- filter_heroes(heroes(), @role_filter, @picks, @bans) do %>
          <div 
            class={["hero-card", get_hero_status(hero, @picks, @bans), (@can_select && "selectable")]}
            phx-click={@can_select && "select_hero"}
            phx-target={@parent_target}
            phx-value-hero={hero.id}
            style="background: #2f3136; border-radius: 6px; padding: 0; text-align: center; height: 102px; border: 1px solid #4a5568; transition: all 0.2s ease; cursor: pointer; position: relative; overflow: hidden;"
          >
            <div class="hero-avatar" style={"width: 100%; height: 100%; border-radius: 6px; margin: 0; border: 2px solid #{role_border_color(hero.role)}; background: linear-gradient(135deg, #{hero_gradient_colors(hero.role)}); background-size: cover; background-position: center; position: absolute; top: 0; left: 0; overflow: hidden; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;"}>
              <!-- Hero image with fallback to gradient and initials -->
              <img 
                src={hero.image} 
                alt={hero.name}
                style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; position: absolute; top: 0; left: 0; z-index: 1;"
                onerror={"this.src='#{Map.get(hero, :api_image, hero.image)}'; this.onerror=function(){this.style.display='none';};"}
              />
              <%= if hero_picked?(hero, @picks) do %>
                <div style="position: absolute; inset: 0; background: rgba(34, 197, 94, 0.8); z-index: 3;"></div>
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 4;">
                  <span style="color: white; font-weight: bold; font-size: 16px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">✓</span>
                </div>
              <% end %>
              <%= if hero_banned?(hero, @bans) do %>
                <div style="position: absolute; inset: 0; background: rgba(239, 68, 68, 0.8); z-index: 3;"></div>
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 4;">
                  <span style="color: white; font-weight: bold; font-size: 18px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">✕</span>
                </div>
              <% end %>
            </div>
            <!-- Hero name and role overlay -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 8px 4px 4px; z-index: 2;">
              <%= if hero_picked?(hero, @picks) do %>
                <div style="background: #22c55e; color: white; font-size: 8px; padding: 1px 3px; border-radius: 2px; margin-bottom: 2px; display: inline-block;">PICKED</div>
              <% end %>
              <%= if hero_banned?(hero, @bans) do %>
                <div style="background: #ef4444; color: white; font-size: 8px; padding: 1px 3px; border-radius: 2px; margin-bottom: 2px; display: inline-block;">BANNED</div>
              <% end %>
              <div class="hero-name" style="color: white; font-size: 10px; font-weight: bold; margin-bottom: 1px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);"><%= hero.name %></div>
              <div class="hero-role" style="color: #d1d5db; font-size: 8px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);"><%= hero.role %></div>
            </div>
          </div>
        <% end %>
      </div>
    </div>
    """
  end

  # Filter event is now handled by parent component
  
  defp filter_heroes(heroes, "all", _picks, _bans) do
    heroes
  end
  
  defp filter_heroes(heroes, role, _picks, _bans) do
    Enum.filter(heroes, fn hero -> 
      # Check if the hero's role contains the filter role (handles multi-role heroes like "Carry/Support")
      String.contains?(hero.role, role)
    end)
  end
  
  defp hero_picked?(hero, picks) do
    Enum.any?(picks, fn pick -> pick == hero.id end)
  end
  
  defp hero_banned?(hero, bans) do
    Enum.any?(bans, fn ban -> ban == hero.id end)
  end
  
  defp get_hero_status(hero, picks, bans) do
    cond do
      hero_picked?(hero, picks) -> "picked"
      hero_banned?(hero, bans) -> "banned"
      true -> "available"
    end
  end
  
  defp hero_gradient_colors(role) do
    case role do
      "Carry" -> "#e74c3c 0%, #c0392b 100%"      # Red tones
      "Support" -> "#3498db 0%, #2980b9 100%"    # Blue tones  
      "Midlane" -> "#9b59b6 0%, #8e44ad 100%"    # Purple tones
      "Offlane" -> "#f39c12 0%, #e67e22 100%"    # Orange tones
      "Jungle" -> "#27ae60 0%, #229954 100%"     # Green tones
      _ -> "#667eea 0%, #764ba2 100%"            # Default gradient
    end
  end
  
  defp role_border_color(role) do
    case role do
      "Carry" -> "#c0392b"      # Dark red
      "Support" -> "#2980b9"    # Dark blue  
      "Midlane" -> "#8e44ad"    # Dark purple
      "Offlane" -> "#e67e22"    # Dark orange
      "Jungle" -> "#229954"     # Dark green
      _ -> "#764ba2"            # Default
    end
  end

end