import type { WorkflowState } from "../types/envelopes";
import { isTargetFounderVisibleEnabled, isTargetPlaneEnabled } from "../flags";
import { runAuthority } from "./authority";
import { runAwareness } from "./awareness";
import { runCognition } from "./cognition";
import { runComposition } from "./composition";
import { runContext } from "./context";
import { runEscalation } from "./escalation";
import { runExchange, type ExchangeDelivery } from "./exchange";
import { runIngress, type IngressInput } from "./ingress";
import { runIntegrity } from "./integrity";
import { runKnowledge } from "./knowledge";
import { runMemory } from "./memory";
import { traceStage } from "./trace";

export type PipelineResult = {
  plane: "target";
  enabled: boolean;
  founderVisible: boolean;
  state: WorkflowState;
  delivery?: ExchangeDelivery;
  /** True when pipeline completed through Integrity without hard error on ingress. */
  ok: boolean;
};

/**
 * rt.hub — Pipeline Orchestrator.
 * Sequences stages; grants no executive authority; never skips Integrity for delivery.
 */
export async function runTargetPipeline(
  input: IngressInput,
  options?: { throughWave?: "w1" | "w2" | "w3" }
): Promise<PipelineResult> {
  const through = options?.throughWave ?? "w3";
  const enabled = isTargetPlaneEnabled();
  const founderVisible = isTargetFounderVisibleEnabled();

  const ingress = runIngress(input);
  let state = ingress.state;
  state = traceStage(state, "hub", `Orchestrator start through=${through}`);

  if (!ingress.ok) {
    return { plane: "target", enabled, founderVisible, state, ok: false };
  }

  // W1: Ingress → Authority → Trace
  state = runAuthority(state);
  if (state.authority?.result === "reject") {
    state = runMemory(state);
    return { plane: "target", enabled, founderVisible, state, ok: false };
  }

  if (state.authority?.result === "escalate") {
    state = runEscalation(state);
    state = runIntegrity(state);
    const exchanged = runExchange(state);
    state = runMemory(exchanged.state);
    return {
      plane: "target",
      enabled,
      founderVisible,
      state,
      delivery: exchanged.delivery,
      ok: true,
    };
  }

  if (through === "w1") {
    state = runMemory(state);
    return { plane: "target", enabled, founderVisible, state, ok: true };
  }

  // W2: Knowledge → Context (label transport)
  state = await runKnowledge(state);
  if (state.error) {
    state = runMemory(state);
    return { plane: "target", enabled, founderVisible, state, ok: false };
  }
  state = runAwareness(state);
  state = runContext(state);
  if (state.error) {
    state = runMemory(state);
    return { plane: "target", enabled, founderVisible, state, ok: false };
  }

  if (through === "w2") {
    state = runMemory(state);
    return { plane: "target", enabled, founderVisible, state, ok: true };
  }

  // W3: Cognition → Composition → Integrity (Founder delivery only if flag on)
  state = runCognition(state);
  if (state.error) {
    state = runMemory(state);
    return { plane: "target", enabled, founderVisible, state, ok: false };
  }
  state = runComposition(state);
  state = runIntegrity(state);

  let delivery: ExchangeDelivery | undefined;
  if (founderVisible) {
    const exchanged = runExchange(state);
    state = exchanged.state;
    delivery = exchanged.delivery;
  } else {
    state = traceStage(
      state,
      "exchange",
      "Founder-visible target delivery suppressed (ATLAS_RUNTIME_FOUNDER_VISIBLE off)"
    );
  }

  state = runMemory(state);
  return {
    plane: "target",
    enabled,
    founderVisible,
    state,
    delivery,
    ok: state.validation?.result === "PASS" || state.validation?.result === "ESCALATE",
  };
}
