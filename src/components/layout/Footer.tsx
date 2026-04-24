export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 border-t border-white/10 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 font-mono text-xs text-white/60 md:flex-row md:items-center">
        <span>© {year} · built with restraint</span>
        <span>
          Press{" "}
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5">
            A
          </kbd>{" "}
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5">
            S
          </kbd>{" "}
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5">
            D
          </kbd>{" "}
          on the home page — something hums.
        </span>
      </div>
    </footer>
  );
}
