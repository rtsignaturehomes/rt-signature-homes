import { listPaths } from "../../lib/content";
import { PageBody, pageMetadata } from "../../lib/pages";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string[] }> };

function toPath(slug: string[]) {
  return `/${slug.join("/")}/`;
}

export function generateStaticParams() {
  return listPaths()
    .filter((urlPath) => urlPath !== "/")
    .map((urlPath) => ({ slug: urlPath.replace(/^\/|\/$/g, "").split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const urlPath = toPath(slug);
  if (!listPaths().includes(urlPath)) return {};
  return pageMetadata(urlPath);
}

export default async function ContentPage({ params }: Props) {
  const { slug } = await params;
  const urlPath = toPath(slug);
  if (!listPaths().includes(urlPath)) notFound();
  return <PageBody urlPath={urlPath} />;
}
