# Spike A: screening room

## Done
- Scroll v2 M1: film strip look replaced by cool-grey paper band, ink/accent two-row check borders (CSS conic-gradient), photos with feathered mask edges, 22px paper gaps. Unroll + small fixes follow.
- M1: overlay in App slot; doors = two leaves hinged at outer edges, rotateY 80deg swinging away (CSS 3D, perspective 1800px), 1.2s closed then 1.0s with cubic-bezier(0.77,0,0.175,1); warm seam light widens and fades; skip, wheel/any-key (not Tab/modifiers) advance; sessionStorage once per session, `?intro=1` replays; reduced motion = no doors/camera/auto-scroll, 300ms cross-fade; page scroll locked while mounted.
- M2: infinite film strip from photos.json (min 8, 3 copies), rAF writes transform, 60px/s linear auto-scroll starting at t=2.0s; drag 1:1 with pointer capture + pan-y; release velocity decays (0.998/ms) toward auto speed; camera scale(2.8) rotate(-8deg) -> none, 1.2s ease-out at t=2.0s; vertical touch swipe advances.
- M3: Next button (fades in with 8px rise after first pointer down or 4s after camera start; arrow nudge at +2.5s then every 6s, paused while pointer down; press scale(0.97); 44px; safe-area insets). Zoom exit: scene scales into the frame nearest centre (700ms ease-out) while a --bg veil fades in, then unmounts. Before camera settles (t<3.3s) or under reduced motion or via skip, exit is a 250ms fade instead.
- M4: placeholder frame colour if a photo 404s (img hidden); 360px layout by clamp(240px,38vw,440px) frames; reasoning-only timing pass.

## In progress
- nothing

## Next
- Look at it in a real browser and on a phone; tune door angle/light, strip size, auto-scroll speed.

## Known issues
- Nothing visually verified.
- Tab keys are ignored for "any key", so keyboard users can Tab to Next; focus can still wander to MainPage behind the overlay (not made inert).
- iOS Safari may ignore html overflow:hidden; overlay is fixed with overscroll-behavior: contain.

## Unknowns discovered
- Zoom exit needs the camera settled (else frame position drifts), so early scroll/keys get a plain fade, not the signature zoom.
- Whitening is a full-screen veil, not only the centre frame.
- Touch vertical swipe: relied on pointercancel plus a manual dy check; untested on device.
- Arrow nudge uses WAAPI keyframes on an inner span (button itself only uses transform transitions).
- Intro is ~6s before Next appears for a passive visitor.
