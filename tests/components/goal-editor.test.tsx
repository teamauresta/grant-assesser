// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useWorkspace } from '@/lib/store/use-workspace';
import { GoalEditor } from '@/components/plan/goal-editor';
import { parsePlanTab } from '@/lib/plan/routes';

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => { useWorkspace.getState().reset(); });

describe('GoalEditor', () => {
  it('requires a title and shows the error next to the field', async () => {
    const onClose = vi.fn();
    render(<GoalEditor open onClose={onClose} />);
    const user = userEvent.setup();
    const title = screen.getByRole('textbox', { name: /title/i });
    expect(title).toHaveFocus();

    await user.type(title, '   ');
    await user.click(screen.getByRole('button', { name: 'Add goal' }));
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription(/enter a title/i);
    expect(title).toHaveFocus();
    expect(useWorkspace.getState().ws.goals).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('adds a goal with steps, an application and the default reminders', async () => {
    const appId = useWorkspace.getState().addCustomApplication('Angel round');
    useWorkspace.getState().setSettings({ remindersDefault: [14, 1] });
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<GoalEditor open onClose={onClose} onSaved={onSaved} />);
    const user = userEvent.setup();

    const reminders = within(screen.getByRole('group', { name: /calendar reminders/i }));
    expect(reminders.getByRole('checkbox', { name: '14 days before' })).toBeChecked();
    expect(reminders.getByRole('checkbox', { name: '7 days before' })).not.toBeChecked();
    expect(reminders.getByRole('checkbox', { name: '1 day before' })).toBeChecked();

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'Pitch deck');
    await user.type(screen.getByLabelText('Due date'), '2026-11-20');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Application' }), 'Angel round');
    await user.click(screen.getByRole('button', { name: 'Add step' }));
    await user.keyboard('Draft{Enter}Review');
    await user.click(reminders.getByRole('checkbox', { name: '3 days before' }));
    await user.click(screen.getByRole('button', { name: 'Add goal' }));

    const [goal] = useWorkspace.getState().ws.goals;
    expect(goal).toMatchObject({
      title: 'Pitch deck', dueDate: '2026-11-20', applicationId: appId, source: 'user', reminderOffsetsDays: [14, 3, 1],
    });
    expect(goal.steps.map((s) => s.title)).toEqual(['Draft', 'Review']);
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(goal.id);
  });

  it('edits an existing goal and closes on Escape without saving', async () => {
    const id = useWorkspace.getState().addGoal({ title: 'Old title' });
    const goal = useWorkspace.getState().ws.goals[0];
    const onClose = vi.fn();
    const { rerender } = render(<GoalEditor open goal={goal} onClose={onClose} />);
    const user = userEvent.setup();
    expect(screen.getByRole('dialog', { name: 'Edit goal' })).toBeInTheDocument();
    const title = screen.getByRole('textbox', { name: /title/i });
    expect(title).toHaveValue('Old title');
    await user.clear(title);
    await user.type(title, 'New title');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(useWorkspace.getState().ws.goals[0].title).toBe('Old title');

    rerender(<GoalEditor open={false} goal={goal} onClose={onClose} />);
    rerender(<GoalEditor open goal={goal} onClose={onClose} />);
    await user.clear(screen.getByRole('textbox', { name: /title/i }));
    await user.type(screen.getByRole('textbox', { name: /title/i }), 'New title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(useWorkspace.getState().ws.goals.find((g) => g.id === id)?.title).toBe('New title');
  });

  it('traps focus inside the dialog', async () => {
    render(<><button>Outside</button><GoalEditor open onClose={() => {}} /></>);
    const user = userEvent.setup();
    for (let i = 0; i < 20; i++) {
      await user.tab();
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    }
  });
});

describe('parsePlanTab', () => {
  it('reads ?tab=, defaults to the pipeline and opens Goals for a ?goal= link', () => {
    expect(parsePlanTab(null, null)).toBe('pipeline');
    expect(parsePlanTab('calendar', null)).toBe('calendar');
    expect(parsePlanTab('nonsense', null)).toBe('pipeline');
    expect(parsePlanTab('calendar', 'g1')).toBe('goals');
  });
});
