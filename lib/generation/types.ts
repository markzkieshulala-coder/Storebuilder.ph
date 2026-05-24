export interface GenerationMemoryEntry {
  generation_id: string;
  timestamp: string;
  niche: string;
  intent_summary: string;
  fingerprint: {
    hero_type: string;
    grid_system: string;
    display_font: string;
    easing_family: string;
    agency_persona: string;
    photography_style: string;
    primary_color: string;
  };
  layout_sections: string[];
  clearance_status: string;
}

export interface GenerationResult {
  html: string;
  blueprint: Record<string, unknown>;
  niche: string;
  brandName: string;
}
