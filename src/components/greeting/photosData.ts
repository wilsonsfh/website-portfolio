import story from "../../data/story.json";

export type Item = { id: string; lane: string; date: string | null; caption: string; type: string; src: string | null; poster: string | null; w: number; h: number };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "2024-07-08" or "2024-07" -> "jul 2024"
export const fmtMonth = (d: string | null) => {
  if (!d) return "undated";
  const [y, m] = d.split("-");
  return `${MONTHS[Number(m) - 1] ?? ""} ${y}`.trim();
};
// "2024-07-08" -> "8 jul 2024"; a month-only date stays "jul 2024"
export const fmtDate = (d: string | null) => {
  const day = d?.split("-")[2];
  return day ? `${Number(day)} ${fmtMonth(d)}` : fmtMonth(d);
};
export const monthKey = (d: string | null) => (d ? d.slice(0, 7) : "undated");

// oldest first, like scrolling down iCloud's library; undated last
export const ITEMS: Item[] = (story.items as Item[])
  .filter((i) => i.src)
  .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.id.localeCompare(b.id));

export const ALBUMS = [
  { id: "library", label: "library" },
  ...story.lanes.map((l) => ({ id: l.id, label: l.label })),
  { id: "videos", label: "videos" },
];
export const inAlbum = (it: Item, album: string) =>
  album === "library" || (album === "videos" ? it.type === "video" : it.lane === album);
