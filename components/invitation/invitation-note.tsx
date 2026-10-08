import { useTranslations } from "next-intl";
import { HeartDivider } from "./heart-divider";
import { EnvelopeIllustration } from "./invitation-icons";

export function InvitationNote({ personalMessage }: { personalMessage: string | null }) {
  const t = useTranslations("Invitation.note");

  return (
    <section
      id="note"
      className="mx-auto w-[calc(100%-40px)] max-w-5xl pt-10 pb-8 text-center sm:w-[calc(100%-64px)] sm:pt-5 sm:pb-7"
      aria-labelledby="note-heading"
    >
      <h2
        id="note-heading"
        className="font-heading text-lg font-normal text-wedding-wine uppercase"
      >
        {t("heading")}
      </h2>
      <HeartDivider />
      <div className="flex min-h-[90px] items-center justify-center gap-3">
        <EnvelopeIllustration />
        {personalMessage ? (
          <p className="whitespace-pre-line text-[15px] leading-[1.4]">{personalMessage}</p>
        ) : (
          <p className="text-[15px] leading-[1.4]">
            {t("lineOne")}
            <br />
            {t("lineTwo")}
            <br />
            {t("lineThree")}
          </p>
        )}
      </div>
    </section>
  );
}
