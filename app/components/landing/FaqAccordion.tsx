"use client";

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const ITEMS: FaqItem[] = [
  {
    question: "What is TalkForge?",
    answer:
      "An AI Communication Gym — practice the conversations that matter with Forge.",
  },
  {
    question: "Who is it for?",
    answer:
      "Anyone facing a conversation that counts — and wants practice, not more advice.",
  },
  {
    question: "What do Founding Members get?",
    answer:
      "Early access, a voice in what we build, founding notes, and permanent recognition.",
  },
  {
    question: "Is this another chatbot?",
    answer:
      "No. Chatbots answer. TalkForge helps you practice speaking.",
  },
  {
    question: "When does it open?",
    answer:
      "We’re preparing the first founding cohort carefully. Join the waitlist.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-[var(--lp-line)] border-y border-[var(--lp-line)]">
      {ITEMS.map((item, index) => {
        const open = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-[var(--lp-ink-soft)]"
              >
                <span className="font-[family-name:var(--font-lp-display)] text-lg font-medium tracking-[-0.02em] text-[var(--lp-ink)] sm:text-xl">
                  {item.question}
                </span>
                <span
                  aria-hidden
                  className={`text-[var(--lp-muted)] transition-transform duration-300 ${
                    open ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="pb-5 pr-8"
            >
              <p className="max-w-2xl text-base leading-7 text-[var(--lp-muted)]">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
