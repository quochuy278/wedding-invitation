import { useFormatter } from "next-intl";
import type { InvitationWishDto } from "@/shared/contracts/invitation";

export function WishList({ wishes }: { wishes: InvitationWishDto[] }) {
  const formatter = useFormatter();
  return (
    <ul className="space-y-3 text-left">
      {wishes.map((wish) => (
        <li key={wish.id} className="rounded-lg border border-wedding-wine/15 bg-background/70 p-4">
          <blockquote className="whitespace-pre-line break-words text-sm leading-relaxed">
            {wish.content}
          </blockquote>
          <time dateTime={wish.createdAt} className="mt-2 block text-xs text-muted-foreground">
            {formatter.dateTime(new Date(wish.createdAt), {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </time>
        </li>
      ))}
    </ul>
  );
}
