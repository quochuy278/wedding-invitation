"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import styles from "./invitation-ticket.module.css";

type LiveTime = { label: string; iso: string };

export function TicketLiveMarker({ timeZone }: { timeZone: string }) {
  const t = useTranslations("InvitationTicket");
  const [currentTime, setCurrentTime] = useState<LiveTime | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("vi-VN", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    let timer: number | null = null;

    function updateTime(): void {
      const current = new Date();
      const nextTime = { label: formatter.format(current), iso: current.toISOString() };
      setCurrentTime(nextTime);
    }

    function stopTimer(): void {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    }

    function syncVisibility(): void {
      stopTimer();
      if (document.visibilityState === "hidden") return;
      updateTime();
      timer = window.setInterval(updateTime, 1000);
    }

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return function cleanup(): void {
      stopTimer();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [timeZone]);

  const clockLabel = currentTime?.label ?? "--:--:--";
  const clockIso = currentTime?.iso;
  const trackClassName = cn(styles.liveTrack, "mt-3");

  return (
    <div className="mt-5 w-60 max-w-full rounded-xl border border-wedding-wine/10 bg-white/70 px-4 py-3 text-wedding-wine">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-label text-[10px]">
          <span aria-hidden="true" className={styles.liveDot} />
          {t("liveTitle")}
        </p>
        <time aria-live="off" className="font-mono text-sm tabular-nums" dateTime={clockIso}>
          {clockLabel}
        </time>
      </div>
      <div aria-hidden="true" className={trackClassName} />
      <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("liveTimeZone")}</p>
    </div>
  );
}
