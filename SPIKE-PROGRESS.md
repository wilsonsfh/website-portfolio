# Spike A: screening room

## Done
- M1: overlay mounted in App slot; doors (rotateY leaves hinged at outer edges, swinging away; warm seam light widens); skip, wheel/any-key advance; sessionStorage once-per-session, `?intro=1` replays; reduced motion cross-fade; unmounts onto MainPage (250ms fade for now).

- M2: looping film strip (3 copies of the photo set, min 8), rAF writes transform; auto-scroll 60px/s linear; drag 1:1 with pointer capture, release velocity decays (0.998/ms) toward auto speed; opening camera move scale(2.8) rotate(-8deg) -> none, 1.2s ease-out from t=2.0s; vertical touch swipe (pointercancel) advances.

## In progress
- nothing

## Next
- M3 Next button + zoom exit; M4 polish.

## Known issues
- Next button not built yet (onControl is a no-op).

## Unknowns discovered
- Nothing visually verified (no screenshots allowed).
