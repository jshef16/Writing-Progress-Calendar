"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Head } from "next/head";

// ─── CONFIG — update these ────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TABLE_NAME = "writing_sessions";   // e.g. "logs"
const DATE_COLUMN = "timestamp";       // the column that holds the date/timestamp
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const WEEKS = 52;
const DAYS = 7;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getColorLevel(count, max) {
  if (count === 0) return 0;
  if (max === 0) return 0;
  const ratio = count / max;
  if (ratio < 0.15) return 1;
  if (ratio < 0.4)  return 2;
  if (ratio < 0.7)  return 3;
  return 4;
}

function buildGrid(countsByDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Anchor the grid so the last cell is always today
  // End on the Saturday of this week so today is always visible
  const gridEnd = new Date(today);
  const daysUntilSaturday = 6 - today.getDay();
  gridEnd.setDate(gridEnd.getDate() + daysUntilSaturday);

  // Start is exactly 52 weeks back from gridEnd
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridStart.getDate() - WEEKS * DAYS + 1);

  const weeks = [];
  let cursor = new Date(gridStart);

  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < DAYS; d++) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const isFuture = cursor > today;
      week.push({
        date: new Date(cursor),
        dateStr,
        count: countsByDate[dateStr] || 0,
        isFuture,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return { weeks, gridStart, gridEnd };
}

function getMonthPositions(weeks) {
  const positions = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const month = week[0].date.getMonth();
    if (month !== lastMonth) {
      positions.push({ month, col: i });
      lastMonth = month;
    }
  });
  return positions;
}


export default function ActivityCalendar() {
  const [countsByDate, setCountsByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, date, count }
  const [totalCount, setTotalCount] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select(`${DATE_COLUMN}, gross`)
          .gte(DATE_COLUMN, oneYearAgo.toISOString());

        if (error) throw error;

        const counts = {};
        data.forEach((row) => {
            const d = new Date(row[DATE_COLUMN]);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            counts[dateStr] = (counts[dateStr] || 0) + (row.gross || 0);
        });

        setCountsByDate(counts);
        setTotalCount(Object.values(counts).reduce((sum, val) => sum + val, 0));

        // Calculate current streak
        let s = 0;
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        while (true) {
          const ds = d.toISOString().slice(0, 10);
          if (counts[ds]) { s++; d.setDate(d.getDate() - 1); }
          else break;
        }
        setStreak(s);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const { weeks, gridEnd } = useMemo(() => buildGrid(countsByDate), [countsByDate]);
  const maxCount = useMemo(() => Math.max(...Object.values(countsByDate), 1), [countsByDate]);
  const monthPositions = useMemo(() => getMonthPositions(weeks), [weeks]);

  const CELL = 13;
  const GAP = 3;
  const STEP = CELL + GAP;
  const LEFT_PAD = 28;
  const TOP_PAD = 22;
  const svgWidth = LEFT_PAD + WEEKS * STEP;
  const svgHeight = TOP_PAD + DAYS * STEP + 2;

  const colors = [
    "var(--c0)", "var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"
  ];

  const formatDate = (d) =>
    d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{
      fontFamily: "'DM Mono', 'Fira Mono', monospace",
      "--c0": "#1a1f2e",
      "--c1": "#1e3a5f",
      "--c2": "#1a6b8a",
      "--c3": "#0ea5c9",
      "--c4": "#38d9f5",
      "--bg": "#0d1117",
      "--surface": "#161b22",
      "--border": "#21262d",
      "--text": "#e6edf3",
      "--text-muted": "#7d8590",
      background: "var(--bg)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "28px 32px",
        maxWidth: "900px",
        width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h2 style={{ margin: 0, color: "var(--text)", fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Activity
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "13px" }}>
              {loading ? "Loading..." : `${totalCount.toLocaleString()} total words in the last year`}
            </p>
          </div>
          <div style={{ display: "flex", gap: "20px", textAlign: "right" }}>
            <div>
              <div style={{ color: "var(--c4)", fontSize: "22px", fontWeight: 700, lineHeight: 1 }}>{streak}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "2px" }}>day streak</div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        {error ? (
          <div style={{ color: "#f85149", fontSize: "13px", padding: "20px 0" }}>
            ⚠ Could not load data: {error}
          </div>
        ) : (
          <div style={{ position: "relative", overflowX: "auto" }}>
            <svg
              width={svgWidth}
              height={svgHeight}
              style={{ display: "block", overflow: "visible" }}
            >
              {/* Month labels */}
              {monthPositions.map(({ month, col }) => (
                <text
                  key={`${month}-${col}`}
                  x={LEFT_PAD + col * STEP}
                  y={14}
                  fontSize={10}
                  fill="var(--text-muted)"
                  fontFamily="inherit"
                >
                  {MONTH_LABELS[month]}
                </text>
              ))}

              {/* Day labels */}
              {DAY_LABELS.map((label, i) => (
                label ? (
                  <text
                    key={i}
                    x={LEFT_PAD - 6}
                    y={TOP_PAD + i * STEP + CELL - 2}
                    fontSize={10}
                    fill="var(--text-muted)"
                    fontFamily="inherit"
                    textAnchor="end"
                  >
                    {label}
                  </text>
                ) : null
              ))}

              {/* Cells */}
              {loading
                ? weeks.map((week, wi) =>
                    week.map((_, di) => (
                      <rect
                        key={`${wi}-${di}`}
                        x={LEFT_PAD + wi * STEP}
                        y={TOP_PAD + di * STEP}
                        width={CELL}
                        height={CELL}
                        rx={2}
                        fill="var(--c0)"
                        opacity={0.5}
                        style={{ animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${(wi + di) * 15}ms` }}
                      />
                    ))
                  )
                : weeks.map((week, wi) =>
                    week.map((cell, di) => {
                      const level = cell.isFuture ? 0 : getColorLevel(cell.count, maxCount);
                      return (
                        <rect
                          key={`${wi}-${di}`}
                          x={LEFT_PAD + wi * STEP}
                          y={TOP_PAD + di * STEP}
                          width={CELL}
                          height={CELL}
                          rx={2}
                          fill={cell.isFuture ? "transparent" : colors[level]}
                          stroke={cell.isFuture ? "var(--border)" : "none"}
                          strokeWidth={1}
                          style={{ cursor: cell.isFuture ? "default" : "pointer", transition: "opacity 0.1s" }}
                          onMouseEnter={(e) => {
                            if (cell.isFuture) return;
                            const rect = e.target.getBoundingClientRect();
                            setTooltip({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 8,
                              date: formatDate(cell.date),
                              count: cell.count,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })
                  )}
            </svg>

            {/* Legend */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", justifyContent: "flex-end" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Less</span>
              {[0,1,2,3,4].map(l => (
                <div key={l} style={{
                  width: 11, height: 11, borderRadius: 2,
                  background: colors[l],
                  border: l === 0 ? "1px solid var(--border)" : "none",
                }} />
              ))}
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>More</span>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip (portal-style fixed) */}
      {tooltip && (
        <div style={{
          position: "fixed",
          left: tooltip.x,
          top: tooltip.y,
          transform: "translate(-50%, -100%)",
          background: "#2d333b",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "6px 10px",
          pointerEvents: "none",
          zIndex: 9999,
          whiteSpace: "nowrap",
          fontSize: "12px",
          color: "var(--text)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}>
          <strong style={{ color: "var(--c4)" }}>{tooltip.count} {tooltip.count === 1 ? "word" : "words"}</strong>
          <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>{tooltip.date}</span>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
      `}</style>
    </div>
  );
}