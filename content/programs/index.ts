import { ProgramSchema, type Program } from '@/lib/schema';
import aea from './aea';
import aiAdoptCentres from './ai-adopt-centres';
import aliceAndersonFund from './alice-anderson-fund';
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
import ivBasecampAscent from './iv-basecamp-ascent';
import ivOfficeHours from './iv-office-hours';
import melbourneAcceleratorProgram from './melbourne-accelerator-program';
import microsoftForStartups from './microsoft-for-startups';
import monashGenerator from './monash-generator';
import nationalIndustryPhd from './national-industry-phd';
import nvidiaInception from './nvidia-inception';
import openaiStartups from './openai-startups';
import pressPlay from './press-play';
import rdti from './rdti';
import rmitLaunchhub from './rmit-launchhub';
import startmateSummer27 from './startmate-summer-27';
import ventureGrowthFund from './venture-growth-fund';
import victorAi from './victor-ai';
import worksafeRtwTrials from './worksafe-rtw-trials';

const raw = [
  aea,
  aiAdoptCentres,
  aliceAndersonFund,
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
  ivBasecampAscent,
  ivOfficeHours,
  melbourneAcceleratorProgram,
  microsoftForStartups,
  monashGenerator,
  nationalIndustryPhd,
  nvidiaInception,
  openaiStartups,
  pressPlay,
  rdti,
  rmitLaunchhub,
  startmateSummer27,
  ventureGrowthFund,
  victorAi,
  worksafeRtwTrials,
];

export const PROGRAMS: Program[] = raw.map((p) => ProgramSchema.parse(p));
export const PROGRAMS_BY_SLUG = new Map(PROGRAMS.map((p) => [p.slug, p]));
export const getProgram = (slug: string) => PROGRAMS_BY_SLUG.get(slug);
