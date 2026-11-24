import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import Ask from "./pages/Ask";
import Give from "./pages/Give";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import RequestRide from "./pages/RequestRide";

// Loaded only when visited, so the Supabase client library stays out of the
// public pages' bundle.
const Admin = lazy(() => import("./pages/admin/Admin"));

export default function App() {
  return (
    <Routes>
      {/* Private, unlinked and outside the public layout (no site nav/footer). */}
      <Route
        path="admin"
        element={
          <Suspense fallback={null}>
            <Admin />
          </Suspense>
        }
      />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="give" element={<Give />} />
        <Route path="request-ride" element={<RequestRide />} />
        <Route path="ask" element={<Ask />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
