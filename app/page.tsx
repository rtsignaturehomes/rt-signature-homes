import { PageBody, pageMetadata } from "../lib/pages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...pageMetadata("/"),
  verification: { google: "gAM8k2Q_Di3as300bP4ymOBJqygM-vnOYPOB-VRtF4Y" },
};

export default function HomePage() {
  return <PageBody urlPath="/" />;
}
