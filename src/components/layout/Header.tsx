import Link from "next/link";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-8 py-4 mix-blend-difference">
      <section className="flex justify-between w-full max-w-7xl">
        <Link
          href="/"
          className="font-mono text-sm tracking-tight text-white hover:text-accent"
        >
          Mike<span className="font-bold">Bucks</span>
        </Link>
        <div className="flex justify-between gap-6">
          {/* <ThemeSwitcher /> */}
          <nav aria-label="Primary">
            <ul className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-white/80">
              <li>
                <Link href="/work" className="hover:text-accent">
                  Work
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-accent">
                  About
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@example.com"
                  className="hover:text-accent"
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </section>
    </header>
  );
}
