/** Thousands separators, so a count of 1051 does not read as a part number */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}
