// app/[locale]/next/page.tsx — Community voting page
// Shows topic list with vote counts; users submit email to vote.
// One vote per email per topic per 24h (enforced by API + Redis).
import { useTranslations } from "next-intl";
import VotingPanel from "@/components/VotingPanel";

export default function NextPage() {
  const t = useTranslations("voting");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <VotingPanel />
    </div>
  );
}
