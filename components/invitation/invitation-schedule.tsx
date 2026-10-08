import { useTranslations } from "next-intl";
import { HeartDivider } from "./heart-divider";
import { ScheduleIcon } from "./invitation-icons";

export function InvitationSchedule({ eventAt, timeZone }: { eventAt: string; timeZone: string }) {
  const t = useTranslations("Invitation.schedule");
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  };
  const displayTime = new Intl.DateTimeFormat("vi-VN", dateOptions).format(new Date(eventAt));
  return (
    <section
      id="party-information"
      className="bg-[#fffcf6]/30 py-7"
      aria-labelledby="party-heading"
    >
      <div className="mx-auto w-[calc(100%-40px)] max-w-5xl sm:w-[calc(100%-64px)]">
        <h2
          id="party-heading"
          className="text-center font-heading text-[21px] font-normal text-wedding-wine uppercase sm:text-[23px]"
        >
          {t("heading")}
        </h2>
        <HeartDivider />
        <div className="mt-5 flex flex-col items-center gap-3 text-center">
          <ScheduleIcon name="champagne" />
          <time dateTime={eventAt} className="text-xl text-wedding-wine">
            {displayTime}
          </time>
          <p className="text-sm">{timeZone}</p>
          <p>{t("events.guestWelcome.description")}</p>
        </div>
      </div>
    </section>
  );
}
