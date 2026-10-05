import type { InvitationScheduleEvent } from "@/lib/dummy-invitation";
import { HeartDivider } from "./heart-divider";
import { ScheduleIcon } from "./invitation-icons";

export function InvitationSchedule({
  date,
  events,
}: {
  date: string;
  events: readonly InvitationScheduleEvent[];
}) {
  return (
    <section id="thong-tin-tiec" className="bg-[#fffcf6]/30 py-7" aria-labelledby="party-heading">
      <div className="mx-auto w-[calc(100%-40px)] max-w-5xl sm:w-[calc(100%-64px)]">
        <h2
          id="party-heading"
          className="text-center font-heading text-[21px] font-normal text-wedding-wine uppercase sm:text-[23px]"
        >
          Thông tin buổi tiệc
        </h2>
        <HeartDivider />
        <ol className="mt-5 grid list-none gap-7 sm:mt-1 sm:grid-cols-3 sm:gap-0">
          {events.map((event) => (
            <ScheduleEvent key={event.time} date={date} event={event} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function ScheduleEvent({ date, event }: { date: string; event: InvitationScheduleEvent }) {
  return (
    <li className="relative grid grid-cols-[85px_1fr] gap-x-4 px-3 sm:block sm:px-6 sm:text-center sm:not-first:before:absolute sm:not-first:before:top-8 sm:not-first:before:bottom-5 sm:not-first:before:left-0 sm:not-first:before:w-px sm:not-first:before:bg-wedding-dusty-rose/40 sm:not-first:after:absolute sm:not-first:after:top-[94px] sm:not-first:after:-left-[3px] sm:not-first:after:size-[7px] sm:not-first:after:rounded-full sm:not-first:after:bg-wedding-wine">
      <div className="row-span-3 flex items-center justify-center text-wedding-wine sm:h-[76px]">
        <ScheduleIcon name={event.icon} />
      </div>
      <time
        className="text-[25px] leading-[1.4] text-wedding-wine"
        dateTime={`${date}T${event.time}:00+07:00`}
      >
        {event.time}
      </time>
      <h3 className="mt-0.5 mb-1 font-heading text-[21px] font-normal text-wedding-wine lg:text-[22px]">
        {event.title}
      </h3>
      <p className="max-w-[230px] text-[14px] leading-[1.4] sm:mx-auto sm:max-w-[205px] sm:text-[15px] sm:text-balance">
        {event.description}
      </p>
    </li>
  );
}
