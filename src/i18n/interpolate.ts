/**
 * Replaces {{token}} placeholders in a dictionary string with the given
 * values, e.g. interpolate("Slide {{n}} of 4", { n: 2 }) -> "Slide 2 of 4".
 */
export function interpolate(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}
