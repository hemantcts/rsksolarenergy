/**
 * Solar pump calculator: the panels a pump needs and the water it should deliver, from the MNRE
 * specification (src/data/pump-spec.ts). The only other figure is the roof or ground area per kW
 * the rest of the site plans with.
 */
import { LITRES_PER_WP, MAX_HEAD_IN_MODELS, MIN_ARRAY_WP, PUMP_HP, type MotorKind, type PumpKind } from '../../data/pump-spec';
import { SOLAR_CONFIG } from '../../config/solar-config';

export interface PumpInput {
  kind: PumpKind;
  motor: MotorKind;
  /** Total dynamic head in metres. */
  head: number;
  /** Pump size in HP, or the water needed a day in litres; one of the two. */
  hp?: number;
  litresPerDay?: number;
}

export interface PumpResult {
  ok: true;
  hp: number;
  arrayWp: number;
  /** The head the litres-per-watt figure was read at: the nearest listed head at or above yours. */
  ratedHead: number;
  litresPerWp: number;
  /** Minimum daily output on the specification's test day. */
  litresPerDay: number;
  areaSqFt: number;
  /** When sizing from water needed: the smallest pump in the table that meets it. */
  fromNeed?: { needed: number; enough: boolean };
  notes: string[];
}

export type PumpOutcome = PumpResult | { ok: false; message: string };

const FT_PER_M = 3.28084;
export const feetToMetres = (ft: number) => ft / FT_PER_M;

/** Litres per watt at the first listed head at or above `head`, which never overstates output. */
export function litresPerWpAt(motor: MotorKind, head: number) {
  return LITRES_PER_WP[motor].find((r) => r.head >= head) ?? null;
}

export function pumpEstimate(input: PumpInput): PumpOutcome {
  const { kind, motor, head } = input;
  if (!(head > 0)) return { ok: false, message: 'Enter the total head in metres.' };
  const rate = litresPerWpAt(motor, head);
  if (!rate) return { ok: false, message: 'The specification lists heads up to 250 metres. A deeper bore needs a site survey.' };

  let hp = input.hp;
  let fromNeed: PumpResult['fromNeed'];
  if (!hp) {
    const need = input.litresPerDay;
    if (!(need && need > 0)) return { ok: false, message: 'Choose a pump size, or enter how many litres you need a day.' };
    const found = PUMP_HP.find((h) => MIN_ARRAY_WP[kind][String(h)]! * rate.litres >= need);
    hp = found ?? PUMP_HP[PUMP_HP.length - 1];
    fromNeed = { needed: need, enough: found !== undefined };
  }
  const arrayWp = MIN_ARRAY_WP[kind][String(hp)];
  if (!arrayWp) return { ok: false, message: 'Choose a pump size from the list.' };

  const notes: string[] = [];
  if (head > MAX_HEAD_IN_MODELS[kind]) {
    notes.push(
      kind === 'surface'
        ? 'The specification lists surface pumps up to a 30 metre head. At this depth a submersible pump is the usual choice.'
        : 'This head is deeper than the specification lists for pumps of this size. Larger submersible pumps are made for it; it needs a site survey.',
    );
  }
  if (kind === 'surface') notes.push('A surface pump lifts water by suction, which only works while the water level is shallow. If the level is deep or falls in summer, choose a submersible pump.');
  if (fromNeed && !fromNeed.enough) notes.push('Even a 10 HP pump in this table falls short of that much water at this head. A larger system needs a site survey.');

  return {
    ok: true,
    hp,
    arrayWp,
    ratedHead: rate.head,
    litresPerWp: rate.litres,
    litresPerDay: Math.round(arrayWp * rate.litres),
    areaSqFt: Math.round((arrayWp / 1000) * SOLAR_CONFIG.generation.sqFtPerKw),
    ...(fromNeed ? { fromNeed } : {}),
    notes,
  };
}

/** Yearly diesel spend from the farmer's own figures; nothing assumed. */
export function dieselPerYear(litresPerHour: number, hoursPerDay: number, daysPerYear: number, pricePerLitre: number): number | null {
  const vals = [litresPerHour, hoursPerDay, daysPerYear, pricePerLitre];
  if (vals.some((v) => !(v > 0))) return null;
  return litresPerHour * hoursPerDay * daysPerYear * pricePerLitre;
}
