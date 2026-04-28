// app/[locale]/about/page.tsx — Mission + socials
import { useTranslations } from "next-intl";

export default function AboutPage() {
  const t = useTranslations("about");

  return (
    <div>
      <h1>{t("title")}</h1>
      {/* TODO: replace with designed About component */}
    </div>
  );
}
