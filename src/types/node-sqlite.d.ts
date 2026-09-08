/**
 * Declaración mínima de `node:sqlite` (SQLite nativo de Node 22.5+),
 * cubriendo únicamente la superficie usada por la app. `@types/node` v20
 * aún no la incluye.
 */
declare module "node:sqlite" {
  export interface StatementSync {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  export class DatabaseSync {
    constructor(path: string, options?: { readOnly?: boolean; open?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
