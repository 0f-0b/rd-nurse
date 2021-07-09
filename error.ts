import { almostEqual, unique } from "./util.ts";

export const errorTypes = ["uncued_hit", "skipped_hit", "missing_hit", "unrecognized_normal", "unrecognized_square", "unexpected_skipshot", "overlapping_skipshot"] as const;
export type ErrorType = typeof errorTypes[number];

export interface Error {
  type: ErrorType;
  time: number;
}

export function sortErrors(errors: Error[]): Error[] {
  errors.sort((a, b) => errorTypes.indexOf(a.type) - errorTypes.indexOf(b.type) || a.time - b.time);
  unique(errors, (a, b) => a.type === b.type && almostEqual(a.time, b.time));
  return errors;
}
