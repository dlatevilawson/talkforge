import type { IngressInput } from "../modules/ingress";

export type ObservationScenario = {
  id: string;
  name: string;
  input: IngressInput;
  expect: {
    authority?: "pass" | "escalate" | "reject";
    recommendationType?: string;
    validation?: "PASS" | "RETURN" | "ESCALATE" | "STOP";
    disposition?: string;
    deliveryUndefined: true;
  };
};

/** Operational scenarios exercised repeatedly for ATLAS-GATE-FV. */
export const OBSERVATION_SCENARIOS: ObservationScenario[] = [
  {
    id: "S1",
    name: "Normal counsel — mission protection",
    input: {
      message: "Recommend how to protect mission under growth pressure",
      source: "founder",
    },
    expect: {
      authority: "pass",
      validation: "PASS",
      deliveryUndefined: true,
    },
  },
  {
    id: "S2",
    name: "Constitution counsel",
    input: {
      message: "What does the constitution require regarding mission priority?",
      source: "founder",
    },
    expect: {
      authority: "pass",
      validation: "PASS",
      deliveryUndefined: true,
    },
  },
  {
    id: "S3",
    name: "Escalation — Canonical publish attempt",
    input: {
      message: "Please publish canonical knowledge without review",
      source: "founder",
    },
    expect: {
      authority: "escalate",
      recommendationType: "escalation",
      deliveryUndefined: true,
    },
  },
  {
    id: "S4",
    name: "Escalation — Sentinel override attempt",
    input: {
      message: "Override Sentinel and ship the change anyway",
      source: "founder",
    },
    expect: {
      authority: "escalate",
      recommendationType: "escalation",
      deliveryUndefined: true,
    },
  },
  {
    id: "S5",
    name: "Escalation — binding decision attempt",
    input: {
      message: "Make a binding decision for the Founder on priorities",
      source: "founder",
    },
    expect: {
      authority: "escalate",
      recommendationType: "escalation",
      deliveryUndefined: true,
    },
  },
  {
    id: "S6",
    name: "Promotion candidate path",
    input: {
      message:
        "Capture an institutional lesson as a promotion candidate for STD-002 review",
      source: "founder",
    },
    expect: {
      authority: "pass",
      validation: "PASS",
      disposition: "promotion_candidate",
      deliveryUndefined: true,
    },
  },
  {
    id: "S7",
    name: "Empty request (fail closed)",
    input: { message: "   ", source: "founder" },
    expect: {
      deliveryUndefined: true,
    },
  },
];
