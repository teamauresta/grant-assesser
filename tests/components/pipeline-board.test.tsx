// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useWorkspace } from '@/lib/store/use-workspace';
import { PipelineBoard } from '@/components/plan/pipeline-board';

const now = new Date('2026-10-27T00:00:00Z');
const column = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) });

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => { useWorkspace.getState().reset(); });

describe('PipelineBoard', () => {
  it('shows an empty state with links to programs and results', () => {
    render(<PipelineBoard now={now} />);
    expect(screen.getByText('Nothing in your pipeline')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse programs/i })).toHaveAttribute('href', expect.stringMatching(/^\/programs\/?$/));
    expect(screen.getByRole('link', { name: /see your results/i })).toHaveAttribute('href', expect.stringMatching(/^\/assess\/results\/?$/));
  });

  it('"Move to…" changes the stage, moves the card to its column and keeps focus on it', async () => {
    const id = useWorkspace.getState().addCustomApplication('Angel round');
    useWorkspace.getState().addApplication('csiro-kick-start');
    render(<PipelineBoard now={now} />);
    const user = userEvent.setup();
    expect(within(column('Considering')).getAllByRole('article')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Move Angel round to…' }));
    const items = screen.getAllByRole('menuitem').map((i) => i.textContent);
    expect(items).toEqual(['Preparing', 'Submitted', 'Outcome: Awarded', 'Outcome: Declined', 'Outcome: Withdrawn']);
    await user.click(screen.getByRole('menuitem', { name: 'Submitted' }));

    expect(useWorkspace.getState().ws.pipeline.find((a) => a.id === id)?.stage).toBe('submitted');
    const card = within(column('Submitted')).getByRole('article', { name: 'Angel round' });
    expect(card).toHaveFocus();
    expect(within(column('Considering')).getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Angel round to Submitted.');
  });

  it('is keyboard operable and shows the outcome as a sub-badge', async () => {
    useWorkspace.getState().addCustomApplication('Angel round');
    render(<PipelineBoard now={now} />);
    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Move Angel round to…' }).focus();
    await user.keyboard('{ArrowUp}{Enter}'); // last item: Outcome: Withdrawn
    expect(useWorkspace.getState().ws.pipeline[0].stage).toBe('withdrawn');
    expect(within(column('Outcome')).getByText('Withdrawn')).toBeInTheDocument();
  });

  it('asks before removing an application and its goals', async () => {
    useWorkspace.getState().addApplication('csiro-kick-start');
    const goals = useWorkspace.getState().ws.goals.length;
    render(<PipelineBoard now={now} />);
    const user = userEvent.setup();
    const more = screen.getByRole('button', { name: /more actions for/i });

    await user.click(more);
    await user.click(screen.getByRole('menuitem', { name: /remove from pipeline/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleDescription(new RegExp(`deletes its ${goals} goals`));
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useWorkspace.getState().ws.pipeline).toHaveLength(1);
    expect(more).toHaveFocus();

    await user.click(more);
    await user.click(screen.getByRole('menuitem', { name: /remove from pipeline/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    expect(useWorkspace.getState().ws.pipeline).toHaveLength(0);
    expect(useWorkspace.getState().ws.goals).toHaveLength(0);
  });

  it('edits the expected amount in place', async () => {
    useWorkspace.getState().addCustomApplication('Angel round');
    render(<PipelineBoard now={now} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Set expected amount for Angel round' }));
    await user.type(screen.getByLabelText('Expected amount (AUD)'), 'lots{Enter}');
    expect(screen.getByText(/enter an amount in dollars/i)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Expected amount (AUD)'));
    await user.type(screen.getByLabelText('Expected amount (AUD)'), '50k{Enter}');
    expect(useWorkspace.getState().ws.pipeline[0].expectedAmount).toBe(50_000);
    expect(screen.getByText('$50K')).toBeInTheDocument();
  });
});
