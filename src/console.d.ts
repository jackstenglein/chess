/** Minimal console typing for browser + Node without pulling in the full DOM lib. */
interface Console {
    error(...data: unknown[]): void;
    warn(...data: unknown[]): void;
    log(...data: unknown[]): void;
}

declare const console: Console;
