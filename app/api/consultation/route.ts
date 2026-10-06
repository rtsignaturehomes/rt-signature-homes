import { getStore } from "@netlify/blobs";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type LeadBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  zip?: string;
  propertyAddress?: string;
  projectType?: string;
  budget?: string;
  timing?: string;
  preferredContact?: string;
  message?: string;
  website?: string;
  [key: string]: unknown;
};

const required: Array<[keyof LeadBody, string]> = [
  ["firstName", "Enter your first name."],
  ["lastName", "Enter your last name."],
  ["phone", "Enter a phone number."],
  ["zip", "Enter the project ZIP code."],
  ["projectType", "Select a project type."],
  ["preferredContact", "Select a preferred contact method."],
];

export async function POST(request: Request) {
  let body: LeadBody;
  try {
    body = (await request.json()) as LeadBody;
  } catch {
    return NextResponse.json({ message: "The request could not be read." }, { status: 400 });
  }

  if (String(body.website || "").trim()) {
    return NextResponse.json({ leadId: crypto.randomUUID() });
  }

  const issues = required.flatMap(([field, message]) =>
    String(body[field] || "").trim() ? [] : [{ path: field, message }],
  );
  if (body.preferredContact === "email" && !String(body.email || "").trim()) {
    issues.push({ path: "email", message: "Enter an email address." });
  }
  if (issues.length) {
    return NextResponse.json(
      { message: "Check the highlighted fields and try again.", issues },
      { status: 400 },
    );
  }

  const leadId = crypto.randomUUID();
  const record = {
    ...body,
    website: undefined,
    leadId,
    receivedAt: new Date().toISOString(),
  };

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    const forwarded = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!forwarded.ok) {
      return NextResponse.json(
        { message: "We could not send your request. Please call us or try again shortly." },
        { status: 502 },
      );
    }
  }

  try {
    const store = getStore("leads");
    await store.set(leadId, JSON.stringify(record));
  } catch {
    if (!process.env.NETLIFY) {
      const dir = path.join(process.cwd(), "content", "leads");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${leadId}.json`), JSON.stringify(record, null, 2));
    }
  }

  return NextResponse.json({ leadId });
}
