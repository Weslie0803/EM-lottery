export {};

declare global {
  interface Window {
    electronAPI?: {
      ping: () => Promise<string>;
      participants?: {
        list: () => Promise<import("@core").Participant[]>;
        create: (data: { name: string; baseWeight?: number }) => Promise<import("@core").Participant>;
        update: (payload: { id: string; changes: Partial<import("@core").Participant> }) => Promise<import("@core").Participant>;
        remove: (id: string) => Promise<void>;
        bulkSave: (rows: import("@core").Participant[]) => Promise<void>;
      };
    };
  }
}
