import { Injectable } from '@angular/core';
import { DeductionCase } from '../models/deduction.models';
import { GenOptions, generate, parseCode, shareCode } from '../engine/generator';

export type { GenOptions } from '../engine/generator';

/** Façade injectable du générateur pur (core/engine/generator). */
@Injectable({ providedIn: 'root' })
export class DeductionGeneratorService {
  generate(o: GenOptions): DeductionCase | null { return generate(o); }
  parseCode(code: string): GenOptions | null { return parseCode(code); }
  shareCode = shareCode;
  randomSeed(): string { return Math.random().toString(36).slice(2, 8); }
}
