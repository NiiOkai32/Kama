import {createPriceHandler} from './handler.mjs';
Deno.serve(createPriceHandler({env:key=>Deno.env.get(key)}));
