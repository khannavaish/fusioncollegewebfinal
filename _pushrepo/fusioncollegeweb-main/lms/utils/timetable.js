export const DEFAULT_TIME_SLOTS = [
  '7:30-8:10',
  '8:10-8:50',
  '8:50-9:30',
  '9:30-9:50',
  '9:50-10:30',
  '10:30-11:10',
  '11:10-11:50',
];

export const BREAK_TIME_SLOTS = new Set(['9:30-9:50']);

export function isBreakTimeSlot(timeSlot) {
  return BREAK_TIME_SLOTS.has(timeSlot);
}

export function resolveTimeSlots(configSlots) {
  if (!Array.isArray(configSlots) || configSlots.length === 0) {
    return [...DEFAULT_TIME_SLOTS];
  }

  const merged = [...configSlots];
  for (const slot of DEFAULT_TIME_SLOTS) {
    if (!merged.includes(slot)) {
      const anchorIndex = DEFAULT_TIME_SLOTS.indexOf(slot);
      const previousSlot = anchorIndex > 0 ? DEFAULT_TIME_SLOTS[anchorIndex - 1] : null;
      const insertAt = previousSlot ? merged.indexOf(previousSlot) + 1 : merged.length;
      merged.splice(insertAt > 0 ? insertAt : merged.length, 0, slot);
    }
  }

  return merged;
}

export const BREAK_COLOR = {
  bg: 'from-zinc-800/70 to-zinc-900/80',
  border: 'border-zinc-600/50',
  text: 'text-zinc-400',
  badge: 'bg-zinc-700/40',
};
