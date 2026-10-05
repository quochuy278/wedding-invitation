const navigation = [
  { href: "#trang-chu", label: "Trang chủ" },
  { href: "#thong-tin-tiec", label: "Thông tin tiệc" },
  { href: "#dia-diem", label: "Địa điểm" },
  { href: "#loi-nhan", label: "Lời nhắn" },
  { href: "#loi-chuc", label: "Lời chúc" },
  { href: "#xac-nhan", label: "Xác nhận tham dự" },
];

export function InvitationHeader() {
  return (
    <header className="pt-5 pb-2 md:pt-7">
      <div className="mx-auto flex min-h-12 w-[calc(100%-40px)] max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:w-[calc(100%-64px)] lg:flex-nowrap">
        <a
          href="#trang-chu"
          className="relative block h-11 w-10 shrink-0 font-heading text-[30px] leading-none text-wedding-wine"
          aria-label="Huy và Phụng — Trang chủ"
        >
          <span>H</span>
          <span className="absolute top-3 left-3.5 text-[27px]">P</span>
        </a>
        <nav
          className="order-3 flex w-full items-center justify-between gap-2 font-label lg:order-none lg:w-auto lg:gap-6"
          aria-label="Điều hướng thiệp mời"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="py-2 text-[10px] whitespace-nowrap transition-colors hover:text-wedding-wine motion-reduce:transition-none sm:text-[11px] last:max-sm:hidden"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
