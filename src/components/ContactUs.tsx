/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  website: string; // honeypot
};

const initialState: FormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  website: "",
};

export default function ContactUs() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [fail, setFail] = useState<string | null>(null);

  const validate = () => {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Your name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email.";
    if (!form.subject.trim()) e.subject = "Please add a subject.";
    if (!form.message.trim() || form.message.trim().length < 10)
      e.message = "Please write at least 10 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSuccess(null);
    setFail(null);
    if (!validate()) return;
    if (form.website) {
      // Honeypot filled -> silently pretend success without calling API
      setSuccess("Thanks! We’ve received your message.");
      setForm(initialState);
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to send message.");
      }
      setSuccess("Thanks! We’ve received your message. We’ll get back to you soon.");
      setForm(initialState);
    } catch (err: any) {
      setFail(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16">
      <div className="mx-auto w-full max-w-5xl px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="uppercase text-xs tracking-[0.25em] text-amber-600">Contact</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold">Contact Us</h2>
          <p className="mt-3 text-base text-neutral-600">
            Questions, feedback, or reservations—drop us a line.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Info card */}
          <div className="rounded-3xl border border-neutral-200 p-6 lg:p-8 bg-white">
            <h3 className="text-xl font-semibold">Visit</h3>
            <p className="mt-2 text-neutral-700">123 Galle Road, Colombo 03, Sri Lanka</p>

            <h3 className="mt-6 text-xl font-semibold">Contact</h3>
            <p className="mt-2 text-neutral-700">
              +94 11 234 5678<br />
              hello@ralahami.lk
            </p>

            <h3 className="mt-6 text-xl font-semibold">Hours</h3>
            <ul className="mt-2 text-neutral-700 space-y-1">
              <li>Mon–Thu: 11:00 – 22:00</li>
              <li>Fri–Sun: 11:00 – 23:00</li>
            </ul>

            <div className="mt-6">
              <a
                href="https://maps.google.com/?q=123+Galle+Road+Colombo+03+Sri+Lanka"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-500 underline underline-offset-4"
              >
                Open in Maps
              </a>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="rounded-3xl border border-neutral-200 p-6 lg:p-8 bg-white">
            {/* Honeypot */}
            <input
              type="text"
              name="website"
              autoComplete="off"
              tabIndex={-1}
              value={form.website}
              onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Your name"
                  required
                />
                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="you@example.com"
                  required
                />
                {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Phone (optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="+94 …"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Reservation / Catering / Feedback"
                  required
                />
                {errors.subject && <p className="mt-1 text-xs text-rose-600">{errors.subject}</p>}
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                rows={6}
                placeholder="Tell us how we can help…"
                required
              />
              {errors.message && <p className="mt-1 text-xs text-rose-600">{errors.message}</p>}
            </div>

            {/* Alerts */}
            {success && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                {success}
              </div>
            )}
            {fail && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
                {fail}
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-5 py-2.5 text-white font-medium hover:bg-amber-500 disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
