/**
 * Structured in-memory representation of TalkForge institutional documents.
 * All company knowledge for Atlas must come from loaded documents — never hardcoded.
 */
export type AtlasContext = {
  founderBrief: string;
  constitution: string;
  forgeLaws: string;
  philosophy: string;
  projects: unknown;
  decisions: unknown;
};
