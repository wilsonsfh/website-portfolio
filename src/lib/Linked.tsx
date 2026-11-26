import { linkSegments } from "./projectLinks";

export function Linked({ text, focusable = true }: { text: string; focusable?: boolean }) {
  return (
    <>
      {linkSegments(text).map((s, i) =>
        s.href ? (
          <a
            key={i}
            className="chat-link"
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={focusable ? undefined : -1}
          >
            {s.text}
          </a>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
