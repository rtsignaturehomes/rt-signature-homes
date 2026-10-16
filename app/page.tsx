import { PageBody, pageMetadata } from "../lib/pages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...pageMetadata("/"),
  verification: { google: "0Y2Dv8ADArH8vCIjSgqtRHci7gm40mOlnu8JK6v4py4" },
};

export default function HomePage() {
  return <PageBody urlPath="/" />;
}
