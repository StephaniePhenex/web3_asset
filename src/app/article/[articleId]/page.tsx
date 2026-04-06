import { notFound } from "next/navigation";
import ArticleClient from "./ArticleClient";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  if (!UUID_RE.test(articleId)) {
    notFound();
  }
  return <ArticleClient articleId={articleId} />;
}
