import { useTranslations } from "next-intl";

const navigation = [
  { href: "#home", key: "home" },
  { href: "#party-information", key: "partyInformation" },
  { href: "#venue", key: "venue" },
  { href: "#note", key: "note" },
  { href: "#wishes", key: "wishes" },
  { href: "#rsvp", key: "rsvp" },
] as const;

export function InvitationHeader() {
  const t = useTranslations("Invitation.navigation");
  const couple = useTranslations("Invitation.couple");

  return (
    <header className="pt-5 pb-2 md:pt-7">
      <div className="mx-auto flex min-h-12 w-[calc(100%-40px)] max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:w-[calc(100%-64px)] lg:flex-nowrap">
        <a
          href="#home"
          className="relative block h-11 w-10 shrink-0 font-heading text-[30px] leading-none text-wedding-wine"
          aria-label={t("brandAriaLabel")}
        >
          <span>{couple("groom").charAt(0)}</span>
          <span className="absolute top-3 left-3.5 text-[27px]">{couple("bride").charAt(0)}</span>
        </a>
        <nav
          className="order-3 flex w-full items-center justify-between gap-2 font-label lg:order-none lg:w-auto lg:gap-6"
          aria-label={t("ariaLabel")}
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="py-2 text-[10px] whitespace-nowrap transition-colors hover:text-wedding-wine motion-reduce:transition-none sm:text-[11px] last:max-sm:hidden"
            >
              {t(item.key)}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
