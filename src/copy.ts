import skills from "./data/skills.json";

export const skillLine = Object.values(skills).flat().join(", ").toLowerCase();

export const lede =
  "based in singapore, studying computer science at the national university of singapore and passionate about building all things tech and aesthetics.";
// v1's version, used under "hi! i'm wilson" in about.txt and the plaintext page
export const ledeFlag = lede.replace("based in singapore", "based in 🇸🇬");

export const aboutParagraphs = [
  "i'm currently thinking about how to be a better individual contributor as a software engineer with AI. i'm also interested in product thinking and building something people want, and learning how to ace prioritisations of a hundred things.",
  "in my free time, i like exploring tea brands, freestyle dancing and doing photography. i am also currently learning the guitar, rock climbing and volleyball. these build my own unique story, which i believe the best software is built by people who bring diverse perspectives to the table.",
];

export const contacts = [
  { label: "email", href: "mailto:wilionsoon2010@gmail.com", text: "wilionsoon2010@gmail.com" },
  { label: "github", href: "https://github.com/wilsonsfh", text: "wilsonsfh" },
  { label: "x", href: "https://x.com/wilsonsfh_", text: "wilsonsfh_" },
  { label: "linkedin", href: "https://linkedin.com/in/wilsonsfh", text: "wilsonsfh" },
];

export const ext = (href: string) =>
  href.startsWith("mailto") ? {} : { target: "_blank", rel: "noopener noreferrer" };
