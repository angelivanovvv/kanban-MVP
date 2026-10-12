import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Board from '@/components/board';
import { initialBoard, moveCard } from '@/lib/board';

describe('board transitions', () => {
  it('moves a card, preserves all fields, order, and original data', () => {
    const result = moveCard(initialBoard, 'c1', 'done');
    expect(result[0].cards.map(c => c.id)).toEqual(['c2', 'c3']);
    expect(result[4].cards.map(c => c.id)).toEqual(['c9', 'c10', 'c1']);
    expect(result[4].cards[2]).toEqual(initialBoard[0].cards[0]);
    expect(initialBoard[0].cards).toHaveLength(3);
    expect(result.flatMap(c => c.cards)).toHaveLength(10);
  });
  it('reorders upward, downward, and to the bottom without losing data', () => {
    const down = moveCard(initialBoard, 'c1', 'c3');
    expect(down[0].cards.map(c => c.id)).toEqual(['c2', 'c3', 'c1']);
    const up = moveCard(down, 'c1', 'c2');
    expect(up[0].cards.map(c => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(moveCard(up, 'c1', 'backlog')[0].cards.map(c => c.id)).toEqual(['c2', 'c3', 'c1']);
    expect(initialBoard[0].cards.map(c => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(up.flatMap(c => c.cards)).toHaveLength(10);
  });
  it('inserts into another column at the target card', () => {
    const moved = moveCard(initialBoard, 'c1', 'c5');
    expect(moved[1].cards.map(c => c.id)).toEqual(['c4', 'c1', 'c5']);
    expect(moved[0].cards.map(c => c.id)).toEqual(['c2', 'c3']);
    expect(moveCard(initialBoard, 'c1', 'c1')).toBe(initialBoard);
  });
  it('moves into an empty column and back', () => {
    const board = initialBoard.map(c => c.id === 'done' ? { ...c, cards: [] } : c);
    const moved = moveCard(board, 'c1', 'done');
    expect(moved[4].cards).toHaveLength(1);
    expect(moveCard(moved, 'c1', 'backlog')[4].cards).toHaveLength(0);
  });
  it.each([['c3', 'backlog'], ['missing', 'done'], ['c1', 'missing']])('ignores unchanged or invalid moves %s to %s', (card, column) => {
    expect(moveCard(initialBoard, card, column)).toBe(initialBoard);
  });
});

describe('board interactions', () => {
  it('starts with five columns and ten cards', () => {
    render(<Board />);
    expect(screen.getAllByRole('region')).toHaveLength(5);
    expect(screen.getAllByRole('article')).toHaveLength(10);
  });
  it('requires a nonblank title, trims fields, and adds in the selected column', async () => {
    const user = userEvent.setup(); render(<Board />);
    await user.click(screen.getByRole('button', { name: 'Add card to In review' }));
    const create = screen.getByRole('button', { name: 'Create card' });
    expect(create).toBeDisabled();
    await user.type(screen.getByLabelText(/Title/), '   ');
    expect(create).toBeDisabled();
    await user.type(screen.getByLabelText(/Title/), 'A new idea  ');
    await user.type(screen.getByLabelText(/Details/), '  Some context  ');
    await user.click(create);
    expect(screen.getByRole('region', { name: 'In review column' })).toHaveTextContent('A new idea');
    expect(screen.getByText('Some context')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(11);
  });
  it('allows an optional empty description and deletes the new card', async () => {
    const user = userEvent.setup(); render(<Board />);
    await user.click(screen.getByRole('button', { name: 'New card' }));
    await user.type(screen.getByLabelText(/Title/), 'Title only');
    await user.click(screen.getByRole('button', { name: 'Create card' }));
    await user.click(screen.getByRole('button', { name: 'Delete Title only' }));
    expect(screen.queryByText('Title only')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(10);
  });
  it('cancels without adding a card and discards the draft', async () => {
    const user = userEvent.setup(); render(<Board />);
    await user.click(screen.getByRole('button', { name: 'New card' }));
    await user.type(screen.getByLabelText(/Title/), 'Discard me');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'New card' }));
    expect(screen.getByLabelText(/Title/)).toHaveValue('');
  });
  it('renames with trimmed text and rejects whitespace', async () => {
    const user = userEvent.setup(); render(<Board />);
    await user.click(screen.getByRole('button', { name: 'Rename Backlog' }));
    const input = screen.getByRole('textbox', { name: 'Column name' });
    await user.clear(input); await user.type(input, '   ');
    expect(screen.getByRole('button', { name: 'Save column name' })).toBeDisabled();
    await user.type(input, 'Ideas  '); await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Rename Ideas' })).toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(5);
  });
  it('cancels rename with Escape or cancel button', async () => {
    const user = userEvent.setup(); render(<Board />);
    await user.click(screen.getByRole('button', { name: 'Rename Backlog' }));
    await user.type(screen.getByRole('textbox', { name: 'Column name' }), ' changed');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Rename Backlog' }));
    expect(screen.getByRole('textbox', { name: 'Column name' })).toHaveValue('Backlog');
    await user.click(screen.getByRole('button', { name: 'Cancel rename' }));
    expect(screen.getByRole('button', { name: 'Rename Backlog' })).toBeInTheDocument();
  });
  it('shows an empty state after deleting the last card', async () => {
    const user = userEvent.setup(); render(<Board />);
    await user.click(screen.getByRole('button', { name: 'Delete Review the landing page' }));
    expect(screen.getByText('A little room for what’s next.')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(9);
  });
});
