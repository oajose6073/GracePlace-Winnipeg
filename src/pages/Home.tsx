import { Ticker } from "../components/Ticker";
import { Anthem } from "../sections/Anthem";
import { Contact } from "../sections/Contact";
import { Events } from "../sections/Events";
import { Hero } from "../sections/Hero";
import { Sermons } from "../sections/Sermons";

export default function Home() {
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
