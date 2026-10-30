import { parse } from 'yaml';
import { z } from 'astro/zod';

// Imported through Vite so the dev server reloads when the admin saves a file.
const files = import.meta.glob<string>('../data/*.yaml', { query: '?raw', import: 'default', eager: true });

// YAML turns 2018-05 into a string, but 2018 into a number.
const month = z.union([z.string(), z.number()]).transform(String);
const url = z.string().url();

const Profile = z.object({
  name: z.string(),
  role: z.string(),
  company: z.string(),
  location: z.string(),
  careerStart: month,
  email: z.string().email(),
  site: url,
  links: z.object({ linkedin: url, github: url }),
  photo: z.string().optional(),
  focus: z.array(z.string()),
  tagline: z.string(),
  numbers: z.array(z.object({ value: z.string(), label: z.string() })),
  contact: z.object({ heading: z.string(), text: z.string() }),
  about: z.array(z.string()),
  offWork: z.string(),
  summary: z.string(),
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
});

const Role = z.object({
  title: z.string(),
  start: month,
  end: month.optional().nullable(),
  note: z.string().optional(),
  cvBullets: z.number().int().positive().optional(),
  highlights: z.array(z.string()).default([]),
});

const Experience = z.array(
  z.object({
    company: z.string(),
    location: z.string().optional(),
    draft: z.boolean().default(false),
    roles: z.array(Role).min(1),
  }),
);

const Skills = z.array(z.object({ group: z.string(), items: z.array(z.string()) }));

const Credentials = z.object({
  certifications: z.array(z.object({ name: z.string(), issuer: z.string(), url: url.optional() })),
  volunteering: z.array(
    z.object({
      org: z.string(),
      roles: z.array(
        z.object({
          title: z.string(),
          since: z.string().optional(),
          detail: z.string().optional(),
          links: z.array(z.object({ label: z.string(), url })).default([]),
        }),
      ),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      school: z.string(),
      start: z.number(),
      end: z.number(),
      inProgress: z.boolean().default(false),
    }),
  ),
});

function load<T extends z.ZodTypeAny>(file: string, schema: T): z.infer<T> {
  const raw = parse(files[`../data/${file}`]) ?? {};
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`src/data/${file} is invalid:\n${result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return result.data;
}

export const profile = load('profile.yaml', Profile);
export const experience = load('experience.yaml', Experience);
export const skills = load('skills.yaml', Skills);
export const credentials = load('credentials.yaml', Credentials);

// Stops the live build from publishing placeholder text.
const drafts = experience.filter((e) => e.draft).map((e) => e.company);
if (drafts.length && process.env.CI) {
  throw new Error(`Draft content in experience.yaml (${drafts.join(', ')}). Review it and remove "draft: true" before publishing.`);
}

// "Ranjitha K N" -> "Ranjitha" for the greeting.
export const firstName = profile.name.split(' ').filter((w) => w.replace('.', '').length > 1).join(' ');
export const initials = profile.name
  .split(' ')
  .slice(0, 2)
  .map((w) => w[0])
  .join('');

export const years = Math.floor((Date.now() - new Date(`${profile.careerStart}-01`).getTime()) / (365.25 * 864e5));
export const summary = profile.summary.replace('{years}', `${years}+`);
export const numbers = profile.numbers.map((n) => ({ ...n, value: n.value.replace('{years}', String(years)) }));
export const cvFile = `${profile.name.replace(/\s+/g, '-')}-CV.pdf`;
export const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
