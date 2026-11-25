/**
 * Post-build: make dist/esm runnable under Node native ESM, and mark
 * package type for each emit format (dual-package hazard mitigation).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esmDir = path.join(root, 'dist/esm');
const cjsDir = path.join(root, 'dist/cjs');

function walkJs(dir, fn) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkJs(full, fn);
        else if (entry.name.endsWith('.js')) fn(full);
    }
}

function addJsExtensions(file) {
    const source = fs.readFileSync(file, 'utf8');
    const updated = source.replace(
        /(from\s+|import\s*\(\s*)(['"])(\.[^'"]+)\2/g,
        (match, prefix, quote, spec) => {
            if (/\.(js|json|mjs|cjs)$/.test(spec)) {
                return match;
            }
            return `${prefix}${quote}${spec}.js${quote}`;
        },
    );
    if (updated !== source) {
        fs.writeFileSync(file, updated);
    }
}

fs.mkdirSync(esmDir, { recursive: true });
fs.mkdirSync(cjsDir, { recursive: true });
fs.writeFileSync(path.join(esmDir, 'package.json'), JSON.stringify({ type: 'module' }, null, 4) + '\n');
fs.writeFileSync(path.join(cjsDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 4) + '\n');

walkJs(esmDir, addJsExtensions);
