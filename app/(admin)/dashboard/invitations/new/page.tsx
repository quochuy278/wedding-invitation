import { CopyIcon, EyeIcon, MailPlusIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export default async function CreateInvitationPage(): Promise<ReactElement> {
  const t: Awaited<ReturnType<typeof getTranslations>> =
    await getTranslations("Admin.createInvitation");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl text-wedding-wine">{t("title")}</h1>
          <Badge variant="outline">{t("demo")}</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>{t("formTitle")}</CardTitle>
            <CardDescription>{t("formDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form>
              <FieldGroup>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="guest-name">{t("guestName")}</FieldLabel>
                    <Input
                      autoComplete="name"
                      id="guest-name"
                      name="guestName"
                      placeholder={t("guestNamePlaceholder")}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="guest-phone">{t("phone")}</FieldLabel>
                    <Input
                      autoComplete="tel"
                      id="guest-phone"
                      name="phone"
                      placeholder={t("phonePlaceholder")}
                      type="tel"
                    />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="guest-email">{t("email")}</FieldLabel>
                    <Input
                      autoComplete="email"
                      id="guest-email"
                      name="email"
                      placeholder={t("emailPlaceholder")}
                      type="email"
                    />
                    <FieldDescription>{t("emailHint")}</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="guest-limit">{t("guestLimit")}</FieldLabel>
                    <NativeSelect
                      className="w-full"
                      defaultValue="2"
                      id="guest-limit"
                      name="guestLimit"
                    >
                      <NativeSelectOption value="1">1</NativeSelectOption>
                      <NativeSelectOption value="2">2</NativeSelectOption>
                      <NativeSelectOption value="3">3</NativeSelectOption>
                      <NativeSelectOption value="4">4</NativeSelectOption>
                      <NativeSelectOption value="5">5</NativeSelectOption>
                    </NativeSelect>
                    <FieldDescription>{t("guestLimitHint")}</FieldDescription>
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="guest-group">{t("guestGroup")}</FieldLabel>
                    <NativeSelect
                      className="w-full"
                      defaultValue="friends"
                      id="guest-group"
                      name="guestGroup"
                    >
                      <NativeSelectOption value="family">{t("groupFamily")}</NativeSelectOption>
                      <NativeSelectOption value="friends">{t("groupFriends")}</NativeSelectOption>
                      <NativeSelectOption value="colleagues">
                        {t("groupColleagues")}
                      </NativeSelectOption>
                      <NativeSelectOption value="other">{t("groupOther")}</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="response-deadline">{t("responseDeadline")}</FieldLabel>
                    <Input id="response-deadline" name="responseDeadline" type="date" />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="personal-message">{t("personalMessage")}</FieldLabel>
                  <Textarea
                    id="personal-message"
                    name="personalMessage"
                    placeholder={t("messagePlaceholder")}
                    rows={5}
                  />
                  <FieldDescription>{t("messageHint")}</FieldDescription>
                </Field>

                <Separator />

                <div className="flex flex-wrap justify-end gap-3">
                  <Button type="reset" variant="outline">
                    {t("reset")}
                  </Button>
                  <Button type="button">
                    <MailPlusIcon />
                    {t("create")}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>{t("previewTitle")}</CardTitle>
            <CardDescription>{t("previewDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border bg-wedding-cream p-6 text-center">
              <p className="font-heading text-sm uppercase tracking-[0.24em] text-wedding-wine/70">
                {t("previewEyebrow")}
              </p>
              <p className="mt-4 font-heading text-3xl text-wedding-wine">Huy &amp; Phụng</p>
              <Separator className="mx-auto my-5 w-20 bg-wedding-gold/45" />
              <p className="text-sm text-muted-foreground">{t("previewGuest")}</p>
              <p className="mt-1 font-heading text-xl">Nguyễn Văn An</p>
              <p className="mt-5 text-xs text-muted-foreground">{t("previewCode")}</p>
              <p className="mt-1 font-mono text-sm font-semibold tracking-[0.18em]">HUY-AN-2026</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline">
                <EyeIcon />
                {t("preview")}
              </Button>
              <Button type="button" variant="outline">
                <CopyIcon />
                {t("copyLink")}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">{t("demoNotice")}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
