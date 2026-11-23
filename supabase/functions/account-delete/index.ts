import { createAccountDelete } from './handler.mjs';
Deno.serve(createAccountDelete({env:key=>Deno.env.get(key)}));
