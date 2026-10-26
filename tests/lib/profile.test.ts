import { describe, it, expect } from 'vitest';
import { MIN_ANSWERS, hasAnswers, hasProfileData } from '@/lib/profile';
import { createWorkspaceStore, selectAssessedProfile, selectDeadlineProfile } from '@/lib/store/use-workspace';
import { MemoryWorkspaceStore, emptyWorkspace } from '@/lib/store/workspace-store';
import { buildReportData, DEFAULT_SECTIONS } from '@/lib/pdf/report-data';
import { PROGRAMS } from '@/content/programs';

const now = new Date('2026-10-27T00:00:00Z');

describe('hasAnswers', () => {
  it('is true with a persona, or with at least 3 answered eligibility questions', () => {
    expect(MIN_ANSWERS).toBe(3);
    expect(hasAnswers({})).toBe(false);
    expect(hasAnswers({ persona: 'bootstrapped' })).toBe(true);
    expect(hasAnswers({ state: 'vic', turnover: 'under-1m' })).toBe(false);
    expect(hasAnswers({ state: 'vic', turnover: 'under-1m', hasMvp: false })).toBe(true);
    expect(hasAnswers({ stack: [], sectors: [], industryPartners: 0 })).toBe(true); // "None of these" and 0 are answers
  });
  it('does not count the financial-year end or company name set from Settings or the first step alone', () => {
    expect(hasAnswers({ fyEndMonth: 12 })).toBe(false);
    expect(hasAnswers({ fyEndMonth: 12, companyName: 'Acme' })).toBe(false);
    expect(hasAnswers({ fyEndMonth: 12, companyName: 'Acme', state: 'vic' })).toBe(false);
  });
});

describe('hasProfileData', () => {
  it('is true when any profile field is set', () => {
    expect(hasProfileData({})).toBe(false);
    expect(hasProfileData({ fyEndMonth: 12 })).toBe(true);
    expect(hasProfileData({ companyName: undefined })).toBe(false);
  });
});

describe('setting only the financial-year end', () => {
  it('does not make results or the report think the user was assessed, but still moves deadlines', async () => {
    const useWs = createWorkspaceStore(new MemoryWorkspaceStore(), () => now);
    await useWs.getState().init();
    useWs.getState().setProfile({ fyEndMonth: 12 });
    expect(selectAssessedProfile(useWs.getState())).toBeUndefined();
    expect(selectDeadlineProfile(useWs.getState())).toEqual({ fyEndMonth: 12 });
    expect(buildReportData(useWs.getState().ws, PROGRAMS, now, DEFAULT_SECTIONS).mode).toBe('directory');

    useWs.getState().setProfile({ persona: 'pre-raise' });
    expect(selectAssessedProfile(useWs.getState())).toBe(useWs.getState().ws.profile);
  });
  it('nothing is returned before the workspace has loaded', () => {
    const useWs = createWorkspaceStore(new MemoryWorkspaceStore(), () => now);
    useWs.setState({ ws: { ...emptyWorkspace(now), profile: { persona: 'vc-backed' } } });
    expect(selectAssessedProfile(useWs.getState())).toBeUndefined();
    expect(selectDeadlineProfile(useWs.getState())).toBeUndefined();
  });
});
