import styles from "./TopicCard.module.css";

export type TopicCardAccent =
  | "steel"
  | "amber"
  | "gold"
  | "mineral"
  | "brass"
  | "ceramic"
  | "crimson";

export type TopicCardOption = {
  id: string;
  number: string;
  title: string;
  blurb: string;
  accent: TopicCardAccent;
};

type Props<T extends TopicCardOption> = {
  option: T;
  index: number;
  selected: boolean;
  onSelect: (option: T) => void;
};

export default function TopicCard<T extends TopicCardOption>({
  option,
  index,
  selected,
  onSelect,
}: Props<T>) {
  return (
    <li style={{ ["--i" as string]: index }}>
      <button
        type="button"
        className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
        data-accent={option.accent}
        aria-pressed={selected}
        aria-label={`${option.title}. ${option.blurb}${selected ? ". Selected." : ""}`}
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
        {selected ? (
          <span className={styles.selectedMark}>Selected</span>
        ) : null}
      </button>
    </li>
  );
}
