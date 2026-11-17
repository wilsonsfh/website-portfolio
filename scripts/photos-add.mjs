// Fills the photo-scroll placeholders in src/data/story.json with real media.
// Usage: npm run photos:add -- <file|folder> ... [--lane=career|people|me|scenery]
// A file matches the story entry whose id equals its basename (e.g. career-012-2025-08-01.jpeg);
// unknown files become new entries (lane from --lane or the name prefix, date from the name).
// Images: HEIC goes through macOS `sips`, then sharp resizes to 1200px and writes WebP with all
// metadata (GPS included) stripped. Videos: ffmpeg writes a silent H.264 MP4 plus a WebP poster.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const storyPath = join(root, "src/data/story.json");
const outDir = join(root, "public/photos/story");
mkdirSync(outDir, { recursive: true });
const story = JSON.parse(readFileSync(storyPath, "utf8"));
const laneIds = story.lanes.map((l) => l.id);

const args = process.argv.slice(2);
const laneArg = args.find((a) => a.startsWith("--lane="))?.slice(7);
const files = args
  .filter((a) => !a.startsWith("--"))
  .flatMap((p) => (statSync(p).isDirectory() ? readdirSync(p).map((f) => join(p, f)) : [p]))
  .filter((f) => /\.(jpe?g|png|heic|webp|mov|mp4)$/i.test(f));
if (!files.length) {
  console.error("usage: npm run photos:add -- <file|folder> ... [--lane=career|people|me|scenery]");
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "photos-add-"));
const MAX = 1200;

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const id = basename(file, extname(file)).toLowerCase();
  let item = story.items.find((i) => i.id === id);
  if (!item) {
    const lane = laneArg ?? laneIds.find((l) => id.startsWith(l + "-")) ?? (id.startsWith("life-") ? "people" : null);
    if (!laneIds.includes(lane)) {
      console.error(`skip ${file}: no story entry "${id}" and no --lane`);
      continue;
    }
    const date = id.match(/\d{4}-\d{2}(-\d{2})?/)?.[0] ?? null;
    item = { id, lane, date, caption: "", type: "image", src: null, poster: null, w: 4, h: 3 };
    story.items.push(item);
  }

  if (ext === ".mov" || ext === ".mp4") {
    const out = join(outDir, `${id}.mp4`);
    const poster = join(tmp, `${id}.png`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-an", "-vf", "scale=-2:'min(960,ih)'",
      "-c:v", "libx264", "-crf", "26", "-preset", "slow", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", "-map_metadata", "-1", out]);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out, "-frames:v", "1", poster]);
    const meta = await sharp(poster).webp({ quality: 78 }).toFile(join(outDir, `${id}.webp`));
    Object.assign(item, { type: "video", src: `/photos/story/${id}.mp4`, poster: `/photos/story/${id}.webp`, w: meta.width, h: meta.height });
  } else {
    let src = file;
    if (ext === ".heic") {
      src = join(tmp, `${id}.jpg`);
      execFileSync("sips", ["-s", "format", "jpeg", file, "--out", src], { stdio: "ignore" });
    }
    const meta = await sharp(src, { failOn: "none" }) // some chat-app exports are truncated
      .rotate() // apply EXIF orientation
      .rotate(item.rotate ?? 0)
      .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(join(outDir, `${id}.webp`));
    Object.assign(item, { type: "image", src: `/photos/story/${id}.webp`, poster: null, w: meta.width, h: meta.height });
  }
  console.log(`${id} -> ${item.lane}${item.src ? "" : " (placeholder)"}`);
}

story.items.sort((a, b) => laneIds.indexOf(a.lane) - laneIds.indexOf(b.lane) || (a.date ?? "9999").localeCompare(b.date ?? "9999"));
writeFileSync(storyPath, JSON.stringify(story, null, 2) + "\n");
console.log(`${files.length} file(s) processed; ${story.items.filter((i) => !i.src).length} placeholder(s) left`);
