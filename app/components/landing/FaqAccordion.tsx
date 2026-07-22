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
      "TalkForge is an AI Communication Gym — a place to practice the conversations that matter with a supportive coach called Forge, so you perform better in real life.",
  },
  {
    question: "Who is TalkForge for?",
    answer:
      "Anyone who has an important conversation coming up — interviews, leadership moments, difficult talks, negotiations — and wants deliberate practice instead of more advice.",
  },
  {
    question: "What do Founding Members get?",
    answer:
      "Early access when we open the floor, a direct voice in shaping the product, exclusive updates, and permanent Founding Member recognition.",
  },
  {
    question: "Is this another chatbot?",
    answer:
      "No. Chatbots answer questions. TalkForge helps you practice speaking — with coaching grounded in what you actually said — so confidence comes from repetition.",
  },
  {
    question: "When will TalkForge launch?",
    answer:
      "We’re preparing the first founding cohort carefully. Join the waitlist and you’ll be among the first to know — and among the first to practice.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
