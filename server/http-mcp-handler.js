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

export async function handleMcpToolCall(toolName, args = {}, onStateChanged) {
  try {
    switch (toolName) {
      case "kiosk_get_status": {
        return { ok: true, data: describeStatus() };
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

        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: "Playlist updated", state: snapshot };
      }

      case "kiosk_show_scene": {
        const index = Number(args.index);
        if (!Number.isFinite(index)) {
          throw new Error("'index' must be a number.");
        }

        setSceneIndex(index);
        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: `Showing scene ${snapshot.currentSceneIndex}`, state: snapshot };
      }

      case "kiosk_next_scene": {
        nextScene();
        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: `Showing scene ${snapshot.currentSceneIndex}`, state: snapshot };
      }

      case "kiosk_previous_scene": {
        previousScene();
        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: `Showing scene ${snapshot.currentSceneIndex}`, state: snapshot };
      }

      case "kiosk_set_overlay": {
        const patch = {
          text: typeof args.text === "string" ? args.text : getState().overlay.text,
          emoji: typeof args.emoji === "string" ? args.emoji : getState().overlay.emoji,
          visible: typeof args.visible === "boolean" ? args.visible : true
        };

        setState({ overlay: patch });
        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: "Overlay updated", state: snapshot };
      }

      case "kiosk_set_theme": {
        setState({
          theme: typeof args.theme === "string" ? args.theme : getState().theme,
          transition: typeof args.transition === "string" ? args.transition : getState().transition
        });

        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: "Theme updated", state: snapshot };
      }

      case "kiosk_reset_defaults": {
        resetState();
        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: "Display reset to defaults", state: snapshot };
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

        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: "Calendar dashboard rendered", state: snapshot };
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

        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: "Chore dashboard rendered", state: snapshot };
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

        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: "Meal planner rendered", state: snapshot };
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

        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: "School run screen rendered", state: snapshot };
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

        const snapshot = getState();
        if (onStateChanged) onStateChanged(snapshot);
        return { ok: true, message: "Announcement rendered", state: snapshot };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function getToolDefinitions() {
  return [
    {
      name: "kiosk_get_status",
      description: "Get the current kiosk display state and current scene"
    },
    {
      name: "kiosk_set_playlist",
      description: "Replace the full display playlist with one or more scenes (supports text, image, and video elements)"
    },
    {
      name: "kiosk_show_scene",
      description: "Jump to a specific scene index in the current playlist"
    },
    {
      name: "kiosk_next_scene",
      description: "Advance to the next scene"
    },
    {
      name: "kiosk_previous_scene",
      description: "Go back to the previous scene"
    },
    {
      name: "kiosk_set_overlay",
      description: "Show or hide a large overlay message on top of the display"
    },
    {
      name: "kiosk_set_theme",
      description: "Change the active visual theme and transition"
    },
    {
      name: "kiosk_reset_defaults",
      description: "Reset the display to defaults and starter scenes"
    },
    {
      name: "kiosk_show_calendar",
      description: "Render a ready-made family calendar dashboard from simple event data"
    },
    {
      name: "kiosk_show_chores",
      description: "Render a chore dashboard with due tasks, completed items, and points"
    },
    {
      name: "kiosk_show_meal_plan",
      description: "Render a meal planner scene with prep and shopping details"
    },
    {
      name: "kiosk_show_school_run",
      description: "Render a school-run readiness screen with leave time and checklist"
    },
    {
      name: "kiosk_announce",
      description: "Show an announcement scene and optional large overlay message"
    }
  ];
}
