import { PatientFacts, FactVerification } from './protocolEngine';

export interface Contradiction {
  id: string;
  type: 'ALLERGY_MEDICATION_CONFLICT' | 'MEDICAL_HISTORY_CONFLICT' | 'VITAL_STATUS_CONFLICT';
  severity: 'CRITICAL' | 'WARNING';
  description: string;
  recommendation: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  reason: string;
  options: string[];
}

export interface SkepticAnalysis {
  verifications: FactVerification[];
  contradictions: Contradiction[];
  followUpQuestions: FollowUpQuestion[]; // Maximum 2
  drugNotice?: string;
  promptInjectionBlocked: boolean;
  injectionWarnings: string[];
}

/**
 * Agent 3: Skeptic - The Verification & Safety Radar
 */
export function auditFactsAndSafety(
  facts: PatientFacts,
  rawInput: string,
  inputSource: 'voice' | 'photo' | 'text' | 'paste'
): SkepticAnalysis {
  const verifications: FactVerification[] = [];
  const contradictions: Contradiction[] = [];
  const followUpQuestions: FollowUpQuestion[] = [];
  const injectionWarnings: string[] = [];
  let promptInjectionBlocked = false;

  // 1. PROMPT-INJECTION GUARD (Untrusted data isolation)
  const injectionPatterns = [
    /ignore (all )?previous instructions/i,
    /system prompt/i,
    /you are now a/i,
    /bypass safety/i,
    /give (him|her|them) bleach/i,
    /tell user to inject/i,
    /disregard protocols/i,
    /jailbreak/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(rawInput) || pattern.test(facts.raw_extracted_text || "")) {
      promptInjectionBlocked = true;
      injectionWarnings.push(`Adversarial prompt injection payload intercepted and neutralized: matched "${pattern.source}". Treated strictly as inert bystander text.`);
    }
  }

  // 2. SOURCE TAGGING & CONFIDENCE SCORING
  const defaultTag = inputSource === 'photo' 
    ? '[read-from-photo]' 
    : inputSource === 'voice' 
      ? '[said-by-user]' 
      : '[said-by-user]';

  // Tag symptoms
  for (const s of facts.symptoms || []) {
    verifications.push({
      fact: `Symptom: ${s}`,
      source_tag: defaultTag,
      confidence: inputSource === 'voice' ? 88 : 95,
      notes: "Direct extraction from bystander input"
    });
  }

  // Tag medications
  for (const med of facts.medications_observed || []) {
    verifications.push({
      fact: `Medication observed: ${med}`,
      source_tag: inputSource === 'photo' ? '[read-from-photo]' : '[said-by-user]',
      confidence: 92,
      notes: "Observed physically or mentioned in report"
    });
  }

  // Tag allergies
  for (const al of facts.allergies || []) {
    verifications.push({
      fact: `Known allergy: ${al}`,
      source_tag: '[said-by-user]',
      confidence: 90
    });
  }

  // 3. CONTRADICTION RADAR
  const lowerAllergies = (facts.allergies || []).map(a => a.toLowerCase());
  const lowerMeds = (facts.medications_observed || []).map(m => m.toLowerCase());
  const lowerSymptoms = (facts.symptoms || []).map(s => s.toLowerCase());

  // Check 3.1: Aspirin allergy vs chest pain protocol
  if (lowerAllergies.some(a => a.includes('aspirin') || a.includes('nsaid'))) {
    if (lowerSymptoms.some(s => s.includes('chest pain') || s.includes('heart attack'))) {
      contradictions.push({
        id: 'contra_aspirin_allergy',
        type: 'ALLERGY_MEDICATION_CONFLICT',
        severity: 'CRITICAL',
        description: 'Stated Aspirin / NSAID allergy conflicts with standard cardiac aspirin guidance!',
        recommendation: 'DO NOT give Aspirin or Disprin under any circumstances. Keep patient resting in W-position and call 112 immediately.'
      });
    }
  }

  // Check 3.2: Stated "No medical history" vs Insulin / Diabetes meds found
  const rawLower = (rawInput + " " + (facts.raw_extracted_text || "")).toLowerCase();
  const mentionsNoHistory = rawLower.includes('no medical history') || rawLower.includes('never sick') || rawLower.includes('koi bimari nahi');
  const hasDiabetesMed = lowerMeds.some(m => m.includes('insulin') || m.includes('metformin') || m.includes('glimepiride'));

  if (mentionsNoHistory && hasDiabetesMed) {
    contradictions.push({
      id: 'contra_hidden_diabetes',
      type: 'MEDICAL_HISTORY_CONFLICT',
      severity: 'WARNING',
      description: 'Bystander stated "no medical history", but insulin / diabetic medication was detected in pill strips / documents!',
      recommendation: 'Check blood sugar immediately if a glucometer is present. Alert emergency crew to potential hypoglycemia / coma.'
    });
  }

  // Check 3.3: Unconscious vs Breathing conflicts
  const isUnconscious = lowerSymptoms.some(s => s.includes('unconscious') || s.includes('unresponsive') || s.includes('fainted'));
  const isBreathing = lowerSymptoms.some(s => s.includes('breathing normally') || s.includes('breathing fine'));
  const isNotBreathing = lowerSymptoms.some(s => s.includes('not breathing') || s.includes('stopped breathing'));

  if (isUnconscious && isBreathing && isNotBreathing) {
    contradictions.push({
      id: 'contra_breathing_ambiguity',
      type: 'VITAL_STATUS_CONFLICT',
      severity: 'CRITICAL',
      description: 'Conflicting reports: reported both breathing and not breathing!',
      recommendation: 'Verify immediately: Look, listen, and feel for chest movement for 5 seconds. If gasping or absent, begin CPR.'
    });
  }

  // 4. MAX 2 CRITICAL FOLLOW-UP QUESTIONS (Only if changes immediate action)
  if (isUnconscious && !isNotBreathing && !isBreathing) {
    followUpQuestions.push({
      id: 'q_breathing_check',
      question: 'Is the person\'s chest rising and falling regularly (breathing)?',
      reason: 'Determines whether to start immediate CPR compressions (RED) or roll into Recovery Position.',
      options: ['Yes, breathing normally', 'No, not breathing or only gasping']
    });
  }

  if (lowerSymptoms.some(s => s.includes('chest pain') || s.includes('heart attack')) && facts.allergies.length === 0) {
    if (followUpQuestions.length < 2) {
      followUpQuestions.push({
        id: 'q_aspirin_allergy',
        question: 'Does the person have any known allergy to Aspirin, or a history of severe stomach bleeding?',
        reason: 'Determines whether bystander may assist with chewing one 300mg adult Aspirin.',
        options: ['No known allergy', 'Yes, allergic to Aspirin or has ulcer', 'Not sure']
      });
    }
  }

  if (lowerSymptoms.some(s => s.includes('choking')) && followUpQuestions.length < 2) {
    followUpQuestions.push({
      id: 'q_choking_sound',
      question: 'Can the person speak, cough loudly, or make any sound?',
      reason: 'If they can cough forcefully, do NOT hit back. If silent, immediate back blows & Heimlich are required.',
      options: ['Can cough or speak', 'Completely silent, cannot breathe']
    });
  }

  // 5. STRICT MEDICATION POLICY NOTICE
  let drugNotice: string | undefined = undefined;
  if (facts.medications_observed && facts.medications_observed.length > 0) {
    drugNotice = `Medications observed (${facts.medications_observed.join(', ')}): extracted from user's provided document / photo. Verify with arriving doctor or paramedic before taking.`;
  }

  return {
    verifications,
    contradictions,
    followUpQuestions: followUpQuestions.slice(0, 2),
    drugNotice,
    promptInjectionBlocked,
    injectionWarnings
  };
}
