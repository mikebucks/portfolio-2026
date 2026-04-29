import Link from "next/link";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 mix-blend-difference">
      <Link
        href="/"
        className="font-mono text-sm tracking-tight text-white hover:text-accent"
      >
        ◼ your-name
      </Link>
      <div className="flex items-center gap-6">
        <ThemeSwitcher />
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
    </header>
  );
}
