// Explicit field lists for everything the MCP tools return about people. Never `include: { user:
// true }`: a new column on User (a secret, a token) would leak through the MCP the day it's added.

/** Who someone is, for lists (authors, organizers, attendees). */
export const PERSON_SELECT = { id: true, name: true, jobTitle: true, enterprise: true } as const;

/** A person plus how to reach them: for admins, who are the only MCP users. */
export const CONTACT_SELECT = {
  ...PERSON_SELECT,
  email: true,
  phoneNumber: true,
} as const;

/** A full member profile, private data included (it's an admin reading). No credentials. */
export const MEMBER_SELECT = {
  ...CONTACT_SELECT,
  emailVerified: true,
  role: true,
  isAmbassador: true,
  isCofounder: true,
  suspendedAt: true,
  deactivatedAt: true,
  twoFactorEnabledAt: true,
  image: true,
  countryOfOrigin: true,
  province: true,
  xAccountUrl: true,
  linkedinUrl: true,
  gitHubUrl: true,
  instagramUrl: true,
  youtubeUrl: true,
  twitchUrl: true,
  kickUrl: true,
  slogan: true,
  career: true,
  studyPlace: true,
  specialties: true,
  operatingSystems: true,
  favoriteIde: true,
  createdAt: true,
  updatedAt: true,
} as const;
