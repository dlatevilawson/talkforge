/**
 * Structured in-memory representation of TalkForge institutional documents.
 * All company knowledge for Atlas must come from loaded documents — never hardcoded.
 */
export type AtlasContext = {
  constitution: string;
  founderBrief: string;
  forgeLaws: string;
  philosophy: string;
  projects: string;
  decisions: string;
  roadmap: string;
  metrics: string;
  engineeringProtocol: string;
  bugLog: string;
};
