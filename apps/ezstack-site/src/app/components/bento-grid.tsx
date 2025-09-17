// Responsive cards sourcing content from config to keep layout extensible.
import Link from "next/link";
import { productTiles, type ProductTile } from "../../lib/products";

function StatusBadge({ status }: { status: ProductTile["status"] }) {
  const color = status === "available" ? "bg-emerald-600" : "bg-amber-600";
  const label = status === "available" ? "Available" : "Coming soon";
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full text-white ${color}`}>
      {label}
    </span>
  );
}

export function BentoGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {productTiles.map((tile) => (
        <article
          key={tile.slug}
          className={`rounded-xl border border-black/[.08] dark:border-white/[.145] p-5 transition-transform focus-within:ring-2 focus-within:ring-offset-2 hover:-translate-y-0.5 ${
            tile.span === "wide" ? "sm:col-span-2" : ""
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <tile.icon className="w-5 h-5" aria-hidden />
              <h3 className="text-lg font-semibold">{tile.title}</h3>
            </div>
            <StatusBadge status={tile.status} />
          </div>
          <p className="text-foreground/75 mb-3">{tile.description}</p>
          <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1 mb-4">
            {tile.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Link
              href={tile.primaryHref}
              className="px-3 py-1.5 rounded-md bg-foreground text-background text-sm"
            >
              Docs
            </Link>
            {tile.secondaryHref && (
              <Link
                href={tile.secondaryHref}
                className="px-3 py-1.5 rounded-md border border-black/[.08] dark:border-white/[.145] text-sm"
              >
                Start
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}


