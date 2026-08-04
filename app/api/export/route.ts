// GET /api/export — CSV of leads (admin session required; docs/ARCHITECTURE.md
// security req #8: never public, never token-in-URL). Consented-only by
// default; ?all=1 includes everyone. RLS admin read policies enforce access:
// the query runs as the signed-in owner, not the service role.
import { NextResponse } from "next/server";
import { LEAD_EXPORT_COLUMNS, buildLeadsCsv } from "@/lib/csv";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const orgId = process.env.NEXT_PUBLIC_EVENT_ORG_ID;
  if (!orgId) {
    console.error("export: NEXT_PUBLIC_EVENT_ORG_ID not set");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const all = new URL(request.url).searchParams.get("all") === "1";
  // Legacy `gadget` rides along only to backfill `gadgets` for any row
  // written by a pre-multiselect deploy (migration 0002 rollout note).
  let query = supabase
    .from("leads")
    .select(LEAD_EXPORT_COLUMNS.join(",") + ",gadget")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (!all) {
    query = query.eq("consent", true);
  }
  const { data, error } = await query;
  if (error) {
    console.error("export: query failed:", error.code);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map(
    (row) => ({ ...row, gadgets: row.gadgets ?? [row.gadget] }),
  );
  const csv = buildLeadsCsv(rows);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
  }).format(new Date());
  // BOM so Excel detects UTF-8 (names can carry accents).
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="askmitch-leads-${today}${all ? "-all" : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
