import { useEffect } from "react";
import { Ticker } from "../components/Ticker";
import { Anthem } from "../sections/Anthem";
import { Contact } from "../sections/Contact";
import { Events } from "../sections/Events";
import { Hero } from "../sections/Hero";
import { Sermons } from "../sections/Sermons";

export default function Home() {
  // The other pages set their own titles, so without this the tab would keep
  // showing e.g. "Give — GracePlace Winnipeg" after navigating back home.
  useEffect(() => {
    document.title = "GracePlace Winnipeg";
  }, []);

  return (
    <>
      <Hero />
      <Ticker />
      <Anthem />
      <Sermons />
      <Events />
      <Contact />
    </>
  );
}
