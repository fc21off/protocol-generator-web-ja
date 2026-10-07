export interface ProtocolData {
  id?: string;
  date: string;
  projectGroup: string;
  attendees: string;
  topics: string;
  summary: string;
  nextSteps: string;
  support: string;
  nextAttendees: string;
  nextMeeting: string;
  speakerName: string;
  recorderName: string;
}

export interface CompileResult {
  success: boolean;
  pdfBase64?: string;
  errorMessage?: string;
  compilerUsed: string;
}

export interface CompilerStatus {
  isAvailable: boolean;
  compilerName: string;
  path?: string | null;
  serverVersion?: string;
  nodeVersion?: string;
  platform?: string;
}

export interface UploadResult {
  success: boolean;
  message: string;
}

export interface ProtocolHistoryItem {
  id: string;
  data: ProtocolData;
  projectGroup: string;
  date: string;
  updatedAt: number; // Unix timestamp
  formattedUpdatedAt: string; // e.g. "06.10.2026, 23:15 Uhr"
}

export const formatDateDe = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export const formatDateTimeDe = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year}, ${hours}:${minutes} Uhr`;
};

export const INITIAL_PROTOCOL_DATA: ProtocolData = {
  date: formatDateDe(),
  projectGroup: "",
  attendees: "",
  topics: "",
  summary: "",
  nextSteps: "",
  support: "",
  nextAttendees: "",
  nextMeeting: "",
  speakerName: "",
  recorderName: "",
};

export const PROJECT_GROUPS = [
  "Politik mit Uns!",
  "Schule & Bildung",
  "Events & Freizeit",
  "Fitness & Sports",
  "Mobility",
  "Nachhaltigkeit & Umwelt",
  "Meine Idee für Leonberg",
  "Equality",
  "Safe Space",
  "Schlittschuhbahn",
  "Jugendausschuss",
  "Jugendforum",
];
