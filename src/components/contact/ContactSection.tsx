"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/device";

// Web3Forms keys are public by design; safe client-side.
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "";

type Status = "idle" | "submitting" | "success" | "error";

// Focus lifts the card like a hovered project card: white + 10px accent ring, same ease.
const cardClass =
  "relative flex flex-col rounded-md bg-white/70 p-4 ring-0 ring-accent/0 transition-[box-shadow,background-color] duration-300 ease-[cubic-bezier(0.05,0,0,1)] has-[:focus]:z-10 has-[:focus]:bg-white has-[:focus]:ring-[10px] has-[:focus]:ring-accent md:p-6";
const promptClass =
  "block h-6 md:h-[1.875rem] uppercase leading-none tracking-tighter text-black/40 transition-[font-size,color] duration-200 text-md md:text-2xl group-has-[:focus]:text-base group-has-[:focus]:text-black group-has-[:is(input,textarea):not(:placeholder-shown)]:text-base group-has-[:is(input,textarea):not(:placeholder-shown)]:text-black";
const bigInputClass =
  "mt-4 w-full bg-transparent text-2xl tracking-tight text-black md:text-3xl";

export function ContactSection() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [senderName, setSenderName] = useState("");
  const successRef = useRef<HTMLDivElement>(null);
  const formWrapRef = useRef<HTMLDivElement>(null);
  // Reserve form height so the shorter success state doesn't collapse the section.
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

  // Success reveal in the site intro's motion language.
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

    // Honeypot
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
      className="relative z-10 gutter-x bg-white/40 backdrop-blur-md"
    >
      {/* Same gutter/cap split as the other sections so left edges align past 1600px. */}
      <div className="mx-auto max-w-[1600px] pt-10 pb-28">
        <h2 className="mb-10 font-mono text-xs uppercase tracking-widest text-black">
          Let's build something
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
            <form onSubmit={handleSubmit}>
            {/* Honeypot */}
            <input
              type="checkbox"
              name="botcheck"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {/* data-focus-quiet: the card ring is the focus ring; silences the global outline. */}
            <div className="grid gap-4 md:grid-cols-2" data-focus-quiet>
              <div className="flex flex-col gap-4">
                <div className={`${cardClass} group flex-1`}>
                  <label htmlFor="contact-name" className={promptClass}>
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder=" "
                    className={bigInputClass}
                  />
                </div>

                <div className={`${cardClass} group flex-1`}>
                  <label htmlFor="contact-email" className={promptClass}>
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder=" "
                    className={bigInputClass}
                  />
                </div>
              </div>

              <div className={`${cardClass} group`}>
                <label htmlFor="contact-message" className={promptClass}>
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={6}
                  placeholder=" "
                  className={`${bigInputClass} flex-1 resize-none`}
                />
              </div>
            </div>

            <div className="mt-6 mx-1 flex items-center justify-end gap-4">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="nav-link -ml-2.5 cursor-pointer font-mono text-xs uppercase tracking-widest text-black/80 disabled:opacity-50"
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
