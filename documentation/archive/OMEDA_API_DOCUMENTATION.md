# Omeda.city API Documentation

## Overview
Successfully connected to the Omeda.city API which provides comprehensive Predecessor game data including match statistics, hero information, and player data.

## Authentication
- **Required Header**: `Accept: application/json`
- **No API Key Required**: The API is currently open access
- **Rate Limiting**: No formal rate limits, but responsible usage is requested

## Available Endpoints

### ✅ Working Endpoints

#### 1. Hero Statistics
```
GET /dashboard/hero_statistics.json
```
**Parameters:**
- `hero_ids` (optional): Comma-separated list of hero IDs

**Response Structure:**
```json
{
  "hero_statistics": [
    {
      "hero_id": 14,
      "display_name": "Murdock",
      "match_count": 6086704.0,
      "winrate": 51.79966037448182,
      "winrate_mirrorless": 52.29547450815208,
      "pickrate": 52.15175880227966,
      "kills": 43351309,
      "deaths": 32339163,
      "assists": 34071839,
      "avg_kdar": 2.39,
      "avg_cs": 5.77,
      "avg_gold": 616.51,
      "avg_performance_score": 0.0,
      "avg_damage_dealt_to_heroes": 25926.95,
      "avg_damage_taken_from_heroes": 18329.41,
      "avg_game_duration": 1422.04
    }
  ]
}
```

#### 2. Match Data
```
GET /matches.json
```
**Parameters:**
- `cursor` (optional): Pagination cursor for next page

**Response Structure:**
```json
{
  "matches": [
    {
      "id": "41e46f53-92b9-4016-8b5a-abe731cbfd90",
      "start_time": "2022-12-01T07:58:44.000Z",
      "end_time": "2022-12-01T08:21:34.000Z",
      "game_duration": 1367,
      "game_region": null,
      "region": "",
      "winning_team": "dusk",
      "game_mode": "pvp",
      "players": [
        {
          "id": "c9b3320a-9893-4301-a1ef-a0c7ba865e15",
          "display_name": "unicod10",
          "flags": [],
          "team": "dusk",
          "hero_id": 21,
          "role": null,
          "minions_killed": 110,
          "lane_minions_killed": 92,
          "neutral_minions_killed": 18,
          "kills": 1,
          "deaths": 3,
          "assists": 11,
          "largest_killing_spree": 1,
          "largest_multi_kill": 1,
          "total_damage_dealt": 74729,
          "physical_damage_dealt": 21719,
          "magical_damage_dealt": 53009,
          "true_damage_dealt": 1,
          "total_damage_taken": 42503,
          "physical_damage_taken": 25464,
          "magical_damage_taken": 17039,
          "true_damage_taken": 0
        }
      ]
    }
  ],
  "cursor": "next_page_cursor_string"
}
```

#### 3. Heroes Information
```
GET /heroes.json
```
**Response Structure:**
```json
[
  {
    "id": 49,
    "game_id": null,
    "name": "Emerald",
    "display_name": "Argus",
    "image": "/images/heroes/Emerald.webp",
    "stats": [10, 2, 1, 1],
    "classes": ["Mage", "Catcher"],
    "roles": ["Midlane", "Support"],
    "abilities": [
      {
        "display_name": "Arcrune Conduit",
        "image": "/images/abilities/Emerald/FluxBolt.webp",
        "game_description": "Ranged Basic Attack...",
        "menu_description": "Ranged basic attack...",
        "cooldown": [],
        "cost": [],
        "key": "LMB"
      }
    ],
    "base_stats": {
      "health": 580,
      "mana": 425,
      "physical_damage": 55,
      "magical_damage": 0,
      "armor": 20,
      "magical_resistance": 30,
      "attack_speed": 100,
      "crit_chance": 0,
      "movement_speed": 650
    }
  }
]
```

#### 4. Individual Match by ID
```
GET /matches/{match_id}.json
```
Returns detailed match data for a specific match UUID.

#### 5. Individual Player by ID
```
GET /players/{player_id}.json
```
Returns detailed player data for a specific player UUID.

### ❌ Endpoints Not Available
- `/api/*` - Standard API paths don't exist
- `/leaderboards.json` - Returns 404
- `/dashboard.json` - Returns 406 (Not Acceptable)

## Data Types Available

### Match Data
- **Match IDs**: UUID format (e.g., "41e46f53-92b9-4016-8b5a-abe731cbfd90")
- **Teams**: "dawn" and "dusk"
- **Game Modes**: "pvp" (others may exist)
- **Timestamps**: ISO 8601 format
- **Player Performance**: KDA, CS, damage dealt/taken, gold, etc.

### Hero Data
- **44 Heroes Available** (as of testing)
- **Roles**: Carry, Midlane, Jungle, Offlane, Support
- **Classes**: Mage, Fighter, Assassin, Tank, etc.
- **Complete ability information** with descriptions and images
- **Base stats** for all heroes

### Statistics
- **Win rates** (including mirrorless)
- **Pick rates** 
- **Average performance metrics** (KDA, CS, gold, damage)
- **Match counts** for statistical significance

## Tournament Integration Possibilities

### ✅ What You Can Do
1. **Track Player Performance**: Search matches by player names
2. **Hero Meta Analysis**: Get current pick/win rates for tournament planning
3. **Match History**: Analyze recent matches for team research
4. **Hero Information**: Complete hero data for draft analysis
5. **Statistical Analysis**: Comprehensive performance metrics

### 🔧 Potential Tournament Features
1. **Player Verification**: Check if registered players exist in the system
2. **Performance Analytics**: Pre-tournament player analysis
3. **Meta Reports**: Current hero strength analysis for tournaments
4. **Match Tracking**: Post-tournament match analysis
5. **Team Research**: Opposition research using match history

### ⚠️ Limitations
1. **No Real-time Data**: Match data appears to be historical
2. **No Tournament-specific Features**: General game data only
3. **Player Search**: Requires exact display names, no fuzzy matching
4. **Rate Limiting**: No formal limits but should use responsibly

## Python Wrapper Usage

The `omeda_api.py` file provides a complete wrapper class with methods for:
- `get_hero_statistics()` - Hero performance data
- `get_matches()` - Recent match data with pagination
- `get_heroes()` - Complete hero information
- `get_match_by_id()` - Specific match details
- `get_player_by_id()` - Player information
- `search_recent_matches_by_player_name()` - Find player matches
- `get_match_summary()` - Formatted match summary

## Example Integration for Tournament Bot

```python
from omeda_api import OmedaAPI

api = OmedaAPI()

# Check if a registered player exists in recent matches
player_matches = api.search_recent_matches_by_player_name("PlayerName", max_matches=100)

# Get current meta for tournament planning
hero_stats = api.get_hero_statistics()
top_picks = sorted(hero_stats['hero_statistics'], key=lambda x: x['pickrate'], reverse=True)[:10]

# Analyze team composition trends
heroes = api.get_heroes()
role_distribution = {}
for hero in heroes:
    for role in hero['roles']:
        role_distribution[role] = role_distribution.get(role, 0) + 1
```

This API provides excellent data for tournament organization, player verification, and competitive analysis!