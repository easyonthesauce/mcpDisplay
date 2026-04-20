# n8n Integration Guide

This kiosk display server exposes an **HTTP MCP streaming interface** so n8n can control it with standard HTTP requests.

## Setup

1. Ensure the kiosk server is running:
   ```bash
   npm start
   ```

2. The server will be available at `http://localhost:8787`

## HTTP MCP Endpoints

### List available tools

```
GET /mcp/tools
```

Returns JSON array of all available tool names and descriptions.

### Invoke a tool (JSON response)

```
POST /mcp/call
Content-Type: application/json

{
  "tool": "<tool_name>",
  "arguments": { /* tool-specific arguments */ }
}
```

### Invoke a tool (Server-Sent Events)

```
POST /mcp/stream
Content-Type: application/json

{
  "tool": "<tool_name>",
  "arguments": { /* tool-specific arguments */ }
}
```

## n8n Workflow Example

### 1. Add an HTTP node

- **Method:** POST
- **URL:** `http://localhost:8787/mcp/call`
- **Header:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "tool": "kiosk_show_chores",
    "arguments": {
      "dueToday": ["Dishes", "Homework"],
      "done": ["Laundry"],
      "points": ["Alice: 15 pts", "Bob: 8 pts"],
      "theme": "party"
    }
  }
  ```

### 2. Parse response

The response will be:
```json
{
  "ok": true,
  "message": "Chore dashboard rendered",
  "state": { /* full kiosk state */ }
}
```

## Example n8n node configurations

### Chore Board Update

```json
{
  "tool": "kiosk_show_chores",
  "arguments": {
    "dueToday": ["{{ $node.\"Parse Chores\".json.tasks }}"],
    "done": ["{{ $node.\"Parse Chores\".json.completed }}"],
    "points": ["{{ $node.\"Parse Chores\".json.points }}"],
    "theme": "party",
    "autoAdvance": true,
    "autoAdvanceSec": 20
  }
}
```

### Calendar Display

```json
{
  "tool": "kiosk_show_calendar",
  "arguments": {
    "dayLabel": "Today",
    "now": "{{ $node.\"Get Calendar\".json.current_event }}",
    "next": "{{ $node.\"Get Calendar\".json.next_event }}",
    "highlight": "Stay hydrated!",
    "events": "{{ $node.\"Get Calendar\".json.events }}",
    "theme": "ocean"
  }
}
```

### Emergency Announcement

```json
{
  "tool": "kiosk_announce",
  "arguments": {
    "message": "Team meeting in 5 minutes!",
    "details": ["Conference room B", "Bring your notes"],
    "emoji": "⏰",
    "showOverlay": true,
    "theme": "party"
  }
}
```

## Tool Reference

See [README.md](./README.md) for full tool parameter documentation.

### Quick tool list:

- `kiosk_get_status` — Get current state
- `kiosk_set_playlist` — Raw scene control
- `kiosk_show_scene` / `kiosk_next_scene` / `kiosk_previous_scene`
- `kiosk_set_overlay` — Show alert overlay
- `kiosk_set_theme` — Change visual theme
- `kiosk_reset_defaults` — Reset to default scenes
- `kiosk_show_calendar` — Family calendar dashboard
- `kiosk_show_chores` — Chore board
- `kiosk_show_meal_plan` — Meal planner
- `kiosk_show_school_run` — School run readiness
- `kiosk_announce` — Family announcement

## Tips

- Use `autoAdvance: false` for announcements so they don't auto-rotate
- Use `showOverlay: true` with announcements for attention-grabbing displays
- Combine multiple tool calls in n8n to sequence different screens
- Use n8n's scheduling to update displays on a routine (e.g., show chores every morning)
