import type { Metadata } from "next";
import Link from "next/link";
import { Images } from "lucide-react";
import { Compare } from "@/components/skin/compare";
import { ScoreCharts } from "@/components/skin/score-charts";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { imageUrl } from "@/lib/cloudinary";
import { getJournal } from "@/lib/skin";
import type { SkinMetric } from "@/lib/slots";

export const metadata: Metadata = { title: "Cilt · Serüven" };

export default async function JourneyPage() {
  const user = await requireUser();
  const entries = (await getJournal(user.id)).reverse(); // tarihe göre artan
  const metrics = user.skinMetrics as SkinMetric[];
  const photos = entries
    .filter((e) => e.photoPublicId)
    .map((e) => ({
      day: e.day,
      scores: e.scores,
      photo: imageUrl(e.photoPublicId!, { width: 900, height: 1200, crop: "fill", gravity: "auto" }),
    }));

  if (!entries.length) {
    return (
      <div className="empty">
        <span className="empty-icon">
          <Images size={26} />
        </span>
        <h2>Serüven ilk kayıtla başlar</h2>
        <p>Cilt günlüğüne puan ve fotoğraf ekledikçe burada zaman çizelgesi ve önce/sonra karşılaştırması oluşur.</p>
        <Link href="/cilt/gunluk" className="btn btn-primary">
          Günlüğe git
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      {photos.length >= 2 ? (
        <Compare photos={photos} metrics={metrics} />
      ) : (
        <p className="notice">
          <Images size={18} aria-hidden="true" />
          <span>
            Önce/sonra karşılaştırması için en az iki fotoğraflı günlük kaydı gerekiyor (şu an {photos.length}).{" "}
            <Link href="/cilt/gunluk">Günlüğe fotoğraf ekle</Link>
          </span>
        </p>
      )}
      <ScoreCharts points={entries.map((e) => ({ day: e.day, scores: e.scores }))} metrics={metrics} today={todayIstanbul()} />
    </div>
  );
}
