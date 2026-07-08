"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  ensureTrackingIds,
  flushEventQueue,
  trackEvent,
} from "@/lib/tracking/client";

type TrackingProviderProps = {
  children: React.ReactNode;
};

const SESSION_STARTED_KEY = "demo_session_started";
const MAX_CLICKS_PER_PAGE = 20;
const SCROLL_MILESTONES = [25, 50, 75, 100];

export function TrackingProvider({ children }: TrackingProviderProps) {
  const pathname = usePathname();
  const sessionEndedRef = useRef(false);
  const scrollMilestonesRef = useRef<Set<number>>(new Set());
  const clickCountRef = useRef(0);

  useEffect(() => {
    ensureTrackingIds();

    if (!sessionStorage.getItem(SESSION_STARTED_KEY)) {
      sessionStorage.setItem(SESSION_STARTED_KEY, "1");
      trackEvent(
        "session_start",
        {
          entry_page: window.location.pathname,
        },
        { immediate: true },
      );
    }

    const endSession = () => {
      if (sessionEndedRef.current) {
        return;
      }

      sessionEndedRef.current = true;

      trackEvent(
        "session_end",
        {
          last_page: window.location.pathname,
        },
        { immediate: true, useBeacon: true },
      );

      void flushEventQueue({ useBeacon: true });
    };

    window.addEventListener("pagehide", endSession);

    return () => {
      window.removeEventListener("pagehide", endSession);
    };
  }, []);

  useEffect(() => {
    scrollMilestonesRef.current = new Set();
    clickCountRef.current = 0;

    trackEvent("page_view", {
      page: pathname,
    });
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      const documentHeight = document.documentElement.scrollHeight;
      const viewportBottom = window.scrollY + window.innerHeight;

      if (documentHeight <= 0) {
        return;
      }

      const depth = Math.min(
        100,
        Math.round((viewportBottom / documentHeight) * 100),
      );

      for (const milestone of SCROLL_MILESTONES) {
        if (depth >= milestone && !scrollMilestonesRef.current.has(milestone)) {
          scrollMilestonesRef.current.add(milestone);
          trackEvent("scroll_depth", {
            page: pathname,
            depth: milestone,
          });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (clickCountRef.current >= MAX_CLICKS_PER_PAGE) {
        return;
      }

      clickCountRef.current += 1;

      const target = event.target as HTMLElement | null;

      trackEvent("click_position", {
        page: pathname,
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
        element: target?.tagName.toLowerCase() || "unknown",
      });
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
    };
  }, [pathname]);

  return <>{children}</>;
}
