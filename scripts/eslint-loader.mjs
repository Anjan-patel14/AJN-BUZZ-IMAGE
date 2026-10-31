import { register } from 'node:module';

const loaderCode = `
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function load(url, context, nextLoad) {
  if (url.endsWith('/minimatch/dist/esm/index.js')) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    const patched = source + '\\nimport { minimatch as _mm, Minimatch as _MM } from "./index.js";\\nconst _def = Object.assign((p, pat, opt) => _mm(p, pat, opt), _mm, { Minimatch: _MM, minimatch: _mm });\\nexport default _def;\\n';
    return {
      format: 'module',
      shortCircuit: true,
      source: patched,
    };
  }
  return nextLoad(url, context);
}
`;

register(`data:text/javascript;base64,${Buffer.from(loaderCode).toString('base64')}`);
