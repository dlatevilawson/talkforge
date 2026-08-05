"use client";

import styles from "./TrainingFocusPicker.module.css";
import {
  TRAINING_FOCUS_OPTIONS,
  type TrainingFocusOption,
} from "@/lib/system2/training-focus";

type Props = {
  selectedId: string | null;
  onSelect: (option: TrainingFocusOption) => void;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
};

/**
 * Visual Machines focus picker (IV-UX-009).
 * Selection surface only — never mounted as Continuity Home.
 */
export default function TrainingFocusPicker({
  selectedId,
  onSelect,
  eyebrow = "Optional",
  title = "Choose a training focus",
  subtitle = "Tap one Machine to tell your Coach what to train — or skip and start practicing now.",
}: Props) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      <ul className={styles.grid} role="list">
        {TRAINING_FOCUS_OPTIONS.map((option, index) => {
          const selected = option.id === selectedId;
          return (
            <li key={option.id} style={{ ["--i" as string]: index }}>
              <button
                type="button"
                className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
                data-accent={option.accent}
                aria-pressed={selected}
                onClick={() => onSelect(option)}
              >
                <p className={styles.number}>{option.number}</p>
                <p className={styles.machineTitle}>{option.title}</p>
                <p className={styles.blurb}>{option.blurb}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.pill}>
                    {selected ? "Selected" : "Train this"}
                  </span>
                  <span className={styles.arrow} aria-hidden="true">
                    <svg viewBox="0 0 20 20">
                      <path d="M5 15 15 5M8 5h7v7" />
                    </svg>
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
