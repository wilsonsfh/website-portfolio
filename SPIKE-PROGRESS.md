# Spike C: messages first

## Done (milestones 1-4 landed in one pass, one commit)
- `src/data/chat-script.json`: 13 opening messages (~20s), 5 topics (work, projects, outside, community, contact), fallback. 8 lines flagged `needsReview`.
- `src/components/Greeting.tsx` + styles appended to `src/styles/global.css`, mounted in `src/App.tsx` above MainPage (normal flow, 100dvh).
- Typing indicator (500-1400ms by length), bubble entry scale .95 + rise 250ms, tail-side origin, skip link, scroll-anchoring (sticks only if not scrolled up; "new messages" button otherwise).
- Chips + typed keyword matching, interrupt/queue, "keep going" (also auto-resume after 6s unless input focused), fallback, replay, link card to #main, tap thread / Space skips wait, reduced motion (all at once, fade only).

## In progress / Next
- Nothing planned. Needs a visual pass by the owner.

## Known issues
- Not seen in a browser: layout, photo choice (photo 0 and 1 picked blind, fixed 3:2 crop), 360px wrap of chips (about 3 rows).
- Space-to-skip is disabled when focus is on a button/link/input.
- Disabled "send" still shows press scale.

## Unknowns discovered
- Thread is its own scroll container inside the page; wheel chains to page at its end.
- Chips take ~150px on a 360px phone, shrinking the thread.
- Opening is ~20s of waiting for a visitor who just wants the facts; skip link and tap-to-skip are essential.
