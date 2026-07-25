/**
 * ATLAS-P2 / ATLAS-P3 shared envelope types (target plane).
 * Labels must survive hops; never silent upgrade. AuditEvents are never Canonical.
 */

export type RequestSource =
  | "founder"
  | "cadence"
  | "executive"
  | "ops"
  | "correction"
  | "sandbox";

export type AuthorityLabel =
  | "authoritative"
  | "canonical"
  | "operational"
  | "legacy"
  | "draft"
  | "proposal";

export type KnowledgePlane =
  | "atos"
  | "legacy-atlas"
  | "ops"
  | "sandbox"
  | "unknown";

export type AuthorityResult = "pass" | "escalate" | "reject";

export type ValidationResult = "PASS" | "RETURN" | "ESCALATE" | "STOP";

export type RecommendationType =
  | "standard"
  | "decision_pack"
  | "priority_proposal"
  | "coordination"
  | "escalation"
  | "insufficient_knowledge"
  | "cadence_brief";

export type MemoryClass =
  | "temporary"
  | "operational"
  | "promotion_candidate"
  | "discarded";

export type RuntimeStage =
  | "ingress"
  | "authority"
  | "knowledge"
  | "context"
  | "cognition"
  | "composition"
  | "integrity"
  | "escalation"
  | "exchange"
  | "memory"
  | "trace"
  | "hub";

export type RequestEnvelope = {
  request_id: string;
  source: RequestSource;
  intent: string;
  payload_ref: string;
  received_at: string;
};

export type AuthorityVerdict = {
  request_id: string;
  result: AuthorityResult;
  reasons: string[];
  limits_applied: string[];
};

export type KnowledgeItem = {
  source_id: string;
  authority_label: AuthorityLabel;
  status: string;
  excerpt_or_ref: string;
  plane: KnowledgePlane;
};

export type ContextBundle = {
  request_id: string;
  items: KnowledgeItem[];
  objective: string;
  constraints: string[];
  assembled_at: string;
  locked: boolean;
};

export type ReasoningProduct = {
  request_id: string;
  objective: string;
  evidence: string[];
  facts: string[];
  assumptions: string[];
  inferences: string[];
  alternatives: string[];
  tradeoffs: string[];
  risks: string[];
  long_term_notes: string[];
  missing_info: string[];
  draft_recommendation: string;
  confidence: "low" | "medium" | "high";
  escalation_flag: boolean;
};

export type RecommendationArtifact = {
  recommendation_id: string;
  request_id: string;
  type: RecommendationType;
  binding: false;
  escalation: boolean;
  authority_labels_used: AuthorityLabel[];
  objective: string;
  recommendation: string;
  alternatives: string[];
  tradeoffs: string[];
  risks: string[];
  confidence: "low" | "medium" | "high";
  missing_info: string[];
};

export type ValidationVerdict = {
  request_id: string;
  result: ValidationResult;
  failed_stages: string[];
  notes: string[];
};

export type AuditEvent = {
  event_id: string;
  request_id: string;
  stage: RuntimeStage;
  summary: string;
  refs: string[];
  /** Always false — audit must never Canonicalize. */
  canonical: false;
  at: string;
};

export type MemoryDisposition = {
  request_id: string;
  class: MemoryClass;
  summary: string;
  refs: string[];
  canonical: false;
};

export type WorkflowState = {
  request_id: string;
  stage: RuntimeStage;
  request?: RequestEnvelope;
  authority?: AuthorityVerdict;
  knowledge?: KnowledgeItem[];
  context?: ContextBundle;
  reasoning?: ReasoningProduct;
  recommendation?: RecommendationArtifact;
  validation?: ValidationVerdict;
  disposition?: MemoryDisposition;
  audit: AuditEvent[];
  error?: string;
};
