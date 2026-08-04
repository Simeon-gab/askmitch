// Owner dashboard (docs/ARCHITECTURE.md "Admin dashboard"). Server-rendered;
// reads go through the authenticated server client, so RLS admin policies
// (read-only, org-scoped) are the enforcement layer. Manual refresh is fine
// for v1 — no realtime.
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import SignOutButton from "@/components/admin/SignOutButton";
import {
  GADGETS,
  GADGET_LABELS,
  MOVES,
  MOVE_LABELS,
  TIMINGS,
  TIMING_LABELS,
  formatGadgets,
} from "@/lib/options";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PER_PAGE = 25;

// Lagos is UTC+1 year-round (no DST) — the day boundary is fixed.
function lagosDayStart(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${ymd}T00:00:00+01:00`);
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function Breakdown({
  title,
  order,
  labels,
  counts,
  total,
}: {
  title: string;
  order: readonly string[];
  labels: Record<string, string>;
  counts: Map<string, number>;
  total: number;
}) {
  const max = Math.max(1, ...order.map((v) => counts.get(v) ?? 0));
  return (
    <div className="dash-card">
      <div className="dash-kpi-label">{title}</div>
      {order.map((value) => {
        const count = counts.get(value) ?? 0;
        const pct = total === 0 ? 0 : Math.round((count / total) * 100);
        return (
          <div
            key={value}
            className="dash-bar-row"
            title={`${labels[value]}: ${count} (${pct}%)`}
          >
            <span className="dash-bar-label">{labels[value]}</span>
            <span className="dash-track">
              <span
                className="dash-fill"
                style={{ width: `${Math.round((count / max) * 100)}%` }}
              />
            </span>
            <span className="dash-count">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const orgId = process.env.NEXT_PUBLIC_EVENT_ORG_ID;
  if (!orgId) {
    throw new Error("NEXT_PUBLIC_EVENT_ORG_ID is not set");
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null; // middleware redirects; this is belt-and-suspenders
  }

  // One lean scan powers all the aggregate widgets (event scale: hundreds).
  const { data: statRows, error: statError } = await supabase
    .from("leads")
    .select("gadget, gadgets, move, timing, redeemed_at, created_at")
    .eq("org_id", orgId);
  if (statError) {
    throw new Error(`stats query failed: ${statError.code}`);
  }
  const rows = statRows ?? [];
  const total = rows.length;
  const dayStart = lagosDayStart();
  const todayCount = rows.filter(
    (r) => new Date(r.created_at) >= dayStart,
  ).length;
  const redeemedCount = rows.filter((r) => r.redeemed_at !== null).length;
  const redemptionRate =
    total === 0 ? 0 : Math.round((redeemedCount / total) * 100);

  const countBy = (field: "move" | "timing") => {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row[field], (map.get(row[field]) ?? 0) + 1);
    }
    return map;
  };
  // A lead counts under EACH gadget it picked, so gadget percentages can sum
  // past 100 — that's the nature of multi-select, not a bug.
  const gadgetCounts = new Map<string, number>();
  for (const row of rows) {
    for (const g of row.gadgets ?? [row.gadget]) {
      gadgetCounts.set(g, (gadgetCounts.get(g) ?? 0) + 1);
    }
  }

  // Hot leads: at the counter today/this week, buying or swapping
  // (docs/DATABASE.md segment query).
  const { data: hotLeads, error: hotError } = await supabase
    .from("leads")
    .select("id, name, phone, phone_e164, gadget, gadgets, gadget_other")
    .eq("org_id", orgId)
    .in("timing", ["today", "this_week"])
    .in("move", ["buy", "swap"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (hotError) {
    throw new Error(`hot leads query failed: ${hotError.code}`);
  }

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PER_PAGE;
  const {
    data: recent,
    count: recentCount,
    error: recentError,
  } = await supabase
    .from("leads")
    .select(
      "id, name, email, gadget, gadgets, move, timing, source, consent, redeemed_at, created_at",
      { count: "exact" },
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, from + PER_PAGE - 1);
  if (recentError && recentError.code !== "PGRST103") {
    throw new Error(`recent query failed: ${recentError.code}`);
  }
  const pages = Math.max(1, Math.ceil((recentCount ?? 0) / PER_PAGE));

  const { count: failedEmails, error: failedError } = await supabase
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "failed");
  if (failedError) {
    throw new Error(`email_log query failed: ${failedError.code}`);
  }

  // Fallback covers rows written by a pre-multiselect deploy (0002 note).
  const leadGadgets = (lead: { gadgets: string[] | null; gadget: string }) =>
    lead.gadgets ?? [lead.gadget];

  return (
    <div className="dash">
      <AdminHeader>
        <a className="dash-btn primary" href="/api/export">
          Export CSV
        </a>
        <a className="dash-btn" href="/api/export?all=1" title="Includes non-consented leads">
          Export all
        </a>
        <SignOutButton />
      </AdminHeader>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-kpi-label">Total signups</div>
          <div className="dash-kpi">{total}</div>
          <div className="dash-kpi-sub">+{todayCount} today</div>
        </div>
        <div className="dash-card">
          <div className="dash-kpi-label">Redemption rate</div>
          <div className="dash-kpi">{redemptionRate}%</div>
          <div className="dash-kpi-sub">
            {redeemedCount} of {total} redeemed
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-kpi-label">Hot leads</div>
          <div className="dash-kpi">{hotLeads?.length ?? 0}</div>
          <div className="dash-kpi-sub">today/this week × buy/swap</div>
        </div>
        <div className="dash-card">
          <div className="dash-kpi-label">Failed emails</div>
          <div className="dash-kpi">{failedEmails ?? 0}</div>
          <div className="dash-kpi-sub">for manual resend later</div>
        </div>
      </div>

      <div className="dash-grid">
        <Breakdown
          title="Gadget interest"
          order={GADGETS}
          labels={GADGET_LABELS}
          counts={gadgetCounts}
          total={total}
        />
        <Breakdown
          title="The move"
          order={MOVES}
          labels={MOVE_LABELS}
          counts={countBy("move")}
          total={total}
        />
        <Breakdown
          title="Timing"
          order={TIMINGS}
          labels={TIMING_LABELS}
          counts={countBy("timing")}
          total={total}
        />
      </div>

      <h2 className="dash-h">Hot leads</h2>
      <div className="dash-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Interested in</th>
            </tr>
          </thead>
          <tbody>
            {(hotLeads ?? []).map((lead) => (
              <tr key={lead.id}>
                <td>{lead.name}</td>
                <td>{lead.phone_e164 ?? lead.phone ?? "—"}</td>
                <td>{formatGadgets(leadGadgets(lead), lead.gadget_other)}</td>
              </tr>
            ))}
            {(hotLeads ?? []).length === 0 ? (
              <tr>
                <td colSpan={3} className="dash-empty">
                  No hot leads yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h2 className="dash-h">Recent registrations</h2>
      <div className="dash-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Name</th>
              <th>Email</th>
              <th>Interest</th>
              <th>Move</th>
              <th>Timing</th>
              <th>Source</th>
              <th>Consent</th>
              <th>Redeemed</th>
            </tr>
          </thead>
          <tbody>
            {(recent ?? []).map((lead) => (
              <tr key={lead.id}>
                <td>{formatWhen(lead.created_at)}</td>
                <td>{lead.name}</td>
                <td>{lead.email}</td>
                <td>{formatGadgets(leadGadgets(lead), null)}</td>
                <td>
                  {(MOVE_LABELS as Record<string, string>)[lead.move] ??
                    lead.move}
                </td>
                <td>
                  {(TIMING_LABELS as Record<string, string>)[lead.timing] ??
                    lead.timing}
                </td>
                <td>{lead.source}</td>
                <td>{lead.consent ? "✓" : "—"}</td>
                <td>{lead.redeemed_at ? formatWhen(lead.redeemed_at) : "—"}</td>
              </tr>
            ))}
            {(recent ?? []).length === 0 ? (
              <tr>
                <td colSpan={9} className="dash-empty">
                  No registrations yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="dash-pager">
        {page > 1 ? (
          <Link className="dash-btn" href={`/admin?page=${page - 1}`}>
            ← Newer
          </Link>
        ) : null}
        <span>
          Page {page} of {pages} · {recentCount ?? 0} leads
        </span>
        {page < pages ? (
          <Link className="dash-btn" href={`/admin?page=${page + 1}`}>
            Older →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
