# MCP Family Kiosk Display

A polished, animated kiosk display that can be controlled by an LLM through MCP tool calls.

## What this provides

- MCP server over stdio with kiosk control tools
- HTTP kiosk display endpoint at `http://localhost:8787`
- Real-time updates via WebSocket (`/ws`)
- Large readable typography and smooth animated transitions
- Support for mixed scene elements: text, images, and videos
- Overlay announcements for urgent family updates
- Auto-advancing playlist mode for unattended display rotation

## MCP integrations

The server supports **two MCP transports**:

1. **Stdio (default)** — for LLM clients that use stdio-based MCP
2. **HTTP streaming** — for tools like n8n, Zapier, or custom integrations

### Stdio transport

Standard MCP over stdin/stdout. Used by most LLM clients as a subprocess.

### HTTP streaming transport

call MCP tools from n8n or any HTTP client.

- `GET /mcp/tools` — list all available tools
- `POST /mcp/call` — invoke a tool (JSON response)
- `POST /mcp/stream` — invoke a tool (Server-Sent Events response)

#### Example: n8n HTTP POST to `/mcp/call`

```json
{
  "tool": "kiosk_show_chores",
  "arguments": {
    "dueToday": ["Dishes", "Homework", "Vacuum living room"],
    "done": ["Breakfast prep", "Make beds"],
    "points": ["Jane: 12 pts", "Max: 8 pts"],
    "theme": "party"
  }
}
```

Response:
```json
{
  "ok": true,
  "message": "Chore dashboard rendered",
  "state": { /* full kiosk state */ }
}
```

## Run locally

1. Install dependencies
2. Start the server
3. Open kiosk display in browser

The server process hosts both:

- MCP tool interface (stdio)
- Display web server (`http://localhost:8787`)

## Example scene payload for `kiosk_set_playlist`

Use this shape from your LLM client:

- `title`, `subtitle`
- `theme`: `aurora | sunrise | ocean | midnight | party`
- `transition`: `slide | fade | zoom`
- `autoAdvance`, `autoAdvanceSec`
- `scenes[]`
  - `title`, `subtitle`, `accent`, `durationSec`
  - `elements[]`
    - `type: text` with `heading`, `body`
    - `type: image` with `url`, optional `caption`
    - `type: video` with `url`, optional `caption`, and booleans `muted`, `autoplay`, `loop`

## High-level family workflow tools

For most home-assistant use cases, prefer these tools over raw playlist JSON:

- `kiosk_show_calendar`
  - Inputs: `dayLabel`, `events[]`, `now`, `next`, `highlight`
  - `events[]` accepts either simple strings or objects with `when`, `time`, `label`
- `kiosk_show_chores`
  - Inputs: `dueToday[]`, `done[]`, `points[]`
- `kiosk_show_meal_plan`
  - Inputs: `breakfast`, `lunch`, `dinner`, `prep[]`, `shopping[]`
- `kiosk_show_school_run`
  - Inputs: `leaveBy`, `weather`, `checklist[]`, `reminders[]`
- `kiosk_announce`
  - Inputs: `message` (required), `details[]`, `emoji`, `showOverlay`

Each of the tools above also supports optional visual controls:

- `title`, `subtitle`
- `theme`: `aurora | sunrise | ocean | midnight | party`
- `transition`: `slide | fade | zoom`
- `autoAdvance`, `autoAdvanceSec`

## MCP client wiring

Use `mcp.client.example.json` as a reference for your MCP host configuration.

## Customization ideas

- Pipe in family calendar data from Home Assistant
- Add weather and transit cards as text elements
- Display chore boards and rotating reminders
- Build holiday themes by switching `theme` and scene media

## Notes

- Keep media URLs publicly accessible by the kiosk browser.
- For local/private media, serve files from `public/` and reference relative paths.
