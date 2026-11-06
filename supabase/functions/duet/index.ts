import { createDuetHandler } from './handler.mjs';
Deno.serve(createDuetHandler({ env: (key: string) => Deno.env.get(key) }));
