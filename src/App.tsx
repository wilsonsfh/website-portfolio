import MainPage from "./components/MainPage";

export default function App() {
  return (
    <>
      {/*
        GREETING SLOT: mount an intro/greeting component here, before <MainPage />.
        MainPage renders <main id="main"> and is a standalone page; the greeting
        should overlay it (position: fixed) and must never block it.
      */}
      <MainPage />
    </>
  );
}
