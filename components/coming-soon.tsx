import { Hourglass } from "lucide-react";

export function ComingSoon({ eyebrow, title, items }: { eyebrow: string; title: string; items: string[] }) {
  return (
    <main className="main narrow">
      <header className="page-head">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </header>
      <div className="empty">
        <span className="empty-icon">
          <Hourglass size={26} />
        </span>
        <h2>Bu bölüm hazırlanıyor</h2>
        <p>Yakında burada:</p>
        <ul style={{ textAlign: "left", margin: 0, paddingLeft: 20 }}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
