import { ProtocolData, ProtocolHistoryItem, formatDateTimeDe } from "../types/protocol";

const HISTORY_STORAGE_KEY = "ja_protocol_history_v1";
const MAX_HISTORY_ITEMS = 10;

/**
 * Checks if protocol data has any meaningful user input (not just defaults).
 */
export function hasMeaningfulContent(data: ProtocolData): boolean {
  return Boolean(
    data.attendees.trim() ||
      data.topics.trim() ||
      data.summary.trim() ||
      data.nextSteps.trim() ||
      data.support.trim() ||
      data.nextAttendees.trim() ||
      data.nextMeeting.trim() ||
      data.speakerName.trim() ||
      data.recorderName.trim() ||
      data.projectGroup.trim()
  );
}

/**
 * Loads the protocol history from localStorage with automatic deduplication.
 */
export function getProtocolHistory(): ProtocolHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Deduplicate: If multiple items share the same ID or (projectGroup + date), keep the newest!
      const seen = new Map<string, ProtocolHistoryItem>();
      for (const item of parsed) {
        if (!item || !item.id) continue;
        const groupKey = (item.projectGroup || "").trim().toLowerCase();
        const dateKey = (item.date || "").trim();
        // Identity key based on group + date, or item id if group is empty
        const key = groupKey && dateKey ? `${groupKey}:::${dateKey}` : `id:::${item.id}`;

        const existing = seen.get(key);
        if (!existing || (item.updatedAt || 0) > (existing.updatedAt || 0)) {
          seen.set(key, item);
        }
      }

      const deduplicated = Array.from(seen.values()).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      );

      // If duplicates were cleaned up, persist clean list back to localStorage
      if (deduplicated.length !== parsed.length) {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(deduplicated));
      }

      return deduplicated.slice(0, MAX_HISTORY_ITEMS);
    }
  } catch (err) {
    console.warn("Konnte Protokoll-Verlauf nicht aus LocalStorage laden:", err);
  }
  return [];
}

/**
 * Saves or updates a protocol in the history list (up to max 10 entries).
 * Automatically updates existing entries for the same ID or same (group + date).
 */
export function saveToProtocolHistory(
  data: ProtocolData,
  currentId?: string | null
): { history: ProtocolHistoryItem[]; activeId: string } {
  const currentList = getProtocolHistory();

  // If no meaningful content yet, don't pollute history
  if (!hasMeaningfulContent(data)) {
    return { history: currentList, activeId: currentId || data.id || "" };
  }

  const now = Date.now();
  const formattedNow = formatDateTimeDe(new Date(now));

  const normalizedGroup = (data.projectGroup || "").trim().toLowerCase();
  const normalizedDate = (data.date || "").trim();

  // 1. Try to find existing entry by ID
  let existingIndex = -1;
  const targetId = data.id || currentId;
  if (targetId) {
    existingIndex = currentList.findIndex((item) => item.id === targetId);
  }

  // 2. If not found by ID, match by same (projectGroup + date)
  if (existingIndex === -1 && normalizedGroup && normalizedDate) {
    existingIndex = currentList.findIndex((item) => {
      const g = (item.projectGroup || "").trim().toLowerCase();
      const d = (item.date || "").trim();
      return g === normalizedGroup && d === normalizedDate;
    });
  }

  // If found, preserve existing ID; otherwise create a new stable ID
  const activeId =
    existingIndex >= 0
      ? currentList[existingIndex].id
      : targetId || `proto_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const updatedItem: ProtocolHistoryItem = {
    id: activeId,
    data: { ...data, id: activeId },
    projectGroup: data.projectGroup || "Ohne Gruppe",
    date: data.date,
    updatedAt: now,
    formattedUpdatedAt: formattedNow,
  };

  let newList: ProtocolHistoryItem[];

  if (existingIndex >= 0) {
    // Replace existing item and move to top
    newList = [
      updatedItem,
      ...currentList.filter((_, idx) => idx !== existingIndex),
    ];
  } else {
    // Prepend new item to top
    newList = [updatedItem, ...currentList];
  }

  // Limit to MAX_HISTORY_ITEMS (10)
  newList = newList.slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newList));
  } catch (err) {
    console.warn("Konnte Protokoll-Verlauf nicht in LocalStorage speichern:", err);
  }

  return { history: newList, activeId };
}

/**
 * Removes an item from the history.
 */
export function deleteFromProtocolHistory(id: string): ProtocolHistoryItem[] {
  const currentList = getProtocolHistory();
  const filtered = currentList.filter((item) => item.id !== id);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Konnte Eintrag nicht aus dem Verlauf löschen:", err);
  }
  return filtered;
}

/**
 * Clears the entire protocol history.
 */
export function clearProtocolHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (err) {
    console.warn("Konnte Verlauf nicht leeren:", err);
  }
}
