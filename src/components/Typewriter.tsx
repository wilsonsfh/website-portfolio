import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

// v1's hero line: types a word, deletes it, types the next (a plain swap every 3s under reduced motion)
const WORDS = ["software engineer", "product manager", "dancer", "fullstack developer", "nature lover", "tea lover", "singaporean", "photographer", "rock climber", "(learning) guitarist", "volleyball beginner"];

export default function Typewriter() {
  const reduce = useReducedMotion();
  const [text, setText] = useState(WORDS[0]);
  useEffect(() => {
    let w = 0, n = WORDS[0].length, del = true, t = 0;
    const tick = () => {
      if (reduce) { w = (w + 1) % WORDS.length; setText(WORDS[w]); t = window.setTimeout(tick, 3000); return; }
      if (del) {
        n--;
        if (n === 0) { del = false; w = (w + 1) % WORDS.length; }
      } else if (n < WORDS[w].length) n++;
      else { del = true; t = window.setTimeout(tick, 1600); return; }
      setText(WORDS[w].slice(0, n));
      t = window.setTimeout(tick, del ? 40 : n === 0 ? 300 : 80);
    };
    t = window.setTimeout(tick, reduce ? 3000 : 1600);
    return () => window.clearTimeout(t);
  }, [reduce]);
  return (
    <>
      <span className="dk-tw" aria-hidden="true">{text}</span>
      <span className="sr-only">{WORDS.join(", ")}</span>
    </>
  );
}
