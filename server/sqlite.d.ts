declare module 'node:sqlite' {
  export interface StatementSync {
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    all(...params: unknown[]): Record<string, unknown>[];
    get(...params: unknown[]): Record<string, unknown> | undefined;
  }

  export class DatabaseSync {
    constructor(location?: string, options?: { open?: boolean; readOnly?: boolean; enableForeignKeyConstraints?: boolean });
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
