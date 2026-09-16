import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import Give from "./pages/Give";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import RequestRide from "./pages/RequestRide";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="give" element={<Give />} />
        <Route path="request-ride" element={<RequestRide />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
