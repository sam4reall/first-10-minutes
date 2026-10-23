import protocolsData from '../protocols/protocols.json';

export interface PatientFacts {
  patient: {
    age_category?: 'infant' | 'child' | 'adult' | 'elderly' | 'unknown';
    gender?: 'male' | 'female' | 'unknown';
    approx_age?: number | string;
    is_pregnant?: boolean;
  };
  symptoms: string[];
  medications_observed: string[];
  allergies: string[];
  hazards: string[];
  location: {
    address?: string;
    coordinates?: { lat: number; lng: number };
    what3words_approx?: string;
  };
  time_elapsed?: string;
  language_detected?: string;
  raw_extracted_text?: string;
}

export interface FactVerification {
  fact: string;
  source_tag: '[said-by-user]' | '[read-from-photo]' | '[inferred]' | '[unknown]';
  confidence: number; // 0 - 100
  notes?: string;
}

export interface ProtocolStep {
  text: string;
  sourceFact: string;
  protocolId: string;
  protocolName: string;
}

export interface MatchedProtocolResult {
  isMatched: boolean;
  protocolId: string;
  protocolName: string;
  urgency: 'RED' | 'AMBER' | 'GREEN';
  steps: ProtocolStep[];
  neverDo: string[];
  whenToCall: string;
  sourceLabel: string;
  metronomeBpm?: number;
  triggerFactsMatched: string[];
  offlineFallbackActive: boolean;
}

export const SAFE_DEFAULT_RESULT: MatchedProtocolResult = {
  isMatched: false,
  protocolId: "unmatched_safe_default",
  protocolName: "UNMATCHED Protocol (Safe Default)",
  urgency: "RED",
  steps: [
    {
      text: "Call 112 / 108 immediately and keep the emergency operator on speaker.",
      sourceFact: "No specific first-aid protocol matched extracted facts",
      protocolId: "safe_default",
      protocolName: "Universal Emergency Safety Default"
    },
    {
      text: "Keep the person completely still and comfortable. Support their head and neck gently.",
      sourceFact: "Standard non-intervention trauma precaution",
      protocolId: "safe_default",
      protocolName: "Universal Emergency Safety Default"
    },
    {
      text: "DO NOT give any food, liquids, or oral medications.",
      sourceFact: "Aspiration & pre-op risk precaution",
      protocolId: "safe_default",
      protocolName: "Universal Emergency Safety Default"
    },
    {
      text: "Keep the person warm with a jacket or blanket to prevent hypothermic shock.",
      sourceFact: "Universal shock prevention",
      protocolId: "safe_default",
      protocolName: "Universal Emergency Safety Default"
    },
    {
      text: "Continuously check for breathing. If breathing stops, start chest compressions immediately.",
      sourceFact: "Vitals continuous monitoring",
      protocolId: "safe_default",
      protocolName: "Universal Emergency Safety Default"
    }
  ],
  neverDo: [
    "DO NOT give food, water, or oral medicine.",
    "DO NOT shake the person or move them unnecessarily.",
    "DO NOT attempt untested home remedies or folk treatments."
  ],
  whenToCall: "CALL 112 / 108 IMMEDIATELY. Human emergency medical dispatch required.",
  sourceLabel: "Based on International Federation of Red Cross Universal Bystander First-Aid Precaution",
  triggerFactsMatched: [],
  offlineFallbackActive: false
};

/**
 * Key 2: Pure deterministic rule matching engine.
 * Never invents steps. Always binds strictly to protocol JSON definition.
 */
export function matchProtocol(facts: PatientFacts, isOffline: boolean = false): MatchedProtocolResult {
  const allSymptomsText = [
    ...(facts.symptoms || []),
    ...(facts.hazards || []),
    facts.raw_extracted_text || ""
  ].map(s => s.toLowerCase()).join(" ");

  // High-priority check 1: CPR / cardiac arrest (not breathing / gasping / unresponsive)
  if (
    (allSymptomsText.includes("not breathing") || 
     allSymptomsText.includes("cardiac arrest") || 
     allSymptomsText.includes("heart stopped") ||
     (allSymptomsText.includes("unresponsive") && !allSymptomsText.includes("breathing normally")))
  ) {
    const proto = protocolsData.find(p => p.id === "cpr_cardiac_arrest")!;
    return buildMatchedResult(proto, ["not breathing / unresponsive"], isOffline);
  }

  // Iterate over protocols to find direct symptom trigger matches
  for (const proto of protocolsData) {
    const triggers = proto.trigger_conditions.any_of_symptoms || [];
    const matchedTriggers = triggers.filter(trigger => allSymptomsText.includes(trigger.toLowerCase()));

    if (matchedTriggers.length > 0) {
      // Check exclusion conditions if any
      const exclusions = (proto.trigger_conditions as any).exclude_symptoms || [];
      const hasExclusion = exclusions.some((ex: string) => allSymptomsText.includes(ex.toLowerCase()));
      if (!hasExclusion) {
        return buildMatchedResult(proto as any, matchedTriggers, isOffline);
      }
    }
  }

  // Safe fallback if zero protocols triggered
  return {
    ...SAFE_DEFAULT_RESULT,
    offlineFallbackActive: isOffline
  };
}

function buildMatchedResult(proto: any, matchedTriggers: string[], isOffline: boolean): MatchedProtocolResult {
  const steps: ProtocolStep[] = (proto.ordered_steps || []).slice(0, 6).map((stepText: string, idx: number) => ({
    text: stepText,
    sourceFact: matchedTriggers[idx % matchedTriggers.length] || matchedTriggers[0] || "Trigger condition confirmed",
    protocolId: proto.id,
    protocolName: proto.name
  }));

  return {
    isMatched: true,
    protocolId: proto.id,
    protocolName: proto.name,
    urgency: proto.urgency as 'RED' | 'AMBER' | 'GREEN',
    steps,
    neverDo: proto.never_do || [],
    whenToCall: proto.when_to_call,
    sourceLabel: proto.source_label,
    metronomeBpm: proto.metronome_bpm,
    triggerFactsMatched: matchedTriggers,
    offlineFallbackActive: isOffline
  };
}
