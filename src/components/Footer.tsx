import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react"; // install lucide-react if not yet: npm i lucide-react

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-200 bg-white text-neutral-700">
      {/* Top grid */}
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <div className="relative h-10 w-10">
            <Image
              src="/images/RalahamiLogo.png"
              alt="Ralahami logo"
              fill
              className="object-contain"
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed">
            Authentic Sri Lankan cuisine in the heart of Colombo. Flavors
            crafted with love, tradition, and local ingredients.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide">
            Quick Links
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:underline">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/reservation" className="hover:underline">
                Reservations
              </Link>
            </li>
            <li>
              <Link href="/products" className="hover:underline">
                Online Ordering
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact info */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide">
            Contact
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>123 Galle Road, Colombo 03, Sri Lanka</li>
            <li>
              <a href="tel:+94112345678" className="hover:underline">
                +94 11 234 5678
              </a>
            </li>
            <li>
              <a href="mailto:hello@ralahami.lk" className="hover:underline">
                hello@ralahami.lk
              </a>
            </li>
          </ul>
        </div>

        {/* Hours */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide">
            Opening Hours
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Mon–Thu: 11:30 – 22:00</li>
            <li>Fri: 11:30 – 23:00</li>
            <li>Sat: 10:00 – 23:00</li>
            <li>Sun: 10:00 – 21:30</li>
          </ul>
        </div>
      </div>

      {/* Social + bottom bar */}
      <div className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Ralahami. All rights reserved.
          </p>
          <div className="flex gap-4 text-neutral-500">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-black"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-black"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-black"
            >
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
