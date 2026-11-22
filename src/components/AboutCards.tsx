import skills from "../data/skills.json";
import { aboutNow, aboutFree } from "../copy";

// about.txt's cards: what i'm thinking about, and free time
export function AboutCards() {
  return (
    <>
      <section className="ab-card" aria-label="thinking about">
        <h3>thinking about</h3>
        <ul className="ab-list">{aboutNow.map((n) => <li key={n.t}>{n.t}{n.sub && <ul className="ab-sub"><li>{n.sub}</li></ul>}</li>)}</ul>
      </section>
      <section className="ab-card" aria-label="free time">
        <h3>free time</h3>
        <ul className="ab-chips">{aboutFree.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>
    </>
  );
}

// the skill groups as chips (the resume-web window)
export function SkillGroups() {
  return (
    <>
      {Object.entries(skills).map(([group, items]) => (
        <div className="ab-skill" key={group}>
          <span className="ab-group">{group.toLowerCase()}</span>
          <ul className="ab-chips">{items.map((t) => <li key={t}>{t.toLowerCase()}</li>)}</ul>
        </div>
      ))}
    </>
  );
}
