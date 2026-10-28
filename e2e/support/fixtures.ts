import { setDoc } from './firestore';

export const JUZ_STATUS = { IDLE: 0, BOOKED: 1, DONE: 2 } as const;

export interface JuzSpec {
  owner: string;
  status: number;
  /** When the juz last changed (booked, finished…). */
  updatedAt?: Date;
}

export interface Juz extends JuzSpec {
  index: number;
}

let groupCounter = 0;

/** Unique, readable group IDs so tests never collide in the shared emulator. */
export function newGroupId(label: string): string {
  groupCounter += 1;
  return `${label}-${Date.now().toString(36)}-${groupCounter}`;
}

/** A sharer's reference code (?r=) unique to this test run, so counts don't add up across browser projects. */
export function newRefCode(): string {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6).padEnd(4, '0');
}

/** The 30 ajza of a group; `assigned` maps 1-based juz numbers to their owner and status. */
export function buildAjza(assigned: Record<number, JuzSpec> = {}): Juz[] {
  return Array.from({ length: 30 }, (_, index) => {
    const spec = assigned[index + 1];
    return {
      index,
      owner: spec?.owner ?? '',
      status: spec?.status ?? JUZ_STATUS.IDLE,
      ...(spec?.updatedAt ? { updatedAt: spec.updatedAt } : {}),
    };
  });
}

/** Current storage format: ajza is a map keyed by index ("0".."29"). */
export function ajzaMap(ajza: Juz[]): Record<string, Juz> {
  return Object.fromEntries(ajza.map((juz) => [String(juz.index), juz]));
}

export interface SequentialGroupOptions {
  title?: string;
  author?: string;
  description?: string;
  cycle?: number;
  admins?: string;
  targetDate?: string;
  /** YYYY-MM-DD, as picked when the group was created. */
  targetAt?: string;
  assigned?: Record<number, JuzSpec>;
  /** `map` is today's format; `array` and `untyped` are older documents still in production. */
  format?: 'map' | 'array' | 'untyped';
  /** What the khitma is for (memorial, healing…), and رحمه/رحمها for memorial ones. */
  purpose?: string;
  honoreeGender?: 'male' | 'female';
}

export async function createSequentialGroup(id: string, options: SequentialGroupOptions = {}): Promise<void> {
  const ajza = buildAjza(options.assigned);
  const doc: Record<string, unknown> = {
    title: options.title ?? 'ختمة العائلة',
    description: options.description ?? '',
    author: options.author ?? 'أبو أحمد',
    cycle: options.cycle ?? 0,
    authorId: '',
    ajza: options.format === 'array' ? ajza : ajzaMap(ajza),
  };
  if (!options.format || options.format === 'map') {
    doc.type = 'SEQUENTIAL';
  }
  if (options.admins !== undefined) doc.admins = options.admins;
  if (options.targetDate !== undefined) doc.targetDate = options.targetDate;
  if (options.targetAt !== undefined) doc.targetAt = options.targetAt;
  if (options.purpose !== undefined) doc.purpose = options.purpose;
  if (options.honoreeGender !== undefined) doc.honoreeGender = options.honoreeGender;
  await setDoc(`groups/${id}`, doc);
}

export interface SameTaskGroupOptions {
  title?: string;
  author?: string;
  task?: string;
  cycle?: number;
  members?: Record<string, boolean>;
  totalDoneTasks?: number;
}

export async function createSameTaskGroup(id: string, options: SameTaskGroupOptions = {}): Promise<void> {
  const author = options.author ?? 'أبو أحمد';
  const members = options.members ?? { [author]: false };
  const doc: Record<string, unknown> = {
    title: options.title ?? 'ورد يومي',
    description: '',
    author,
    type: 'SAME_TASK',
    cycle: options.cycle ?? 0,
    authorId: '',
    task: options.task ?? 'قراءة سورة الكهف',
    members: Object.fromEntries(Object.entries(members).map(([name, isTaskDone]) => [name, { isTaskDone }])),
  };
  if (options.totalDoneTasks !== undefined) doc.totalDoneTasks = options.totalDoneTasks;
  await setDoc(`groups/${id}`, doc);
}

export interface PagesMember {
  isTaskDone?: boolean;
  pages?: [number, number];
}

export interface PagesGroupOptions {
  title?: string;
  author?: string;
  isStarted?: boolean;
  members?: Record<string, PagesMember>;
}

export async function createPagesGroup(id: string, options: PagesGroupOptions = {}): Promise<void> {
  const author = options.author ?? 'أبو أحمد';
  const members = options.members ?? { [author]: {} };
  const doc: Record<string, unknown> = {
    title: options.title ?? 'ختمة عن روح الوالد',
    description: '',
    author,
    type: 'PAGES_DISTRIBUTION',
    cycle: 0,
    authorId: '',
    members: Object.fromEntries(
      Object.entries(members).map(([name, member]) => [
        name,
        {
          isTaskDone: member.isTaskDone ?? false,
          ...(member.pages ? { pagesTask: { start: member.pages[0], end: member.pages[1] } } : {}),
        },
      ])
    ),
  };
  if (options.isStarted !== undefined) doc.isStarted = options.isStarted;
  await setDoc(`groups/${id}`, doc);
}

/** Shared documents every page may read: global khitmas and the latest announcement. */
export async function seedGlobalDocs(): Promise<void> {
  await setDoc('global/aqsa', { pages: { completed: 1250, granted: 1400 } });
  await setDoc('global/ramadan2021', {
    totalAjzaCounter: 0,
    ajza: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i), 0])),
    startDate: '2021-04-13',
  });
  await setDoc('notifications/2', {
    id: 2,
    isActive: true,
    title: 'مجتمع ختمة.نت',
    text: 'انضّموا الآن إلى مجموعة ختمة.نت على الفيسبوك.',
    actions: [],
  });
}
