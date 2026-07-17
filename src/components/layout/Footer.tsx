export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 px-8 py-10 bg-cream">
      <div className="flex max-w-[1600px] flex-col items-start justify-between gap-4 font-mono text-xs text-black/60 md:flex-row md:items-center">
        <span>&copy; {year} · built with humanity</span>
        <span>
          Press{" "}
          <kbd className="rounded border border-black/15 px-1.5 py-0.5">
            A
          </kbd>{" "}
          <kbd className="rounded border border-black/15 px-1.5 py-0.5">
            S
          </kbd>{" "}
          <kbd className="rounded border border-black/15 px-1.5 py-0.5">
            D
          </kbd>{" "}
          <kbd className="rounded border border-black/15 px-1.5 py-0.5">
            F
          </kbd>{" "}
          make me dance
        </span>
      </div>
    </footer>
  );
}
