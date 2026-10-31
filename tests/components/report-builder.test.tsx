// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { stableNow, blob, toBlob } = vi.hoisted(() => {
  const blob = { size: 1 } as unknown as Blob;
  return { stableNow: new Date('2026-10-27T00:00:00Z'), blob, toBlob: vi.fn<() => Promise<Blob>>() };
});
vi.mock('@/lib/use-now', () => ({ useNow: () => stableNow }));
// The PDF renderer is loaded with import() when Download PDF is pressed; here it never has to draw.
vi.mock('@react-pdf/renderer', () => ({ pdf: () => ({ toBlob }) }));
vi.mock('@/lib/pdf/report-document', () => ({ ReportDocument: () => null, registerReportFonts: () => {} }));
vi.mock('@/lib/download', () => ({ downloadFile: vi.fn() }));

import { ReportBuilder } from '@/components/report/report-builder';
import { useWorkspace } from '@/lib/store/use-workspace';
import { buttonClasses } from '@/components/ui/button';
import { WINDOW_BAR, WINDOW_FRAME } from '@/components/ui/window';
import { downloadFile } from '@/lib/download';

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => {
  useWorkspace.getState().reset();
  toBlob.mockReset();
  vi.mocked(downloadFile).mockClear();
});

// The report builder in the Billabong style (design doc sections 4 and 11, Task 9): the options and
// the preview are windows; Download PDF is the primary button with a loading state. The PDF is unchanged.
describe('ReportBuilder', () => {
  it('puts the options and the preview in windows named by their titles', () => {
    render(<ReportBuilder />);
    const options = screen.getByRole('region', { name: 'Options' });
    const preview = screen.getByRole('region', { name: 'Preview' });
    for (const region of [options, preview]) {
      expect(region).toHaveClass(...WINDOW_FRAME.split(' '), 'border-border');
      expect(within(region).getByRole('heading', { level: 2 }).parentElement).toHaveClass(...WINDOW_BAR.split(' '));
    }
    expect(within(options).getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    expect(within(options).getByRole('group', { name: 'Sections' })).toBeInTheDocument();
    // The preview article is the window's body content, without a frame of its own, padded by the
    // window (padding="lg"), and named only by the region around it (no second name).
    const article = within(preview).getByRole('article');
    expect(article.className).not.toMatch(/\b(border|rounded|shadow|bg)-/);
    expect(article).not.toHaveAttribute('aria-label');
    expect(article.parentElement).toHaveClass('p-4', 'md:p-8');
    // Its headings sit under the window's h2.
    expect(within(article).queryAllByRole('heading', { level: 2 })).toEqual([]);
    expect(within(article).getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0);
  });

  it('draws section headings over a neutral hairline, not a coloured one', () => {
    render(<ReportBuilder />);
    for (const heading of within(screen.getByRole('region', { name: 'Preview' })).getAllByRole('heading', { level: 3 })) {
      expect(heading.className).not.toMatch(/border-(accent|primary|brand|spark)/);
    }
    // Every section heading has the neutral hairline (the cover title has no rule).
    const sections = screen.getByRole('region', { name: 'Preview' }).querySelectorAll('article section h3');
    expect(sections.length).toBeGreaterThan(0);
    for (const heading of sections) expect(heading).toHaveClass('border-b', 'border-border');
  });

  // docs/art/billabong-prompts.md: the stamp beside Download PDF, decorative, the page's one piece of art.
  it('shows the stamp beside Download PDF, hidden from assistive technology', () => {
    render(<ReportBuilder />);
    const button = screen.getByRole('button', { name: 'Download PDF' });
    const art = document.querySelectorAll<HTMLElement>('[data-art]');
    expect(art).toHaveLength(1);
    expect(art[0]).toHaveAttribute('data-art', 'prop-stamp');
    expect(art[0]).toHaveAttribute('aria-hidden', 'true');
    expect(art[0].previousElementSibling).toBe(button);
    expect(within(screen.getByRole('region', { name: 'Options' })).getByRole('button', { name: 'Download PDF' })).toBe(button);
  });

  it('makes Download PDF the primary button, with a 16px spinner while the PDF is made', async () => {
    let finish!: (b: Blob) => void;
    toBlob.mockReturnValue(new Promise<Blob>((r) => { finish = r; }));
    const user = userEvent.setup();
    render(<ReportBuilder />);
    const button = screen.getByRole('button', { name: 'Download PDF' });
    // flex-1: it fills the row beside the stamp, as it filled the column before.
    expect(button).toHaveAttribute('class', buttonClasses({ variant: 'primary', className: 'flex-1' }));
    await user.click(button);

    const busy = await screen.findByRole('button', { name: 'Making PDF…' });
    expect(busy).toBe(button);
    expect(busy).toHaveAttribute('aria-busy', 'true');
    // aria-disabled, not disabled: the button keeps focus while the PDF is made.
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    expect(busy).not.toBeDisabled();
    expect(busy).toHaveFocus();
    const spinner = busy.querySelector('svg')!;
    expect(spinner).toHaveAttribute('width', '16');
    expect(spinner).toHaveClass('animate-spin', 'motion-reduce:animate-none');
    // A second press while busy does not start another PDF.
    await user.click(busy);
    expect(toBlob).toHaveBeenCalledTimes(1);

    finish(blob);
    expect(await screen.findByText(/^Downloaded /)).toBeInTheDocument();
    expect(downloadFile).toHaveBeenCalledOnce();
    expect(button).toHaveAccessibleName('Download PDF');
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).not.toHaveAttribute('aria-disabled');
  });

  // Try again replaces the error, and itself: focus moves to Download PDF first, so it is not lost.
  it('keeps focus on Download PDF when Try again is pressed', async () => {
    // Both tries fail (Geist, then the Helvetica fallback); the retry then stays busy.
    toBlob.mockRejectedValueOnce(new Error('No fonts.')).mockRejectedValueOnce(new Error('No fonts.')).mockReturnValueOnce(new Promise<Blob>(() => {}));
    const user = userEvent.setup();
    render(<ReportBuilder />);
    await user.click(screen.getByRole('button', { name: 'Download PDF' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The PDF could not be made. No fonts.');
    const retry = within(alert).getByRole('button', { name: 'Try again' });
    expect(retry).not.toBeDisabled();
    await user.click(retry);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Making PDF…' })).toHaveFocus();
  });

  it('shows a loading status with the windows drawn before the workspace loads', () => {
    useWorkspace.setState({ ready: false });
    try {
      render(<ReportBuilder />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(status).toHaveTextContent('Loading the report builder');
      expect(status).not.toHaveAttribute('aria-label');
      expect(status.querySelectorAll('.shadow-window')).toHaveLength(2);
    } finally {
      useWorkspace.setState({ ready: true });
    }
  });
});
