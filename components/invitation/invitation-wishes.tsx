import { HeartDivider } from "./heart-divider";
import { InvitationButton } from "./invitation-button";
import { Botanical } from "./invitation-decorations";

export function InvitationWishes({ groom, bride }: { groom: string; bride: string }) {
  return (
    <section
      id="loi-chuc"
      className="relative bg-[radial-gradient(ellipse_at_15%_55%,#eeb6aa30,transparent_65%),radial-gradient(ellipse_at_85%_85%,#e8b5a330,transparent_65%)] bg-[#fbebe5]/40 pt-3 pb-7 text-center"
      aria-labelledby="wishes-heading"
    >
      <Botanical className="absolute -bottom-5 -left-1 h-28 w-12 rotate-[15deg] sm:left-5 sm:h-40 sm:w-20 lg:left-[calc((100%-1100px)/2)]" />
      <Botanical className="absolute -right-1 -bottom-5 h-28 w-12 -scale-x-100 rotate-[15deg] sm:right-5 sm:h-40 sm:w-20 lg:right-[calc((100%-1100px)/2)]" />
      <div className="relative mx-auto w-[calc(100%-40px)] max-w-5xl">
        <HeartDivider wide />
        <h2
          id="wishes-heading"
          className="font-heading text-[21px] font-normal text-wedding-wine uppercase sm:text-[23px]"
        >
          Lời chúc yêu thương
        </h2>
        <p className="mx-auto mt-2 max-w-[290px] text-[13px] leading-relaxed sm:max-w-xl">
          Gửi một lời chúc đến chúng mình trong ngày đặc biệt này nhé!
        </p>
        <InvitationButton className="mt-4">Gửi lời chúc</InvitationButton>
        <p className="mt-4 font-heading text-[28px] text-wedding-wine italic">
          Thân mến, {groom} & {bride}
        </p>
      </div>
    </section>
  );
}
