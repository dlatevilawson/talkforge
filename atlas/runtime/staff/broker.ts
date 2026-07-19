import type { AuthorityLabel } from "../types/envelopes";
import { publish } from "./bus";
import { recordExecution } from "./metrics";
import {
  preserveRiskNotice,
  riskNoticeAltered,
  type SentinelRiskNotice,
} from "./sentinel-wall";
import { getOfficePack } from "./offices/packs";

const riskStore = new Map<string, SentinelRiskNotice>();

export function resetBrokerStore(): void {
  riskStore.clear();
}

export function brokerIngestStatus(
  requestId: string,
  statusId: string,
  sourceExec: string,
  authorityLabel: AuthorityLabel
): void {
  recordExecution("AIO-BROKER", "stage");
  void getOfficePack("AIO-BROKER").prompt;
  publish({
    name: "atlas.broker.status_ingested",
    at: new Date().toISOString(),
    request_id: requestId,
    publisher: "AIO-BROKER",
    payload: {
      status_id: statusId,
      source_exec: sourceExec,
      authority_label: authorityLabel,
    },
  });
}

export function brokerIngestRiskNotice(
  requestId: string,
  notice: SentinelRiskNotice
): SentinelRiskNotice {
  recordExecution("AIO-BROKER", "stage");
  const frozen = preserveRiskNotice(notice);
  riskStore.set(frozen.id, frozen);
  publish({
    name: "atlas.broker.status_ingested",
    at: new Date().toISOString(),
    request_id: requestId,
    publisher: "AIO-BROKER",
    payload: {
      status_id: frozen.id,
      source_exec: "EXEC-SENTINEL",
      authority_label: "authoritative",
      risk_notice: true,
      summary: frozen.summary,
    },
  });
  return frozen;
}

/** Attempts to mutate a stored Risk Notice — must fail. */
export function brokerTryAlterRiskNotice(
  id: string,
  summary: string,
  body: string
): never | void {
  const original = riskStore.get(id);
  if (!original) throw new Error(`Unknown Risk Notice ${id}`);
  if (riskNoticeAltered(original, { summary, body })) {
    throw new Error("AIO-BROKER: Risk Notice immutability violation");
  }
}

export function brokerSignalDeadlock(
  requestId: string,
  threadId: string,
  parties: string[],
  reason: string
): void {
  recordExecution("AIO-BROKER", "stage");
  publish({
    name: "atlas.broker.deadlock",
    at: new Date().toISOString(),
    request_id: requestId,
    publisher: "AIO-BROKER",
    payload: { thread_id: threadId, parties, reason },
  });
}

export function brokerPrepareJointOption(
  requestId: string,
  optionId: string,
  execInputs: string[],
  dissents: string[]
): void {
  recordExecution("AIO-BROKER", "stage");
  publish({
    name: "atlas.broker.joint_option_ready",
    at: new Date().toISOString(),
    request_id: requestId,
    publisher: "AIO-BROKER",
    payload: {
      option_id: optionId,
      exec_inputs: execInputs,
      dissents,
    },
  });
}
