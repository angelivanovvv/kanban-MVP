export type Card = { id: string; title: string; details: string };
export type Column = { id: string; name: string; cards: Card[] };
export const initialBoard: Column[] = [
  { id: "backlog", name: "Backlog", cards: [
    { id: "c1", title: "Explore the big picture", details: "Collect inspiration and define what a successful launch looks like." },
    { id: "c2", title: "Map the customer journey", details: "Walk through the experience from first discovery to that first little win." },
    { id: "c3", title: "Gather early feedback", details: "Put a few ideas in front of people. Listen for what matters most." },
  ] },
  { id: "todo", name: "To do", cards: [
    { id: "c4", title: "Sketch the core screens", details: "Keep the first pass simple. Focus on hierarchy, flow, and the essentials." },
    { id: "c5", title: "Find our voice", details: "Write a few guiding principles for clear, helpful product copy." },
  ] },
  { id: "progress", name: "In progress", cards: [
    { id: "c6", title: "Build the visual identity", details: "Bring the palette, typography, and small details together into one cohesive system." },
    { id: "c7", title: "Create the first prototype", details: "Connect the key screens so the experience starts to feel real." },
  ] },
  { id: "review", name: "In review", cards: [
    { id: "c8", title: "Review the landing page", details: "Check the story, polish the layout, and make the next step feel obvious." },
  ] },
  { id: "done", name: "Done", cards: [
    { id: "c9", title: "Set the direction", details: "A shared vision, a clear scope, and a good place to start." },
    { id: "c10", title: "Kick things off", details: "Turn the first conversation into a plan. Ready to make it happen." },
  ] },
];
export function moveCard(board: Column[], cardId: string, targetId: string): Column[] {
  const source = board.find(column => column.cards.some(card => card.id === cardId));
  const destination = board.find(column => column.id === targetId || column.cards.some(card => card.id === targetId));
  const card = source?.cards.find(card => card.id === cardId);
  if (!source || !destination || !card || cardId === targetId) return board;
  const targetIndex = destination.cards.findIndex(item => item.id === targetId);
  const cards = destination.cards.filter(item => item.id !== cardId);
  cards.splice(targetIndex < 0 ? cards.length : targetIndex, 0, card);
  if (source === destination && cards.every((item, index) => item === source.cards[index])) return board;
  return board.map(column => column === destination ? { ...column, cards }
    : column === source ? { ...column, cards: column.cards.filter(item => item.id !== cardId) } : column);
}
