import skills from "./data/skills.json";

export const skillLine = Object.values(skills).flat().join(", ").toLowerCase();

export const lede =
  "based in singapore, studying computer science at the national university of singapore and passionate about building all things tech and aesthetics.";
// v1's version, used under "hi! i'm wilson" in about.txt
export const ledeFlag = lede.replace("based in singapore", "based in 🇸🇬");

export const aboutParagraphs = [
  "i'm currently thinking about how to be a better individual contributor as a software engineer with AI. i'm also interested in product thinking and building something people want, and learning how to ace prioritisations of a hundred things.",
  "in my free time, i like exploring tea brands, freestyle dancing and doing photography. i am also currently learning the guitar, rock climbing and volleyball. these build my own unique story, which i believe the best software is built by people who bring diverse perspectives to the table.",
];

// the about.txt window shows the paragraphs above as cards and chips, at a glance
export const aboutNow: { t: string; sub?: string }[] = [
  { t: "being a better individual contributor as a software engineer, with AI" },
  { t: "product thinking: building something people want", sub: "human relations: community-finding and partnerships (especially tech-related)" },
  { t: "prioritising a hundred things well" },
];
export const aboutFree = ["exploring tea brands", "freestyle dancing", "photography", "guitar", "rock climbing", "volleyball"];

export const contacts = [
  { label: "email", href: "mailto:wilionsoon2010@gmail.com", text: "wilionsoon2010@gmail.com", logo: "/images/logos/email.svg" },
  { label: "github", href: "https://github.wilsonsoon.workers.dev/", text: "github index", logo: "/images/logos/github.svg" },
  { label: "x", href: "https://x.com/wilsonsfh_", text: "wilsonsfh_", logo: "/images/logos/x.png" },
  { label: "linkedin", href: "https://linkedin.com/in/wilsonsfh", text: "wilsonsfh", logo: "/images/logos/linkedin.png" },
];

export const ext = (href: string) =>
  href.startsWith("mailto") ? {} : { target: "_blank", rel: "noopener noreferrer" };
