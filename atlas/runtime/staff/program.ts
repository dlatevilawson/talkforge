/**
 * AIF-PROGRAM — Program Desk function under AIO-CORE (not a sixth AIO).
 */

import { publish } from "./bus";
import { recordExecution } from "./metrics";
import { assertNotSixthAio } from "./ownership";

export type ProgramWaveStatus = {
  wave: string;
  status: "PENDING" | "RUNNING" | "PASS" | "FAIL" | "BLOCKED";
  evidence_ref?: string;
};

const register: ProgramWaveStatus[] = [];

export function resetProgramRegister(): void {
  register.length = 0;
}

export function programUpdateWave(
  requestId: string,
  wave: string,
  status: ProgramWaveStatus["status"],
  evidence_ref?: string
): void {
  assertNotSixthAio("AIF-PROGRAM");
  recordExecution("AIO-CORE", "final"); // Desk capacity attributed under Core accountability
  const idx = register.findIndex((r) => r.wave === wave);
  const row: ProgramWaveStatus = { wave, status, evidence_ref };
  if (idx >= 0) register[idx] = row;
  else register.push(row);
  publish({
    name: "atlas.program.register_updated",
    at: new Date().toISOString(),
    request_id: requestId,
    publisher: "AIF-PROGRAM",
    payload: { wave, status, evidence_ref },
  });
}

export function getProgramRegister(): readonly ProgramWaveStatus[] {
  return register;
}
