// synthesized sound (Web Audio, no files). the AudioContext is only ever created inside a click handler.
const KEY = "v2-sound";

export const getSoundOn = () => {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
};
export const setSoundOn = (on: boolean) => {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
};
