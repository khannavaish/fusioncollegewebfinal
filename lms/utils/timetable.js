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

  const uniqueSlots = [];
  const seen = new Set();

  for (const slot of configSlots) {
    const cleanSlot = slot?.toString().trim();
    if (!cleanSlot) continue;

    const slotKey = normalizeTimetableText(cleanSlot);
    if (seen.has(slotKey)) continue;

    seen.add(slotKey);
    uniqueSlots.push(cleanSlot);
  }

  return uniqueSlots.sort(compareTimeSlots);
}

export const BREAK_COLOR = {
  bg: 'from-zinc-800/70 to-zinc-900/80',
  border: 'border-zinc-600/50',
  text: 'text-zinc-400',
  badge: 'bg-zinc-700/40',
};

export function normalizeTimetableText(value = '') {
  return value.toString().trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeComparableText(value = '') {
  return normalizeTimetableText(value).replace(/[^a-z0-9]+/g, '');
}

export function normalizeTeacherName(value = '') {
  return normalizeTimetableText(value).replace(/^(sir|mr|mrs|ms|dr|mam|madam)\s+/, '');
}

export function sameTimetableText(a = '', b = '') {
  return normalizeTimetableText(a) === normalizeTimetableText(b);
}

export function teacherNameMatches(a = '', b = '') {
  const normalizedA = normalizeTeacherName(a);
  const normalizedB = normalizeTeacherName(b);
  return !!normalizedA && !!normalizedB && normalizedA === normalizedB;
}

export function teacherMatchesSlot(teacher, slot) {
  if (!teacher || !slot) return false;
  
  // If slot has teacherId, use ID-based matching (most reliable)
  if (slot.teacherId) {
    return teacher.id === slot.teacherId;
  }
  
  // Fallback to name-based matching
  return teacherNameMatches(teacher.name, slot.teacher);
}

export function getClassSubjectKey(className = '', subjectName = '') {
  return `${normalizeComparableText(className)}|${normalizeComparableText(subjectName)}`;
}

export function splitTimetableClassName(name = '') {
  const trimmed = name.toString().trim();
  const upper = trimmed.toUpperCase();

  if (upper.startsWith('BOYS ')) return { section: 'BOYS', className: trimmed.replace(/^boys\s+/i, '').trim() };
  if (upper.startsWith('GIRLS ')) return { section: 'GIRLS', className: trimmed.replace(/^girls\s+/i, '').trim() };
  if (upper.startsWith('OTHER ')) return { section: 'OTHER', className: trimmed.replace(/^other\s+/i, '').trim() };

  return { section: null, className: trimmed };
}

export function classDisplayNameFromSlot(slot) {
  if (!slot?.className) return '';
  return normalizeTimetableText(slot.section) === 'other'
    ? slot.className
    : `${slot.section || ''} ${slot.className}`.trim();
}

export function slotMatchesClass(slot, className = '') {
  if (!slot?.className || !className) return false;

  const classInfo = splitTimetableClassName(className);
  const slotClassName = normalizeComparableText(slot.className);
  const slotSection = normalizeComparableText(slot.section);
  const targetClassName = normalizeComparableText(classInfo.className);
  const sectionMatch = !classInfo.section || slotSection === normalizeComparableText(classInfo.section);
  const classMatch = slotClassName === targetClassName;

  return sectionMatch && classMatch;
}

export function slotMatchesClassSubject(slot, classSubject) {
  if (!slot || !classSubject?.class || !classSubject?.subject) return false;
  return slotMatchesClass(slot, classSubject.class.name) && sameTimetableText(slot.subject, classSubject.subject.name);
}

export function findMatchingClassSubject(classSubjects, slot) {
  if (!Array.isArray(classSubjects) || !slot) return null;

  const slotClassName = classDisplayNameFromSlot(slot) || `${slot.section || ''} ${slot.className || ''}`.trim();
  const slotKey = getClassSubjectKey(slotClassName, slot.subject);

  return (
    classSubjects.find((classSubject) => (
      getClassSubjectKey(classSubject?.class?.name, classSubject?.subject?.name) === slotKey
    )) ||
    classSubjects.find((classSubject) => slotMatchesClassSubject(slot, classSubject)) ||
    null
  );
}

export function compareTimeSlots(a, b) {
  const parsedA = parseTimeSlot(a);
  const parsedB = parseTimeSlot(b);

  if (parsedA && parsedB) {
    if (parsedA.startMin !== parsedB.startMin) return parsedA.startMin - parsedB.startMin;
    if (parsedA.endMin !== parsedB.endMin) return parsedA.endMin - parsedB.endMin;
  } else if (parsedA) {
    return -1;
  } else if (parsedB) {
    return 1;
  }

  return normalizeTimetableText(a).localeCompare(normalizeTimetableText(b));
}

export function sortSlotsByTime(slots, timeSlots) {
  const slotsToSort = [...slots];

  if (Array.isArray(timeSlots) && timeSlots.length > 0) {
    const rankByTime = new Map(resolveTimeSlots(timeSlots).map((slot, index) => [normalizeTimetableText(slot), index]));
    slotsToSort.sort((a, b) => {
      const aRank = rankByTime.has(normalizeTimetableText(a.timeSlot))
        ? rankByTime.get(normalizeTimetableText(a.timeSlot))
        : Number.MAX_SAFE_INTEGER;
      const bRank = rankByTime.has(normalizeTimetableText(b.timeSlot))
        ? rankByTime.get(normalizeTimetableText(b.timeSlot))
        : Number.MAX_SAFE_INTEGER;

      if (aRank !== bRank) return aRank - bRank;
      return compareTimeSlots(a.timeSlot, b.timeSlot);
    });
    return slotsToSort;
  }

  return slotsToSort.sort((a, b) => compareTimeSlots(a.timeSlot, b.timeSlot));
}

export function getScheduledSlotsForClassSubject(classSubject, timetableSlots, timeSlots, teacher = null) {
  return sortSlotsByTime(
    timetableSlots.filter((slot) => {
      const matchesClassSubject = slotMatchesClassSubject(slot, classSubject);
      const matchesTeacher = !teacher || teacherMatchesSlot(teacher, slot);
      return matchesClassSubject && matchesTeacher && slot.timeSlot;
    }),
    timeSlots,
  );
}

export function getFirstClassSlot(slots, timeSlots) {
  return sortSlotsByTime(
    slots.filter((slot) => slot?.subject?.trim() && slot?.teacher?.trim() && slot?.timeSlot?.trim()),
    timeSlots,
  )[0] || null;
}

export function getClassGroupKey(slot) {
  return `${normalizeTimetableText(slot?.section || '')}|${normalizeTimetableText(slot?.className || '')}`;
}

export function getScheduleStatus(slots) {
  const parsedSlots = sortSlotsByTime(slots)
    .map((slot) => ({ ...slot, parsed: parseTimeSlot(slot.timeSlot) }))
    .filter((slot) => slot.parsed);

  if (parsedSlots.length === 0) return null;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentClass = parsedSlots.find((slot) => nowMinutes >= slot.parsed.startMin && nowMinutes <= slot.parsed.endMin);
  const nextClass = parsedSlots.find((slot) => slot.parsed.startMin > nowMinutes);
  const allDone = parsedSlots.every((slot) => slot.parsed.endMin < nowMinutes);

  if (currentClass) {
    return {
      type: 'active',
      label: 'Class In Progress',
      detail: `${currentClass.subject} - ${classDisplayNameFromSlot(currentClass)}`,
      time: currentClass.timeSlot,
      color: 'emerald',
    };
  }

  if (nextClass) {
    const minsUntil = nextClass.parsed.startMin - nowMinutes;
    return {
      type: 'next',
      label: minsUntil <= 10 ? 'Next Class Starting Soon' : 'Next Class',
      detail: `${nextClass.subject} - ${classDisplayNameFromSlot(nextClass)}`,
      time: nextClass.timeSlot,
      color: minsUntil <= 10 ? 'amber' : 'cyan',
    };
  }

  if (allDone) {
    return {
      type: 'done',
      label: 'Done for Today',
      detail: `You had ${parsedSlots.length} class${parsedSlots.length !== 1 ? 'es' : ''} today.`,
      time: null,
      color: 'zinc',
    };
  }

  return null;
}

export function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function parseTimeSlot(slotStr) {
  if (!slotStr) return null;
  const [start, end] = slotStr.split('-').map((part) => part.trim());
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin == null || endMin == null) return null;
  return { startMin, endMin };
}
