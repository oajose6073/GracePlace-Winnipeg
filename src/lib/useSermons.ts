import { useEffect, useState } from "react";

export type Sermon = {
  id: string;
  title: string;
  date: string;
  thumbnail: string;
  url: string;
};

type State =
  | { status: "loading"; sermons: [] }
  | { status: "ready"; sermons: Sermon[] }
  /** No API key configured, or YouTube did not answer. The section falls back
   *  to a link to the channel rather than rendering an empty shelf. */
  | { status: "unavailable"; sermons: [] };

const CACHE_KEY = "gp-sermons";
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
const CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID as string | undefined;
const MAX_RESULTS = 6;

type YouTubeItem = {
  id: { videoId?: string };
  snippet: {
    title: string;
    publishedAt: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** The API returns titles HTML-escaped (`&amp;`, `&#39;`). */
const decodeEntities = (text: string) => {
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
};

const toSermon = (item: YouTubeItem): Sermon | null => {
  const videoId = item.id?.videoId;
  if (!videoId) return null;
  return {
    id: videoId,
    title: decodeEntities(item.snippet.title),
    date: formatDate(item.snippet.publishedAt),
    thumbnail: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
};

/** Whether this session already fetched the list. */
function readCache(): Sermon[] | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const sermons = JSON.parse(cached) as Sermon[];
    return Array.isArray(sermons) && sermons.length ? sermons : null;
  } catch {
    return null;
  }
}

/** Resolved during render: without credentials there is nothing to fetch, and
 *  a warm cache can be shown immediately without a loading flash. */
function initialState(): State {
  if (!API_KEY || !CHANNEL_ID) return { status: "unavailable", sermons: [] };
  const cached = readCache();
  return cached ? { status: "ready", sermons: cached } : { status: "loading", sermons: [] };
}

export function useSermons(): State {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    if (state.status !== "loading") return;

    const controller = new AbortController();

    (async () => {
      try {
        const url =
          "https://www.googleapis.com/youtube/v3/search" +
          `?key=${API_KEY}&channelId=${CHANNEL_ID}` +
          `&part=snippet&order=date&type=video&maxResults=${MAX_RESULTS}`;

        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();

        if (!response.ok || data.error || !Array.isArray(data.items)) {
          throw new Error(data?.error?.message ?? "YouTube request failed");
        }

        const sermons = (data.items as YouTubeItem[])
          .map(toSermon)
          .filter((s): s is Sermon => s !== null);

        if (!sermons.length) throw new Error("No videos returned");

        setState({ status: "ready", sermons });
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(sermons));
        } catch {
          /* storage full or blocked — caching is best-effort */
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load sermons:", error);
        setState({ status: "unavailable", sermons: [] });
      }
    })();

    return () => controller.abort();
  }, [state.status]);

  return state;
}
