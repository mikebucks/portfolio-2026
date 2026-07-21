"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { SOCIALS, CONTACT_EMAIL } from "@/data/socials";

// Web3Forms access keys are public by design (safe to ship client-side). Create
// a free key tied to the contact inbox at https://web3forms.com and set it as
// NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY. Until then submissions will fail cleanly.
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "";

type Status = "idle" | "submitting" | "success" | "error";

const fieldClass =
  "w-full rounded-md border border-white/15 bg-white/[0.04] px-4 py-3 text-white placeholder-white/40 outline-none transition-colors focus:border-accent";

export function ContactSection() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    // Honeypot — bots fill hidden fields; humans don't.
    if (data.botcheck) return;

    if (!ACCESS_KEY) {
      setStatus("error");
      setError("The contact form isn't configured yet. Email me directly.");
      return;
    }

    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          subject: "New message from your portfolio",
          from_name: "Portfolio contact form",
          name: data.name,
          email: data.email,
          message: data.message,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setError(json.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  return (
    <section
      id="contact"
      className="relative z-10 bg-[#08080a]/70 backdrop-blur-md"
    >
      <div className="max-w-[1600px] px-8 pt-20 pb-28">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
          Contact
        </h2>
        <p className="mb-12 max-w-2xl text-2xl md:text-3xl font-semibold tracking-tight text-white">
          Have something to build? Let&apos;s talk.
        </p>

        <div className="grid gap-14 md:grid-cols-[1fr_auto]">
          {/* Form */}
          <form onSubmit={handleSubmit} className="max-w-xl">
            {/* Honeypot */}
            <input
              type="checkbox"
              name="botcheck"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/60">
                    Name
                  </span>
                  <input
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    className={fieldClass}
                    placeholder="Your name"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/60">
                    Email
                  </span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    className={fieldClass}
                    placeholder="you@example.com"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/60">
                  Message
                </span>
                <textarea
                  name="message"
                  required
                  rows={5}
                  className={`${fieldClass} resize-y`}
                  placeholder="Tell me about your project…"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="rounded-full bg-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {status === "submitting" ? "Sending…" : "Send message"}
              </button>
              {status === "success" && (
                <span className="font-mono text-xs text-accent" role="status">
                  Thanks — I&apos;ll be in touch.
                </span>
              )}
              {status === "error" && error && (
                <span className="font-mono text-xs text-red-400" role="alert">
                  {error}
                </span>
              )}
            </div>
          </form>

          {/* Social links */}
          <div className="md:min-w-48">
            <h3 className="mb-4 font-mono text-xs uppercase tracking-widest text-white/60">
              Elsewhere
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="group inline-flex items-center gap-1 text-white/90 underline decoration-white/20 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-1 text-white/90 underline decoration-white/20 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                  >
                    {s.label}
                    <ArrowUpRight
                      size={14}
                      strokeWidth={1.5}
                      className="text-white/40 transition-colors group-hover:text-accent"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
