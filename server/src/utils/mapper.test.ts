import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mapItems, pickFields, type Mapper } from '#utils/mapper';

/**
 * Stands in for a database identifier: a value with a `toString` method, as `ObjectId` has. The
 * method is on the prototype and the value is a plain field, so `structuredClone` can copy a
 * record that contains one. An object literal with its own method could not be cloned.
 */
class ObjectIdLike {
  readonly hex: string;

  constructor(hex: string) {
    this.hex = hex;
  }

  toString(): string {
    return this.hex;
  }
}

/** A stored record, as the data layer returns it: with fields that no caller may ever see. */
interface SkillRecord {
  _id: { toString(): string };
  name: string;
  category: string;
  level: 'beginner' | 'expert' | null;
  isDeleted: boolean;
  internalNotes: string;
  passwordHash: string;
  createdAt: Date;
}

const RECORD: SkillRecord = {
  _id: new ObjectIdLike('e5f6a7b8c9d0e1f2a3b4c5d6'),
  name: 'TypeScript',
  category: 'Languages',
  level: 'expert',
  isDeleted: false,
  internalNotes: 'ask about the Rust gap',
  passwordHash: '$2b$12$abcdefghijklmnopqrstuv',
  createdAt: new Date('2026-10-20T09:40:00Z'),
};

// The convention, as a module's `<module>.mappers.ts` writes it: explicit fields, no spreading.
const toPublicSkill = pickFields<SkillRecord>()(['name', 'level']);

const toAdminSkill = (record: SkillRecord) => ({
  id: record._id.toString(),
  name: record.name,
  category: record.category,
  level: record.level,
  createdAt: record.createdAt.toISOString(),
});

describe('pickFields', () => {
  it('returns exactly the listed fields', () => {
    expect(toPublicSkill(RECORD)).toEqual({ name: 'TypeScript', level: 'expert' });
    expect(Object.keys(toPublicSkill(RECORD))).toEqual(['name', 'level']);
  });

  it('never returns a field that is not listed, whatever the record holds', () => {
    const output = toPublicSkill({ ...RECORD, apiKey: 'sk-live-123', extra: 1 } as SkillRecord);

    expect(output).not.toHaveProperty('passwordHash');
    expect(output).not.toHaveProperty('internalNotes');
    expect(output).not.toHaveProperty('apiKey');
    expect(output).not.toHaveProperty('extra');
    expect(JSON.stringify(output)).not.toMatch(/passwordHash|sk-live|Rust|\$2b/);
  });

  it('does not change the record or share it', () => {
    const before = structuredClone(RECORD);

    const output = toPublicSkill(RECORD);

    expect(RECORD).toEqual(before);
    expect(output).not.toBe(RECORD);
  });

  it('keeps a field that is null', () => {
    expect(toPublicSkill({ ...RECORD, level: null })).toEqual({ name: 'TypeScript', level: null });
  });

  it('checks the field names against the record type', () => {
    // @ts-expect-error 'colour' is not a field of SkillRecord.
    pickFields<SkillRecord>()(['name', 'colour']);
  });
});

describe('mapItems', () => {
  it('applies a mapper to every item, in order', () => {
    const second = { ...RECORD, name: 'Rust' };

    expect(mapItems(toPublicSkill)([RECORD, second])).toEqual([
      { name: 'TypeScript', level: 'expert' },
      { name: 'Rust', level: 'expert' },
    ]);
  });

  it('returns an empty list for an empty list', () => {
    expect(mapItems(toPublicSkill)([])).toEqual([]);
  });

  it('gives the mapper only the item, so a mapper cannot depend on its position', () => {
    const seen: unknown[][] = [];
    const spy: Mapper<number, number> = (...args: unknown[]) => {
      seen.push(args);
      return 0;
    };

    mapItems(spy)([10, 20]);

    expect(seen).toEqual([[10], [20]]);
  });
});

describe('public and admin mappers', () => {
  it('are separate, and the public one shows less', () => {
    const publicShape = toPublicSkill(RECORD);
    const adminShape = toAdminSkill(RECORD);

    expect(Object.keys(adminShape)).toEqual(['id', 'name', 'category', 'level', 'createdAt']);
    for (const key of Object.keys(publicShape)) expect(adminShape).toHaveProperty(key);
    expect(publicShape).not.toHaveProperty('id');
    expect(publicShape).not.toHaveProperty('createdAt');
  });

  it('write the derived and renamed values out, and leave private fields out of the admin shape too', () => {
    const adminShape = toAdminSkill(RECORD);

    expect(adminShape.id).toBe('e5f6a7b8c9d0e1f2a3b4c5d6');
    expect(adminShape.createdAt).toBe('2026-10-20T09:40:00.000Z');
    expect(adminShape).not.toHaveProperty('_id');
    expect(adminShape).not.toHaveProperty('isDeleted');
    expect(adminShape).not.toHaveProperty('internalNotes');
    expect(adminShape).not.toHaveProperty('passwordHash');
  });
});

/**
 * The convention forbids spreading in a mapper, because spreading copies whatever is there. This
 * guard reads every `*.mappers.ts` file of the server, now and in later milestones.
 */
function findSpreading(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  return [
    ...(code.match(/\.\.\.\s*[\w$([{]/g) ?? []),
    ...(code.match(/Object\.assign\s*\(/g) ?? []),
    ...(code.match(/structuredClone\s*\(/g) ?? []),
  ];
}

describe('the convention is enforced for every mapper file', () => {
  const sourceFolder = fileURLToPath(new URL('..', import.meta.url));
  const mapperFiles = readdirSync(sourceFolder, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith('.mappers.ts'));

  it.each(mapperFiles.length > 0 ? mapperFiles : ['(no mapper files yet)'])(
    '%s does not spread, assign, or clone a record',
    (path) => {
      if (mapperFiles.length === 0) return;
      expect(findSpreading(readFileSync(join(sourceFolder, path), 'utf8'))).toEqual([]);
    },
  );

  it('would catch each form of spreading', () => {
    expect(findSpreading('const a = { ...record, id };')).toHaveLength(1);
    expect(findSpreading('const { password, ...rest } = record;')).toHaveLength(1);
    expect(findSpreading('return Object.assign({}, record);')).toHaveLength(1);
    expect(findSpreading('return structuredClone(record);')).toHaveLength(1);
    expect(findSpreading('const list = [...items];')).toHaveLength(1);
  });

  it('does not mistake comments for code', () => {
    expect(findSpreading('// never { ...record }\n/* Object.assign( */\nconst a = 1;')).toEqual([]);
  });

  it('passes a mapper that names every field', () => {
    expect(
      findSpreading('export const toPublic = (r) => ({ name: r.name, level: r.level });'),
    ).toEqual([]);
  });
});
