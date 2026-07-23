"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/device";

// Web3Forms access keys are public by design (safe to ship client-side). Create
// a free key tied to the contact inbox at https://web3forms.com and set it as
// NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY. Until then submissions will fail cleanly.
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "";

type Status = "idle" | "submitting" | "success" | "error";

const fieldClass =
  "w-full rounded-md border border-black/15 bg-black/[0.04] px-4 py-3 text-black placeholder-black/40 outline-none transition-colors focus:border-accent";

export function ContactSection() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [senderName, setSenderName] = useState("");
  const successRef = useRef<HTMLDivElement>(null);
  const formWrapRef = useRef<HTMLDivElement>(null);
  // Reserve the form's rendered height so swapping in the (shorter) success
  // state doesn't let the section collapse and jump. Re-measured on resize
  // while the form is up.
  const [reservedHeight, setReservedHeight] = useState<number>();

  useEffect(() => {
    if (status === "success") return;
    const measure = () => {
      if (formWrapRef.current) {
        setReservedHeight(formWrapRef.current.offsetHeight);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [status]);

  // Reveal the success state in the site's intro language: the check badge
  // pops in with a slight overshoot, then the message lines stagger up.
  useEffect(() => {
    const el = successRef.current;
    if (status !== "success" || !el) return;

    const badge = el.querySelector<HTMLElement>("[data-success-badge]");
    const lines = el.querySelectorAll<HTMLElement>("[data-success-line]");

    if (prefersReducedMotion()) {
      gsap.set([badge, ...lines], { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.from(badge, {
        opacity: 0,
        scale: 0.6,
        duration: 0.6,
        ease: "back.out(2)",
      });
      tl.from(
        lines,
        {
          opacity: 0,
          y: 20,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.08,
        },
        0.15,
      );
    }, successRef);

    return () => ctx.revert();
  }, [status]);

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
        setSenderName(String(data.name ?? "").trim());
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
      className="relative z-10 bg-white/70 backdrop-blur-md"
    >
      <div className="max-w-[1600px] px-8 pt-20 pb-28">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
          Contact
        </h2>

        <div style={{ minHeight: reservedHeight }}>
        {status === "success" ? (
          <div
            ref={successRef}
            className="max-w-xl"
            role="status"
            aria-live="polite"
          >
            <div
              data-success-badge
              className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent"
            >
              <Check size={24} strokeWidth={2.5} className="text-black" />
            </div>
            <p
              data-success-line
              className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-black"
            >
              {senderName ? `Thanks, ${senderName}.` : "Thanks."} Message
              received.
            </p>
            <p data-success-line className="max-w-md text-black/60">
              I read every note that comes through here and I&apos;ll get back to
              you soon. In the meantime, feel free to poke around the rest of the
              site.
            </p>
          </div>
        ) : (
          <div ref={formWrapRef}>
            <p className="mb-12 max-w-2xl text-2xl md:text-3xl font-semibold tracking-tight text-black">
              Have something to build? Let&apos;s talk.
            </p>

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
                  <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-black/60">
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
                  <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-black/60">
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
                <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-black/60">
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
              {status === "error" && error && (
                <span className="font-mono text-xs text-red-400" role="alert">
                  {error}
                </span>
              )}
            </div>
          </form>
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
