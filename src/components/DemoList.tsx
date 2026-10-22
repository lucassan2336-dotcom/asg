import { Card, DemoTag, DemoNotice, Section } from "./SiteLayout";

export function DemoList({ items, cols = 3 }: { items: { title: string; meta?: string; text: string }[]; cols?: 2 | 3 }) {
  return (
    <Section>
      <DemoNotice />
      <div className={`grid gap-6 ${cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {items.map((it) => (
          <Card key={it.title}>
            <div className="flex items-center justify-between gap-2">
              <DemoTag />
              {it.meta && <span className="font-condensed text-sm font-semibold uppercase text-muted-foreground">{it.meta}</span>}
            </div>
            <h2 className="mt-3 text-xl">{it.title}</h2>
            <p className="mt-2 text-muted-foreground">{it.text}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
