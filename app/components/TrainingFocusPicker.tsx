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
 * Focus picker — Marketing Brain titles (MKT-001 / IV-PROD-007).
 * Compact square tiles for mobile — never Continuity Home.
 */
export default function TrainingFocusPicker({
  selectedId,
  onSelect,
  eyebrow = "Optional",
  title = "What conversation are you preparing for?",
  subtitle = "Pick the moment that keeps you up at night — or skip and begin with Forge.",
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
                aria-label={`${option.title}. ${option.blurb}`}
                onClick={() => onSelect(option)}
              >
                <div className={styles.cardTop}>
                  <p className={styles.number}>{option.number}</p>
                  <span className={styles.arrow} aria-hidden="true">
                    <svg viewBox="0 0 20 20">
                      <path d="M5 15 15 5M8 5h7v7" />
                    </svg>
                  </span>
                </div>
                <p className={styles.machineTitle}>{option.title}</p>
                <p className={styles.blurb}>{option.blurb}</p>
                <span className={styles.pill}>
                  {selected ? "Selected" : "Prepare"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
