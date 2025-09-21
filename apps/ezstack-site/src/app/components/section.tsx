// Semantic wrapper for page sections to keep spacing and headings consistent.
import { ReactNode } from "react";

type SectionProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function Section({ title, description, children, className }: SectionProps) {
  return (
    <section className={className}>
      <div className="space-y-2 mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-foreground/75 max-w-2xl">{description}</p>}
      </div>
      {children}
    </section>
  );
}


