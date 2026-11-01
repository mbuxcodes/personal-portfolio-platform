/**
 * The convention for response mappers (ARCHITECTURE_DESIGN.md ADR-18, SA-5; API_DESIGN.md Section 8).
 *
 * A mapper turns a stored or computed record into exactly the shape a caller may see. There is one
 * for each resource and audience: `toPublicSkill`, `toAdminSkill`, and so on, written in the
 * module's `<module>.mappers.ts`. The rules:
 *
 * 1. Explicit allow-list. A mapper names every field it returns. A field that is not named cannot
 *    appear, whatever the record contains, so adding a private field to a model never changes a
 *    response.
 * 2. No spreading or cloning. Never `{ ...record }`, `[...list]`, `...rest`, `Object.assign`, or
 *    `structuredClone`. Copying whatever is there is the opposite of an allow-list. Copy a list
 *    with `.map` or `.slice`. A test fails if a `*.mappers.ts` file does any of these.
 * 3. Public and admin shapes are separate mappers, never one mapper with a flag.
 * 4. Derived values (`isExpired`) and renamed values (`_id` to `id`, dates to ISO text, empty
 *    optionals to `null`) are written out in the mapper. Fields that pass through unchanged use
 *    `pickFields`.
 * 5. A mapper has no rules of its own. It does not decide what a caller may see. The service does
 *    that by asking only for the records the caller may see, and the mapper only shapes them.
 */
export type Mapper<Source, Output> = (source: Source) => Output;

/**
 * Builds a mapper that copies exactly the listed fields and nothing else. Curried so the record
 * type is given once and the field names are checked against it:
 *
 *     const toSkillSummary = pickFields<SkillRecord>()(['name', 'level']);
 */
export function pickFields<Source extends object>() {
  return <Key extends keyof Source>(keys: readonly Key[]): Mapper<Source, Pick<Source, Key>> =>
    (source) => {
      const output = {} as Pick<Source, Key>;
      for (const key of keys) output[key] = source[key];
      return output;
    };
}

/** Applies a mapper to each item of a list, for collection responses. */
export function mapItems<Source, Output>(
  mapper: Mapper<Source, Output>,
): (items: readonly Source[]) => Output[] {
  return (items) => items.map((item) => mapper(item));
}
