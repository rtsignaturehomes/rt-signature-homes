import { PageBody, pageMetadata } from "../lib/pages";

export const metadata = pageMetadata("/");

export default function HomePage() {
  return <PageBody urlPath="/" />;
}
