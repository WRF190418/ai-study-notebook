import { poeticScenes } from "./themes";

export type PoemId = typeof poeticScenes[number]["id"];
type Light = "moon" | "stars" | "sun" | "overcast" | "dawn" | "sunset";
type Terrain = "mountains" | "sea" | "river" | "pond";
export const poeticDetails = ["redbean", "letter", "lamp", "village", "sail", "traveler", "clouds", "star-river", "swallows", "blossoms", "lanterns", "wine", "tower", "summit", "rapids", "chrysanthemums", "pine-stream", "lotus", "rain", "osmanthus", "road", "seated"] as const;
export type PoeticDetail = typeof poeticDetails[number];
type Scenery = { light: Light; terrain: Terrain; details: readonly PoeticDetail[] };

// Match the actual images in each poem, not just its broad emotional motif.
// Shared by the homepage, course headers and theme preview; IDs remain stable for saved sessions.
export const poeticScenery = {
  longing: { light: "moon", terrain: "mountains", details: ["redbean", "letter"] },
  devotion: { light: "moon", terrain: "mountains", details: ["lamp", "letter"] },
  journey: { light: "dawn", terrain: "mountains", details: ["village", "blossoms", "road"] },
  courage: { light: "sun", terrain: "sea", details: ["sail"] },
  freedom: { light: "overcast", terrain: "mountains", details: ["rain", "traveler"] },
  repose: { light: "dawn", terrain: "mountains", details: ["clouds", "seated"] },
  "shared-moon": { light: "moon", terrain: "sea", details: [] },
  "lasting-love": { light: "stars", terrain: "mountains", details: ["star-river"] },
  "heart-connection": { light: "stars", terrain: "mountains", details: ["star-river", "lamp"] },
  "ocean-memory": { light: "overcast", terrain: "sea", details: ["clouds"] },
  "returning-swallow": { light: "sunset", terrain: "mountains", details: ["blossoms", "swallows"] },
  "moon-wish": { light: "moon", terrain: "mountains", details: ["lamp"] },
  homeward: { light: "dawn", terrain: "mountains", details: ["road", "traveler", "clouds"] },
  "lantern-night": { light: "stars", terrain: "river", details: ["village", "lanterns"] },
  "lingering-thought": { light: "moon", terrain: "pond", details: ["letter", "lotus"] },
  "born-to-shine": { light: "sunset", terrain: "mountains", details: ["wine", "clouds"] },
  "autumn-horizon": { light: "sunset", terrain: "river", details: ["swallows", "clouds"] },
  "higher-view": { light: "sunset", terrain: "river", details: ["tower", "road"] },
  summit: { light: "dawn", terrain: "mountains", details: ["summit", "clouds"] },
  "great-river": { light: "sunset", terrain: "river", details: ["rapids"] },
  "heroic-spirit": { light: "sunset", terrain: "mountains", details: ["summit", "rapids"] },
  "east-fence": { light: "sun", terrain: "mountains", details: ["chrysanthemums", "seated"] },
  "pine-moon": { light: "moon", terrain: "mountains", details: ["pine-stream"] },
  "spring-dawn": { light: "dawn", terrain: "mountains", details: ["rain", "blossoms", "swallows"] },
  "lake-light": { light: "sun", terrain: "pond", details: ["clouds"] },
  "first-lotus": { light: "sun", terrain: "pond", details: ["lotus"] },
  "quiet-rain": { light: "stars", terrain: "mountains", details: ["rain", "village"] },
  "spring-stillness": { light: "moon", terrain: "mountains", details: ["osmanthus"] },
  "mountain-companion": { light: "sun", terrain: "mountains", details: ["summit", "seated"] },
  "far-friend": { light: "dawn", terrain: "mountains", details: ["road", "traveler", "village"] }
} as const satisfies Record<PoemId, Scenery>;

export const poeticSky: Record<Light, readonly [string, string]> = {
  moon: ["#c4d0ce", "#e2e1d0"], stars: ["#afc0c3", "#d0d4c6"],
  sun: ["#ecebd8", "#c1cfb3"], overcast: ["#c2d0ca", "#a9bdb2"],
  dawn: ["#efe7d4", "#bdd0bd"], sunset: ["#edd6c2", "#c8bfa5"]
};
