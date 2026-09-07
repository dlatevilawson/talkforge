"use client";

import styles from "./TrainingFocusPicker.module.css";
import TopicCard from "./TopicCard";
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
  eyebrow,
  title = "Select an Active Focus Scenario",
  subtitle,
}: Props) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.title}>{title}</h2>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </header>

      <ul className={styles.grid} role="list">
        {TRAINING_FOCUS_OPTIONS.map((option, index) => {
          const selected = option.id === selectedId;
          return (
            <TopicCard
              key={option.id}
              option={option}
              index={index}
              selected={selected}
              onSelect={onSelect}
            />
          );
        })}
      </ul>
    </div>
  );
}
