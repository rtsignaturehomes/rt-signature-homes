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
  submissionId?: string;
  netlifyForms?: string;
  [key: string]: unknown;
};

type Lead = Record<string, unknown> & { leadId: string; receivedAt: string };

type LeadRecord = Lead & {
  delivery: { netlifyForms: string; webhookDeliveredAt?: string };
};

const required: Array<[keyof LeadBody, string]> = [
  ["firstName", "Enter your first name."],
  ["lastName", "Enter your last name."],
  ["phone", "Enter a phone number."],
  ["zip", "Enter the project ZIP code."],
  ["projectType", "Select a project type."],
  ["preferredContact", "Select a preferred contact method."],
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Netlify functions stop after 10 seconds by default, so the webhook must answer well before that.
const WEBHOOK_TIMEOUT_MS = 7000;

const FAILURE_MESSAGE = "We could not send your request. Please call us or try again shortly.";

function localLeadFile(leadId: string) {
  return path.join(process.cwd(), "content", "leads", `${leadId}.json`);
}

async function readLead(leadId: string) {
  try {
    const store = getStore("leads");
    return (await store.get(leadId, { type: "json", consistency: "strong" })) as LeadRecord | null;
  } catch (error) {
    if (process.env.NETLIFY) throw error;
    const file = localLeadFile(leadId);
    return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as LeadRecord) : null;
  }
}

async function saveLead(record: LeadRecord) {
  try {
    await getStore("leads").set(record.leadId, JSON.stringify(record));
  } catch (error) {
    if (process.env.NETLIFY) throw error;
    const file = localLeadFile(record.leadId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(record, null, 2));
  }
}

async function sendToWebhook(url: string, lead: Lead) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (response.ok) return true;
    console.error(`[consultation] Lead webhook rejected lead ${lead.leadId} with HTTP ${response.status}`);
  } catch (error) {
    console.error(`[consultation] Lead webhook failed for lead ${lead.leadId}`, error);
  }
  return false;
}

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

  const { submissionId, netlifyForms, website: _honeypot, delivery: _delivery, ...fields } = body;
  const leadId = submissionId && UUID.test(submissionId) ? submissionId : crypto.randomUUID();
  const netlifyFormsStatus = netlifyForms === "accepted" ? "accepted" : "failed";
  if (netlifyFormsStatus === "failed") {
    console.error(`[consultation] Netlify Forms did not accept lead ${leadId}; relying on the lead store and webhook`);
  }

  let existing: LeadRecord | null = null;
  try {
    existing = await readLead(leadId);
  } catch (error) {
    console.error(`[consultation] Could not check whether lead ${leadId} was already saved`, error);
  }

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (existing && (!webhook || existing.delivery?.webhookDeliveredAt)) {
    return NextResponse.json({ leadId });
  }

  const record: LeadRecord = existing ?? {
    ...fields,
    leadId,
    receivedAt: new Date().toISOString(),
    delivery: { netlifyForms: netlifyFormsStatus },
  };
  const { delivery, ...lead } = record;

  let stored = Boolean(existing);
  if (!stored) {
    try {
      await saveLead(record);
      stored = true;
    } catch (error) {
      console.error(`[consultation] Could not save lead ${leadId}`, error);
    }
  }

  let delivered = false;
  if (webhook) {
    delivered = await sendToWebhook(webhook, lead);
    if (delivered && stored) {
      try {
        await saveLead({ ...lead, delivery: { ...delivery, webhookDeliveredAt: new Date().toISOString() } });
      } catch (error) {
        console.error(`[consultation] Could not record webhook delivery for lead ${leadId}`, error);
      }
    }
  }

  if (!stored && !delivered) {
    return NextResponse.json({ message: FAILURE_MESSAGE }, { status: 503 });
  }
  return NextResponse.json({ leadId });
}
