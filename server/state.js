const defaultScenes = [
  {
    id: "welcome",
    title: "Good Morning, Team Family! 🌞",
    subtitle: "Today's mission: stay organized, stay awesome.",
    accent: "sunrise",
    durationSec: 20,
    elements: [
      {
        type: "text",
        heading: "Top Priorities",
        body: "School bags by the door · Lunch prep · Quick room reset"
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1400&q=80",
        caption: "Command center vibes"
      }
    ]
  },
  {
    id: "calendar",
    title: "Family Calendar Snapshot 🗓️",
    subtitle: "The day at a glance",
    accent: "ocean",
    durationSec: 20,
    elements: [
      {
        type: "text",
        heading: "Morning",
        body: "08:00 School drop-off · 09:30 Grocery pickup"
      },
      {
        type: "text",
        heading: "Afternoon",
        body: "15:30 Homework time · 17:30 Football practice"
      },
      {
        type: "text",
        heading: "Evening",
        body: "19:00 Dinner · 20:00 Family movie vote"
      }
    ]
  },
  {
    id: "fun",
    title: "Tiny Joy Break 🎉",
    subtitle: "Because productivity needs confetti.",
    accent: "party",
    durationSec: 25,
    elements: [
      {
        type: "video",
        url: "https://cdn.coverr.co/videos/coverr-clouds-and-sunrise-1579/1080p.mp4",
        muted: true,
        autoplay: true,
        loop: true,
        caption: "Breathe in, breathe out, keep going 💪"
      },
      {
        type: "text",
        heading: "Fun Prompt",
        body: "Everyone share one good thing from today so far."
      }
    ]
  }
];

const defaultState = {
  title: "Family Home Assistant Display",
  subtitle: "Organized, informed, and a little bit silly",
  theme: "aurora",
  transition: "slide",
  autoAdvance: true,
  autoAdvanceSec: 20,
  playlist: defaultScenes,
  currentSceneIndex: 0,
  overlay: {
    text: "",
    emoji: "✨",
    visible: false
  },
  ticker: [
    "Tip: Ask the assistant to show reminders, weather, menu plans, and cleaning rosters.",
    "Big fonts = fewer squints. You're welcome, future you.",
    "House Rule #1: Whoever sees the dishwasher is now the chosen one."
  ],
  lastUpdated: new Date().toISOString()
};

let state = structuredClone(defaultState);

function stamp() {
  state.lastUpdated = new Date().toISOString();
}

export function getState() {
  return state;
}

export function resetState() {
  state = structuredClone(defaultState);
  stamp();
  return state;
}

export function setState(patch) {
  state = {
    ...state,
    ...patch
  };

  if (patch.overlay) {
    state.overlay = {
      ...defaultState.overlay,
      ...state.overlay,
      ...patch.overlay
    };
  }

  stamp();
  return state;
}

export function setPlaylist(playlist, { currentSceneIndex = 0, autoAdvance = true, autoAdvanceSec = 20 } = {}) {
  const safePlaylist = Array.isArray(playlist) && playlist.length > 0 ? playlist : structuredClone(defaultScenes);

  state.playlist = safePlaylist;
  state.currentSceneIndex = Math.max(0, Math.min(currentSceneIndex, safePlaylist.length - 1));
  state.autoAdvance = Boolean(autoAdvance);
  state.autoAdvanceSec = Math.max(5, Number(autoAdvanceSec) || 20);

  stamp();
  return state;
}

export function setSceneIndex(index) {
  const max = state.playlist.length - 1;
  state.currentSceneIndex = Math.max(0, Math.min(index, max));
  stamp();
  return state;
}

export function nextScene() {
  if (!state.playlist.length) {
    state.currentSceneIndex = 0;
    stamp();
    return state;
  }

  state.currentSceneIndex = (state.currentSceneIndex + 1) % state.playlist.length;
  stamp();
  return state;
}

export function previousScene() {
  if (!state.playlist.length) {
    state.currentSceneIndex = 0;
    stamp();
    return state;
  }

  state.currentSceneIndex = (state.currentSceneIndex - 1 + state.playlist.length) % state.playlist.length;
  stamp();
  return state;
}

export function getCurrentScene() {
  if (!state.playlist.length) {
    return null;
  }

  return state.playlist[state.currentSceneIndex] ?? null;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
}

function toLines(items, emptyFallback) {
  const list = asArray(items)
    .map((item) => String(item).trim())
    .filter(Boolean);

  return list.length ? list.join(" · ") : emptyFallback;
}

export function buildCalendarScenes({
  dayLabel = "Today",
  events = [],
  now = "",
  next = "",
  highlight = ""
} = {}) {
  const safeEvents = asArray(events).map((event) => {
    if (typeof event === "string") {
      return { label: event };
    }
    return event;
  });

  const grouped = {
    morning: [],
    afternoon: [],
    evening: [],
    anytime: []
  };

  for (const event of safeEvents) {
    const when = String(event.when ?? "anytime").toLowerCase();
    const line = [event.time, event.label].filter(Boolean).join(" ").trim();
    const bucket = grouped[when] ? when : "anytime";
    grouped[bucket].push(line || "Untitled event");
  }

  const summaryScene = {
    id: "calendar-summary",
    title: `Calendar: ${dayLabel} 🗓️`,
    subtitle: "Everything in one glance",
    accent: "ocean",
    durationSec: 25,
    elements: [
      {
        type: "text",
        heading: "Now",
        body: now || "No active item right now"
      },
      {
        type: "text",
        heading: "Next",
        body: next || "No next item queued"
      },
      {
        type: "text",
        heading: "Highlight",
        body: highlight || "Keep momentum and hydrate 💧"
      }
    ]
  };

  const timelineScene = {
    id: "calendar-timeline",
    title: `${dayLabel} Timeline`,
    subtitle: "Morning to evening flow",
    accent: "aurora",
    durationSec: 25,
    elements: [
      {
        type: "text",
        heading: "Morning",
        body: toLines(grouped.morning, "No morning events")
      },
      {
        type: "text",
        heading: "Afternoon",
        body: toLines(grouped.afternoon, "No afternoon events")
      },
      {
        type: "text",
        heading: "Evening",
        body: toLines(grouped.evening, "No evening events")
      },
      {
        type: "text",
        heading: "Anytime",
        body: toLines(grouped.anytime, "No flexible tasks")
      }
    ]
  };

  return [summaryScene, timelineScene];
}

export function buildChoreScenes({
  title = "Chore Mission Board 🧹",
  subtitle = "Tiny tasks, big peace",
  dueToday = [],
  done = [],
  points = []
} = {}) {
  return [
    {
      id: "chores-main",
      title,
      subtitle,
      accent: "party",
      durationSec: 24,
      elements: [
        {
          type: "text",
          heading: "Due Today",
          body: toLines(dueToday, "No chores queued. Suspiciously impressive.")
        },
        {
          type: "text",
          heading: "Completed ✅",
          body: toLines(done, "Nothing checked off yet")
        },
        {
          type: "text",
          heading: "Family Points",
          body: toLines(points, "No points yet — start with easy wins!")
        }
      ]
    }
  ];
}

export function buildMealScenes({
  title = "Meal Plan & Kitchen Radar 🍽️",
  subtitle = "No one asks what's for dinner every 3 minutes",
  breakfast = "",
  lunch = "",
  dinner = "",
  prep = [],
  shopping = []
} = {}) {
  return [
    {
      id: "meal-plan",
      title,
      subtitle,
      accent: "sunrise",
      durationSec: 25,
      elements: [
        {
          type: "text",
          heading: "Breakfast",
          body: breakfast || "Not set"
        },
        {
          type: "text",
          heading: "Lunch",
          body: lunch || "Not set"
        },
        {
          type: "text",
          heading: "Dinner",
          body: dinner || "Not set"
        },
        {
          type: "text",
          heading: "Prep + Shopping",
          body: `${toLines(prep, "No prep tasks")} · ${toLines(shopping, "No shopping needs")}`
        }
      ]
    }
  ];
}

export function buildSchoolRunScenes({
  title = "School Run Control 🚗",
  subtitle = "Launch sequence for getting out the door",
  leaveBy = "",
  weather = "",
  checklist = [],
  reminders = []
} = {}) {
  return [
    {
      id: "school-run",
      title,
      subtitle,
      accent: "midnight",
      durationSec: 24,
      elements: [
        {
          type: "text",
          heading: "Leave By",
          body: leaveBy || "Time not set"
        },
        {
          type: "text",
          heading: "Weather",
          body: weather || "Weather not set"
        },
        {
          type: "text",
          heading: "Checklist",
          body: toLines(checklist, "Bags · Water bottles · Keys")
        },
        {
          type: "text",
          heading: "Reminders",
          body: toLines(reminders, "Everyone grab a smile 😄")
        }
      ]
    }
  ];
}

export function buildAnnouncementScenes({
  title = "Family Announcement 📣",
  subtitle = "Important update",
  message = "",
  details = [],
  emoji = "✨"
} = {}) {
  return [
    {
      id: "announcement",
      title,
      subtitle,
      accent: "party",
      durationSec: 20,
      elements: [
        {
          type: "text",
          heading: `${emoji} Message`,
          body: message || "No message provided"
        },
        {
          type: "text",
          heading: "Details",
          body: toLines(details, "No additional details")
        }
      ]
    }
  ];
}
