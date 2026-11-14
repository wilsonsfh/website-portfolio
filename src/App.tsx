import { useState } from "react";
import MainPage from "./components/MainPage";
import Greeting, { shouldPlayIntro } from "./components/greeting/Greeting";

export default function App() {
  const [intro, setIntro] = useState(shouldPlayIntro);
  return (
    <>
      {/*
        GREETING SLOT: mount an intro/greeting component here, before <MainPage />.
        MainPage renders <main id="main"> and is a standalone page; the greeting
        should overlay it (position: fixed) and must never block it.
      */}
      {intro && <Greeting onDone={() => setIntro(false)} />}
      <MainPage />
    </>
  );
}
