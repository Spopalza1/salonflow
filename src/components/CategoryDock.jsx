import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Gift, Grip, MoreHorizontal, Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function CategoryDock({ categories, items, onReorder, onAdd, onEdit, onDelete, onToggleComplimentary, activeId, onSelect }) {
  const [arranging, setArranging] = useState(false);
  const [query, setQuery] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const dragRef = useRef({ pointerId: null, id: null });
  const counts = useMemo(() => items.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {}), [items]);
  const filtered = categories.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  const moveBy = (categoryId, delta) => {
    const ids = categories.map(c => c.id);
    const from = ids.indexOf(categoryId);
    const to = Math.max(0, Math.min(ids.length - 1, from + delta));
    if (from < 0 || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, categoryId);
    onReorder(ids);
  };

  const moveToTarget = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    const ids = categories.map(c => c.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, sourceId);
    onReorder(ids);
  };

  const beginPointerReorder = (event, categoryId) => {
    if (!arranging || event.button !== 0) return;
    event.preventDefault();
    dragRef.current = { pointerId: event.pointerId, id: categoryId };
    setDraggedId(categoryId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const continuePointerReorder = (event) => {
    const sourceId = dragRef.current.id;
    if (!arranging || !sourceId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-category-id]');
    const targetId = target?.dataset?.categoryId;
    if (targetId) moveToTarget(sourceId, targetId);
  };

  const endPointerReorder = (event) => {
    if (dragRef.current.pointerId != null) {
      try { event.currentTarget.releasePointerCapture?.(dragRef.current.pointerId); } catch { /* already released */ }
    }
    dragRef.current = { pointerId: null, id: null };
    setDraggedId(null);
  };

  const handleArrangeKey = (event, categoryId) => {
    if (!arranging) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveBy(categoryId, -1);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveBy(categoryId, 1);
    }
  };

  return <section className="sf-category-workspace">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h3 className="font-heading text-lg font-semibold">Categories</h3><p className="text-sm text-muted-foreground">Choose, manage, or arrange how categories flow across the menu.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        {categories.length > 8 && <div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find category" className="h-9 w-40 rounded-full pl-8" /></div>}
        <Button variant={arranging ? 'default' : 'outline'} size="sm" className="rounded-full" onClick={() => { setArranging(v => !v); setDraggedId(null); dragRef.current = { pointerId: null, id: null }; }}>{arranging ? <><Check className="mr-1.5 h-4 w-4" />Done</> : <><Settings2 className="mr-1.5 h-4 w-4" />Arrange</>}</Button>
      </div>
    </div>
    <motion.div layout className={cn('sf-category-dock', arranging && 'is-arranging')}>
      <AnimatePresence initial={false}>
        {filtered.map(cat => {
          const selected = activeId === cat.id;
          const dragging = draggedId === cat.id;
          return <motion.div
            layout
            key={cat.id}
            data-category-id={cat.id}
            initial={{ opacity: 0, scale: .94 }}
            animate={{ opacity: 1, scale: dragging ? 1.035 : 1, y: dragging ? -2 : 0 }}
            exit={{ opacity: 0, scale: .94 }}
            transition={{ layout: { type: 'spring', stiffness: 520, damping: 38 }, duration: .16 }}
            className={cn('sf-category-pill-wrap', arranging && 'cursor-grab touch-none select-none', dragging && 'is-pointer-dragging cursor-grabbing z-20')}
            onPointerDown={(event) => beginPointerReorder(event, cat.id)}
            onPointerMove={continuePointerReorder}
            onPointerUp={endPointerReorder}
            onPointerCancel={endPointerReorder}
            onKeyDown={(event) => handleArrangeKey(event, cat.id)}
            tabIndex={arranging ? 0 : undefined}
            aria-grabbed={arranging ? dragging : undefined}
          >
            <button type="button" onClick={() => !arranging && onSelect?.(cat.id)} className={cn('sf-category-pill', selected && 'is-selected', dragging && 'is-dragging')}>
              {arranging && <Grip className="h-3.5 w-3.5 opacity-45" aria-hidden="true" />}
              <span className="min-w-0"><span className="block truncate font-semibold">{cat.name}</span><span className="block text-[10px] opacity-60">{counts[cat.name] || 0} items</span></span>
              {cat.complimentary && <span className="sf-category-free"><Gift className="h-3 w-3" />Free</span>}
            </button>
            {!arranging && <DropdownMenu><DropdownMenuTrigger asChild><button aria-label={`Manage ${cat.name}`} className="sf-category-menu"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit(cat)}><Pencil className="mr-2 h-4 w-4" />Rename</DropdownMenuItem><DropdownMenuItem onClick={() => onToggleComplimentary(cat)}><Gift className="mr-2 h-4 w-4" />{cat.complimentary ? 'Remove complimentary' : 'Make complimentary'}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(cat)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
          </motion.div>;
        })}
        <motion.button layout key="add" type="button" onClick={onAdd} className="sf-category-pill sf-category-add"><Plus className="h-4 w-4" /><span className="font-semibold">Add Category</span></motion.button>
      </AnimatePresence>
    </motion.div>
    {arranging && <p className="mt-3 text-xs text-muted-foreground">Press and smoothly drag a capsule to its new position. Keyboard users can focus a capsule and use the arrow keys. Order saves automatically.</p>}
  </section>;
}
