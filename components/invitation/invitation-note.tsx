import { HeartDivider } from "./heart-divider";
import { EnvelopeIllustration } from "./invitation-icons";

export function InvitationNote() {
  return (
    <section
      id="loi-nhan"
      className="mx-auto w-[calc(100%-40px)] max-w-5xl pt-10 pb-8 text-center sm:w-[calc(100%-64px)] sm:pt-5 sm:pb-7"
      aria-labelledby="note-heading"
    >
      <h2
        id="note-heading"
        className="font-heading text-lg font-normal text-wedding-wine uppercase"
      >
        Lời nhắn nhỏ
      </h2>
      <HeartDivider />
      <div className="flex min-h-[90px] items-center justify-center gap-3">
        <EnvelopeIllustration />
        <p className="text-[15px] leading-[1.4]">
          Sự hiện diện của bạn
          <br />
          là niềm vui lớn nhất
          <br />
          đối với chúng mình.
        </p>
      </div>
    </section>
  );
}
