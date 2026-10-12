"use client";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type UniqueIdentifier, type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { ArrowRight, Check, GripVertical, Layers3, Pencil, Plus, Trash2, X } from "lucide-react";
import { initialBoard, moveCard, type Card, type Column } from "@/lib/board";
const colors = ["#8b94a3", "#209dd7", "#ecad0a", "#753991", "#458571"];
// Cards take priority over their containing column when choosing a drop target.
const cardCollision: CollisionDetection = args => {
  const targets = args.droppableContainers;
  const hits = pointerWithin({ ...args, droppableContainers: targets });
  const collisions = hits.length ? hits : rectIntersection({ ...args, droppableContainers: targets });
  const cards = collisions.filter(hit => targets.find(target => target.id === hit.id)?.data.current?.kind === "card");
  return cards.length ? cards : collisions;
};
const columnCoordinates = (keyboardTarget: { current: UniqueIdentifier | null }): KeyboardCoordinateGetter => (event, { context, currentCoordinates }) => {
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.code)) return;
  event.preventDefault();
  const targets = context.droppableContainers.getEnabled();
  const current = targets.find(target => target.id === (keyboardTarget.current ?? context.active?.id));
  if (!current) return;
  const columnId = current.data.current?.columnId;
  let next;
  if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
    const columns = targets.filter(target => target.data.current?.kind === "column");
    const index = columns.findIndex(column => column.id === columnId);
    next = columns[index + (event.code === "ArrowRight" ? 1 : -1)];
  } else {
    const cards = targets.filter(target => target.data.current?.kind === "card" && target.data.current?.columnId === columnId).sort((a, b) => a.data.current?.position - b.data.current?.position);
    const index = cards.findIndex(card => card.id === (current.data.current?.kind === "column" ? context.active?.id : current.id));
    next = cards[index + (event.code === "ArrowDown" ? 1 : -1)];
  }
  const rect = next && context.droppableRects.get(next.id);
  if (rect && context.collisionRect) {
    keyboardTarget.current = next.id;
    return {
    x: currentCoordinates.x + rect.left + rect.width / 2 - (context.collisionRect.left + context.collisionRect.width / 2),
    y: currentCoordinates.y + rect.top + rect.height / 2 - (context.collisionRect.top + context.collisionRect.height / 2),
  };
  }
};
function CardContent({ card }: { card: Card }) {
  return <><h3>{card.title}</h3>{card.details && <p>{card.details}</p>}</>;
}
function BoardCard({ card, columnId, position, onDelete }: { card: Card; columnId: string; position: number; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: card.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: card.id, data: { kind: "card", columnId, position } });
  return <article ref={node => { setNodeRef(node); setDropRef(node); }} className={`card ${isDragging ? "dragging" : ""} ${isOver ? "card-over" : ""}`} data-testid={`card-${card.id}`}>
    <div className="card-tools"><button ref={setActivatorNodeRef} className="icon-button drag-handle" {...attributes} {...listeners} aria-label={`Move ${card.title}`}><GripVertical size={16} /></button><button className="icon-button delete-button" aria-label={`Delete ${card.title}`} onClick={onDelete}><Trash2 size={15} /></button></div>
    <CardContent card={card} />
  </article>;
}
function BoardColumn({ column, index, rename, add, remove }: { column: Column; index: number; rename: (name: string) => void; add: () => void; remove: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { kind: "column", columnId: column.id } });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  function save(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; rename(name.trim()); setEditing(false); }
  return <section ref={setNodeRef} aria-label={`${column.name} column`} data-testid={`column-${column.id}`} className={`column ${isOver ? "column-over" : ""}`} style={{ "--column-color": colors[index] } as CSSProperties}>
    <header className="column-header"><span className="column-dot" />{editing ? <form onSubmit={save} className="rename-form"><input aria-label="Column name" autoFocus value={name} maxLength={40} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setEditing(false); }} /><button className="icon-button" aria-label="Save column name" disabled={!name.trim()}><Check size={16} /></button><button type="button" className="icon-button" aria-label="Cancel rename" onClick={() => setEditing(false)}><X size={16} /></button></form>
      : <><h2><button className="column-name" aria-label={`Rename ${column.name}`} onClick={() => { setName(column.name); setEditing(true); }}>{column.name}<Pencil size={12} /></button></h2><span className="count">{column.cards.length}</span></>}</header>
    <div className="cards">{column.cards.map((card, position) => <BoardCard key={card.id} card={card} columnId={column.id} position={position} onDelete={() => remove(card.id)} />)}{!column.cards.length && <div className="empty-column"><Layers3 size={24} /><p>A little room for what’s next.</p><span>Drop a card here or add one below.</span></div>}</div>
    <button className="add-card" onClick={add} aria-label={`Add card to ${column.name}`}><Plus size={16} /> Add card</button>
  </section>;
}
function AddCardDialog({ column, close, add }: { column: Column; close: () => void; add: (title: string, details: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  useEffect(() => { dialog.current?.showModal(); titleInput.current?.focus(); }, []);
  function dismiss() { dialog.current?.close(); close(); }
  return <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); dismiss(); }} onClick={event => { if (event.target === event.currentTarget) dismiss(); }}><form onSubmit={event => { event.preventDefault(); if (title.trim()) { dialog.current?.close(); add(title.trim(), details.trim()); } }}>
    <div className="dialog-heading"><span className="eyebrow">MAKE ROOM FOR AN IDEA</span><button type="button" className="icon-button" aria-label="Close dialog" onClick={dismiss}><X size={20} /></button></div><h2 id="dialog-title">A new card</h2><p className="dialog-description">Add it to <strong>{column.name}</strong>. Take it from there.</p>
    <label htmlFor="card-title">Title <span>(required)</span></label><input ref={titleInput} id="card-title" autoFocus required maxLength={160} placeholder="What needs to happen?" value={title} onChange={event => setTitle(event.target.value)} />
    <label htmlFor="card-details">Details <span>(optional)</span></label><textarea id="card-details" rows={5} placeholder="A little context goes a long way…" value={details} onChange={event => setDetails(event.target.value)} />
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={dismiss}>Cancel</button><button className="primary-button" disabled={!title.trim()}>Create card <ArrowRight size={16} /></button></div>
  </form></dialog>;
}
export default function Board() {
  const [columns, setColumns] = useState(initialBoard);
  const keyboardTarget = useRef<UniqueIdentifier | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [notice, setNotice] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: (event, args) => columnCoordinates(keyboardTarget)(event, args) }));
  const total = columns.reduce((sum, column) => sum + column.cards.length, 0);
  function endDrag({ active, over }: DragEndEvent) { setActiveCard(null); if (over) { setColumns(board => moveCard(board, String(active.id), String(over.id))); setNotice(`Card moved to ${columns.find(column => column.id === over.id || column.cards.some(card => card.id === over.id))?.name}.`); } }
  const addingColumn = columns.find(column => column.id === addingTo);
  return <><header className="topbar"><div className="brand"><span className="brand-mark"><i /><i /><i /></span>forma<span className="brand-period">.</span></div><div className="workspace-label">YOUR SPACE TO MAKE PROGRESS</div><span className="board-label"><Layers3 size={16} /> Project board</span></header><main>
    <div className="hero"><div><div className="eyebrow"><span /> A LITTLE STRUCTURE. A LOT OF MOMENTUM.</div><h1>Good work starts here<span>.</span></h1><p>Big ideas, small steps. Bring it all together on your board.</p></div><button className="primary-button new-card" onClick={() => setAddingTo(columns[0].id)}><Plus size={18} /> New card</button></div>
    <div className="board-toolbar"><div className="board-tab"><Layers3 size={17} /> The project board</div><span>{total} cards <span className="toolbar-divider">/</span> 5 stages</span></div>
    <DndContext id="project-board" sensors={sensors} collisionDetection={args => !args.pointerCoordinates && keyboardTarget.current ? [{ id: keyboardTarget.current }] : cardCollision(args)} onDragStart={({ active }) => { keyboardTarget.current = null; setActiveCard(columns.flatMap(column => column.cards).find(card => card.id === active.id) ?? null); }} onDragEnd={endDrag} onDragCancel={() => setActiveCard(null)}>
      <div className="board-scroll"><div className="board">{columns.map((column, index) => <BoardColumn key={column.id} column={column} index={index} rename={name => { setColumns(board => board.map(item => item.id === column.id ? { ...item, name } : item)); setNotice(`Column renamed to ${name}.`); }} add={() => setAddingTo(column.id)} remove={id => { setColumns(board => board.map(item => ({ ...item, cards: item.cards.filter(card => card.id !== id) }))); setNotice("Card deleted."); }} />)}</div></div>
      <DragOverlay style={{ pointerEvents: "none" }}>{activeCard && <article className="card card-overlay"><CardContent card={activeCard} /></article>}</DragOverlay>
    </DndContext>
    <footer><span><GripVertical size={15} /> Drag a card by its handle to move it. Click a column name to rename it.</span><span className="keyboard-hint">Keyboard: Space to pick up · arrows to move · Space to drop</span></footer><p className="session-note">A fresh start on every visit. This board lives in the moment.</p>
  </main><div role="status" className="sr-only">{notice}</div>{addingColumn && <AddCardDialog column={addingColumn} close={() => setAddingTo(null)} add={(title, details) => { setColumns(board => board.map(column => column.id === addingColumn.id ? { ...column, cards: [...column.cards, { id: crypto.randomUUID(), title, details }] } : column)); setAddingTo(null); setNotice(`Added ${title} to ${addingColumn.name}.`); }} />}</>;
}
