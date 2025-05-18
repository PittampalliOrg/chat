// app/(cache)/[timezone]/page.tsx
import { notFound } from "next/navigation";
import { CacheStateWatcher } from "./_components/cache-state-watcher";
import { Suspense } from "react";
import { RevalidateFrom } from "./_components/revalidate-from";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TZ_MAP } from "@/lib/timezone-map";

type DateTimeInfo = {
  timezone: string;   // e.g. "Europe/Berlin"
  datetime: string;   // "2025-05-17 21:34:41"
  unixtime: number;   // 1758120881
};

const timeZones = ["CET", "GMT"];
export const revalidate = 30; // seconds

export async function generateStaticParams() {
  return timeZones.map((timezone) => ({ timezone }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ timezone: string }>;
}) {
  const { timezone } = await params;

  const zone = TZ_MAP[timezone.toUpperCase()];
  if (!zone) notFound();

  const url = `https://api.timezonedb.com/v2.1/get-time-zone?key=${
    process.env.TIMEZONE_DB_API_KEY
  }&format=json&by=zone&zone=${encodeURIComponent(zone)}`;

  const res = await fetch(url, { next: { tags: ["time-data"] } });

  if (!res.ok) {
    console.error(`Fetch error ${res.status}: ${await res.text()}`);
    notFound();
  }

  // ----------  transform TimeZoneDB → existing interface -----------
  const raw = await res.json() as {
    status: string;
    formatted: string;
    timestamp: number;
    zoneName: string;
  };

  if (raw.status !== "OK") {
    console.error("TimeZoneDB error:", raw);
    notFound();
  }

  const data: DateTimeInfo = {
    timezone: raw.zoneName,
    datetime: raw.formatted,
    unixtime: raw.timestamp,
  };
  // ---------------------------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <header>
        {timeZones.map((tz) => (
          <Button key={tz} className="mx-1" asChild>
            <Link href={`/${tz}`}>{tz.toUpperCase()} Time</Link>
          </Button>
        ))}
      </header>

      <main className="p-6 border rounded-md flex flex-col items-center">
        <div>
          {data.timezone} Time&nbsp;{data.datetime}
        </div>

        <Suspense fallback={null}>
          <CacheStateWatcher
            revalidateAfter={revalidate * 1000}
            time={data.unixtime * 1000}
          />
        </Suspense>

        <RevalidateFrom />
      </main>
    </div>
  );
}
