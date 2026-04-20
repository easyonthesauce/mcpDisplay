import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  buildAnnouncementScenes,
  buildCalendarScenes,
  buildChoreScenes,
  buildMealScenes,
  buildSchoolRunScenes,
  getCurrentScene,
  getState,
  nextScene,
  previousScene,
  resetState,
  setPlaylist,
  setSceneIndex,
  setState
} from "./state.js";

function jsonResponse(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function describeStatus() {
  const state = getState();
  return {
    ok: true,
    title: state.title,
    subtitle: state.subtitle,
    theme: state.theme,
    transition: state.transition,
    autoAdvance: state.autoAdvance,
    autoAdvanceSec: state.autoAdvanceSec,
    currentSceneIndex: state.currentSceneIndex,
    currentScene: getCurrentScene(),
    playlistLength: state.playlist.length,
    overlay: state.overlay,
    lastUpdated: state.lastUpdated
  };
}

function applyPreset({
  scenes,
  title,
  subtitle,
  theme,
  transition,
  autoAdvance = true,
  autoAdvanceSec = 22,
  overlay
}) {
  setPlaylist(scenes, { autoAdvance, autoAdvanceSec, currentSceneIndex: 0 });
  const current = getState();
  setState({
    title: typeof title === "string" ? title : current.title,
    subtitle: typeof subtitle === "string" ? subtitle : current.subtitle,
    theme: typeof theme === "string" ? theme : current.theme,
    transition: typeof transition === "string" ? transition : current.transition,
    ...(overlay ? { overlay } : {})
  });
}

export async function startMcpServer(onDisplayStateChanged) {
  const server = new Server(
    {
      name: "family-kiosk-display",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  const publish = () => {
    const snapshot = getState();
    onDisplayStateChanged(snapshot);
    return snapshot;
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "kiosk_get_status",
          description: "Get the current kiosk display state and current scene",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "kiosk_set_playlist",
          description: "Replace the full display playlist with one or more scenes (supports text, image, and video elements)",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              subtitle: { type: "string" },
              theme: { type: "string", enum: ["aurora", "sunrise", "ocean", "midnight", "party"] },
              transition: { type: "string", enum: ["slide", "fade", "zoom"] },
              autoAdvance: { type: "boolean" },
              autoAdvanceSec: { type: "number", minimum: 5 },
              scenes: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    subtitle: { type: "string" },
                    accent: { type: "string" },
                    durationSec: { type: "number" },
                    elements: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["text", "image", "video"] },
                          heading: { type: "string" },
                          body: { type: "string" },
                          url: { type: "string" },
                          caption: { type: "string" },
                          muted: { type: "boolean" },
                          autoplay: { type: "boolean" },
                          loop: { type: "boolean" }
                        },
                        required: ["type"]
                      }
                    }
                  },
                  required: ["title", "elements"]
                }
              }
            },
            required: ["scenes"]
          }
        },
        {
          name: "kiosk_show_scene",
          description: "Jump to a specific scene index in the current playlist",
          inputSchema: {
            type: "object",
            properties: {
              index: { type: "number", minimum: 0 }
            },
            required: ["index"]
          }
        },
        {
          name: "kiosk_next_scene",
          description: "Advance to the next scene",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "kiosk_previous_scene",
          description: "Go back to the previous scene",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "kiosk_set_overlay",
          description: "Show or hide a large overlay message on top of the display",
          inputSchema: {
            type: "object",
            properties: {
              text: { type: "string" },
              emoji: { type: "string" },
              visible: { type: "boolean" }
            }
          }
        },
        {
          name: "kiosk_set_theme",
          description: "Change the active visual theme and transition",
          inputSchema: {
            type: "object",
            properties: {
              theme: { type: "string", enum: ["aurora", "sunrise", "ocean", "midnight", "party"] },
              transition: { type: "string", enum: ["slide", "fade", "zoom"] }
            }
          }
        },
        {
          name: "kiosk_reset_defaults",
          description: "Reset the display to defaults and starter scenes",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "kiosk_show_calendar",
          description: "Render a ready-made family calendar dashboard from simple event data",
          inputSchema: {
            type: "object",
            properties: {
              dayLabel: { type: "string" },
              now: { type: "string" },
              next: { type: "string" },
              highlight: { type: "string" },
              events: {
                type: "array",
                items: {
                  oneOf: [
                    { type: "string" },
                    {
                      type: "object",
                      properties: {
                        when: { type: "string", enum: ["morning", "afternoon", "evening", "anytime"] },
                        time: { type: "string" },
                        label: { type: "string" }
                      }
                    }
                  ]
                }
              },
              title: { type: "string" },
              subtitle: { type: "string" },
              theme: { type: "string", enum: ["aurora", "sunrise", "ocean", "midnight", "party"] },
              transition: { type: "string", enum: ["slide", "fade", "zoom"] },
              autoAdvance: { type: "boolean" },
              autoAdvanceSec: { type: "number", minimum: 5 }
            }
          }
        },
        {
          name: "kiosk_show_chores",
          description: "Render a chore dashboard with due tasks, completed items, and points",
          inputSchema: {
            type: "object",
            properties: {
              dueToday: { type: "array", items: { type: "string" } },
              done: { type: "array", items: { type: "string" } },
              points: { type: "array", items: { type: "string" } },
              title: { type: "string" },
              subtitle: { type: "string" },
              theme: { type: "string", enum: ["aurora", "sunrise", "ocean", "midnight", "party"] },
              transition: { type: "string", enum: ["slide", "fade", "zoom"] },
              autoAdvance: { type: "boolean" },
              autoAdvanceSec: { type: "number", minimum: 5 }
            }
          }
        },
        {
          name: "kiosk_show_meal_plan",
          description: "Render a meal planner scene with prep and shopping details",
          inputSchema: {
            type: "object",
            properties: {
              breakfast: { type: "string" },
              lunch: { type: "string" },
              dinner: { type: "string" },
              prep: { type: "array", items: { type: "string" } },
              shopping: { type: "array", items: { type: "string" } },
              title: { type: "string" },
              subtitle: { type: "string" },
              theme: { type: "string", enum: ["aurora", "sunrise", "ocean", "midnight", "party"] },
              transition: { type: "string", enum: ["slide", "fade", "zoom"] },
              autoAdvance: { type: "boolean" },
              autoAdvanceSec: { type: "number", minimum: 5 }
            }
          }
        },
        {
          name: "kiosk_show_school_run",
          description: "Render a school-run readiness screen with leave time and checklist",
          inputSchema: {
            type: "object",
            properties: {
              leaveBy: { type: "string" },
              weather: { type: "string" },
              checklist: { type: "array", items: { type: "string" } },
              reminders: { type: "array", items: { type: "string" } },
              title: { type: "string" },
              subtitle: { type: "string" },
              theme: { type: "string", enum: ["aurora", "sunrise", "ocean", "midnight", "party"] },
              transition: { type: "string", enum: ["slide", "fade", "zoom"] },
              autoAdvance: { type: "boolean" },
              autoAdvanceSec: { type: "number", minimum: 5 }
            }
          }
        },
        {
          name: "kiosk_announce",
          description: "Show an announcement scene and optional large overlay message",
          inputSchema: {
            type: "object",
            properties: {
              message: { type: "string" },
              details: { type: "array", items: { type: "string" } },
              emoji: { type: "string" },
              showOverlay: { type: "boolean" },
              title: { type: "string" },
              subtitle: { type: "string" },
              theme: { type: "string", enum: ["aurora", "sunrise", "ocean", "midnight", "party"] },
              transition: { type: "string", enum: ["slide", "fade", "zoom"] },
              autoAdvance: { type: "boolean" },
              autoAdvanceSec: { type: "number", minimum: 5 }
            },
            required: ["message"]
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "kiosk_get_status": {
          return jsonResponse(describeStatus());
        }

        case "kiosk_set_playlist": {
          const {
            scenes,
            title,
            subtitle,
            theme,
            transition,
            autoAdvance = true,
            autoAdvanceSec = 20
          } = args;

          if (!Array.isArray(scenes) || scenes.length === 0) {
            throw new Error("'scenes' must be a non-empty array.");
          }

          setPlaylist(scenes, { autoAdvance, autoAdvanceSec, currentSceneIndex: 0 });
          setState({
            title: typeof title === "string" ? title : getState().title,
            subtitle: typeof subtitle === "string" ? subtitle : getState().subtitle,
            theme: typeof theme === "string" ? theme : getState().theme,
            transition: typeof transition === "string" ? transition : getState().transition
          });

          const snapshot = publish();
          return jsonResponse({ ok: true, message: "Playlist updated", state: snapshot });
        }

        case "kiosk_show_scene": {
          const index = Number(args.index);
          if (!Number.isFinite(index)) {
            throw new Error("'index' must be a number.");
          }

          const snapshot = setSceneIndex(index);
          publish();
          return jsonResponse({ ok: true, message: `Showing scene ${snapshot.currentSceneIndex}`, state: snapshot });
        }

        case "kiosk_next_scene": {
          const snapshot = nextScene();
          publish();
          return jsonResponse({ ok: true, message: `Showing scene ${snapshot.currentSceneIndex}`, state: snapshot });
        }

        case "kiosk_previous_scene": {
          const snapshot = previousScene();
          publish();
          return jsonResponse({ ok: true, message: `Showing scene ${snapshot.currentSceneIndex}`, state: snapshot });
        }

        case "kiosk_set_overlay": {
          const patch = {
            text: typeof args.text === "string" ? args.text : getState().overlay.text,
            emoji: typeof args.emoji === "string" ? args.emoji : getState().overlay.emoji,
            visible: typeof args.visible === "boolean" ? args.visible : true
          };

          const snapshot = setState({ overlay: patch });
          publish();
          return jsonResponse({ ok: true, message: "Overlay updated", state: snapshot });
        }

        case "kiosk_set_theme": {
          const snapshot = setState({
            theme: typeof args.theme === "string" ? args.theme : getState().theme,
            transition: typeof args.transition === "string" ? args.transition : getState().transition
          });

          publish();
          return jsonResponse({ ok: true, message: "Theme updated", state: snapshot });
        }

        case "kiosk_reset_defaults": {
          const snapshot = resetState();
          publish();
          return jsonResponse({ ok: true, message: "Display reset to defaults", state: snapshot });
        }

        case "kiosk_show_calendar": {
          const scenes = buildCalendarScenes({
            dayLabel: args.dayLabel,
            events: args.events,
            now: args.now,
            next: args.next,
            highlight: args.highlight
          });

          applyPreset({
            scenes,
            title: args.title ?? "Family Calendar",
            subtitle: args.subtitle ?? "Daily overview",
            theme: args.theme ?? "ocean",
            transition: args.transition ?? "slide",
            autoAdvance: args.autoAdvance ?? true,
            autoAdvanceSec: args.autoAdvanceSec ?? 24
          });

          const snapshot = publish();
          return jsonResponse({ ok: true, message: "Calendar dashboard rendered", state: snapshot });
        }

        case "kiosk_show_chores": {
          const scenes = buildChoreScenes({
            dueToday: args.dueToday,
            done: args.done,
            points: args.points,
            title: args.title,
            subtitle: args.subtitle
          });

          applyPreset({
            scenes,
            title: args.title ?? "Family Chore Board",
            subtitle: args.subtitle ?? "Everyone contributes, everyone celebrates",
            theme: args.theme ?? "party",
            transition: args.transition ?? "fade",
            autoAdvance: args.autoAdvance ?? true,
            autoAdvanceSec: args.autoAdvanceSec ?? 22
          });

          const snapshot = publish();
          return jsonResponse({ ok: true, message: "Chore dashboard rendered", state: snapshot });
        }

        case "kiosk_show_meal_plan": {
          const scenes = buildMealScenes({
            breakfast: args.breakfast,
            lunch: args.lunch,
            dinner: args.dinner,
            prep: args.prep,
            shopping: args.shopping,
            title: args.title,
            subtitle: args.subtitle
          });

          applyPreset({
            scenes,
            title: args.title ?? "Meal Plan",
            subtitle: args.subtitle ?? "Kitchen game plan",
            theme: args.theme ?? "sunrise",
            transition: args.transition ?? "zoom",
            autoAdvance: args.autoAdvance ?? true,
            autoAdvanceSec: args.autoAdvanceSec ?? 24
          });

          const snapshot = publish();
          return jsonResponse({ ok: true, message: "Meal planner rendered", state: snapshot });
        }

        case "kiosk_show_school_run": {
          const scenes = buildSchoolRunScenes({
            leaveBy: args.leaveBy,
            weather: args.weather,
            checklist: args.checklist,
            reminders: args.reminders,
            title: args.title,
            subtitle: args.subtitle
          });

          applyPreset({
            scenes,
            title: args.title ?? "School Run",
            subtitle: args.subtitle ?? "Get out the door smoothly",
            theme: args.theme ?? "midnight",
            transition: args.transition ?? "slide",
            autoAdvance: args.autoAdvance ?? true,
            autoAdvanceSec: args.autoAdvanceSec ?? 20
          });

          const snapshot = publish();
          return jsonResponse({ ok: true, message: "School run screen rendered", state: snapshot });
        }

        case "kiosk_announce": {
          const message = typeof args.message === "string" ? args.message.trim() : "";
          if (!message) {
            throw new Error("'message' is required and must be a non-empty string.");
          }

          const emoji = typeof args.emoji === "string" && args.emoji.trim() ? args.emoji : "📣";
          const scenes = buildAnnouncementScenes({
            message,
            details: args.details,
            emoji,
            title: args.title,
            subtitle: args.subtitle
          });

          const showOverlay = args.showOverlay !== false;
          applyPreset({
            scenes,
            title: args.title ?? "Family Announcement",
            subtitle: args.subtitle ?? "Heads up!",
            theme: args.theme ?? "party",
            transition: args.transition ?? "zoom",
            autoAdvance: args.autoAdvance ?? false,
            autoAdvanceSec: args.autoAdvanceSec ?? 24,
            overlay: {
              text: message,
              emoji,
              visible: showOverlay
            }
          });

          const snapshot = publish();
          return jsonResponse({ ok: true, message: "Announcement rendered", state: snapshot });
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: false,
                error: error instanceof Error ? error.message : String(error)
              },
              null,
              2
            )
          }
        ]
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
