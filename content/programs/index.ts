import { ProgramSchema, type Program } from '@/lib/schema';
import aea from './aea';
import aiAdoptCentres from './ai-adopt-centres';
import aprIntern from './apr-intern';
import arenaAdvancingRenewables from './arena-advancing-renewables';
import brii from './brii';
import crcAiAccelerator from './crc-ai-accelerator';
import crcP from './crc-p';
import csiroInnovateToGrow from './csiro-innovate-to-grow';
import csiroKickStart from './csiro-kick-start';
import defenceIndustryDevelopment from './defence-industry-development';
import emdg from './emdg';
import esic from './esic';
import industryGrowthProgram from './industry-growth-program';
import nationalIndustryPhd from './national-industry-phd';
import rdti from './rdti';

const raw = [
  aea,
  aiAdoptCentres,
  aprIntern,
  arenaAdvancingRenewables,
  brii,
  crcAiAccelerator,
  crcP,
  csiroInnovateToGrow,
  csiroKickStart,
  defenceIndustryDevelopment,
  emdg,
  esic,
  industryGrowthProgram,
  nationalIndustryPhd,
  rdti,
];

export const PROGRAMS: Program[] = raw.map((p) => ProgramSchema.parse(p));
export const PROGRAMS_BY_SLUG = new Map(PROGRAMS.map((p) => [p.slug, p]));
export const getProgram = (slug: string) => PROGRAMS_BY_SLUG.get(slug);
