import { ProgramSchema, type Program } from '@/lib/schema';
import aea from './aea';
import aiAdoptCentres from './ai-adopt-centres';
import aprIntern from './apr-intern';
import arenaAdvancingRenewables from './arena-advancing-renewables';
import awsActivateFounders from './aws-activate-founders';
import awsActivatePortfolio from './aws-activate-portfolio';
import brii from './brii';
import claudeStartups from './claude-startups';
import cloudflareStartups from './cloudflare-startups';
import crcAiAccelerator from './crc-ai-accelerator';
import crcP from './crc-p';
import csiroInnovateToGrow from './csiro-innovate-to-grow';
import csiroKickStart from './csiro-kick-start';
import defenceIndustryDevelopment from './defence-industry-development';
import emdg from './emdg';
import esic from './esic';
import googleCloudAi from './google-cloud-ai';
import googleCloudStart from './google-cloud-start';
import industryGrowthProgram from './industry-growth-program';
import microsoftForStartups from './microsoft-for-startups';
import nationalIndustryPhd from './national-industry-phd';
import nvidiaInception from './nvidia-inception';
import openaiStartups from './openai-startups';
import rdti from './rdti';

const raw = [
  aea,
  aiAdoptCentres,
  aprIntern,
  arenaAdvancingRenewables,
  awsActivateFounders,
  awsActivatePortfolio,
  brii,
  claudeStartups,
  cloudflareStartups,
  crcAiAccelerator,
  crcP,
  csiroInnovateToGrow,
  csiroKickStart,
  defenceIndustryDevelopment,
  emdg,
  esic,
  googleCloudAi,
  googleCloudStart,
  industryGrowthProgram,
  microsoftForStartups,
  nationalIndustryPhd,
  nvidiaInception,
  openaiStartups,
  rdti,
];

export const PROGRAMS: Program[] = raw.map((p) => ProgramSchema.parse(p));
export const PROGRAMS_BY_SLUG = new Map(PROGRAMS.map((p) => [p.slug, p]));
export const getProgram = (slug: string) => PROGRAMS_BY_SLUG.get(slug);
