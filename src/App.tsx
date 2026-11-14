import MainPage from "./components/MainPage";
import Greeting from "./components/greeting/Greeting";

export default function App() {
  return (
    <>
      {/* Scroll-linked entrance: a tall section in normal flow above <MainPage />. */}
      <Greeting />
      <MainPage />
    </>
  );
}
