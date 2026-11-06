export const USD_AMOUNT_MINOR = 299;
export const FX_SOURCE = 'https://open.er-api.com/v6/latest/USD';
export const FX_PROVIDER = 'https://www.exchangerate-api.com';
export const DISPLAY_TTL_MS = 15 * 60 * 1000;

export function duetOffer() {
  return {currency:'USD',amount_minor:USD_AMOUNT_MINOR,interval:'month',host_covers_partner:true,checkout_enabled:false};
}

export function validateRate(data, now = Date.now()) {
  const rate=data?.rates?.GHS;
  const asOf=data?.time_last_update_unix*1000,next=data?.time_next_update_unix*1000;
  if(data?.result!=='success'||data.base_code!=='USD'||data.rates?.USD!==1||
      typeof rate!=='number'||!Number.isFinite(rate)||rate<=0||rate>1000000||
      !Number.isSafeInteger(data.time_last_update_unix)||!Number.isSafeInteger(data.time_next_update_unix)||
      !Number.isSafeInteger(asOf)||!Number.isSafeInteger(next)||asOf<=0||
      asOf>now+5*60*1000||now-asOf>27*60*60*1000||
      next<=now||next<=asOf||next-asOf>27*60*60*1000)throw new Error('Fresh USD/GHS rate unavailable.');
  return {rate,asOf,next};
}

export function ghsAmountMinor(rate) {
  if(typeof rate!=='number'||!Number.isFinite(rate)||rate<=0||rate>1000000)throw new Error('Invalid rate.');
  // Both currencies have 100 minor units. Round the converted 299 US cents
  // to the nearest pesewa using fixed-point arithmetic, with no hidden markup.
  const scale=100000000n,scaled=BigInt(Math.round(rate*Number(scale)));
  const result=Number((BigInt(USD_AMOUNT_MINOR)*scaled+scale/2n)/scale);
  if(!Number.isSafeInteger(result)||result<=0)throw new Error('Invalid converted amount.');
  return result;
}

export function displayPrice(rate, now = Date.now()) {
  if(rate.next<=now||now-rate.asOf>27*60*60*1000)throw new Error('Rate expired.');
  return {
    offer:duetOffer(),
    local_price:{currency:'GHS',amount_minor:ghsAmountMinor(rate.rate)},
    rate_as_of:new Date(rate.asOf).toISOString(),
    rate_next_update_at:new Date(rate.next).toISOString(),
    display_valid_until:new Date(Math.min(now+DISPLAY_TTL_MS,rate.next)).toISOString(),
    server_now:new Date(now).toISOString(),
    provider:{name:'ExchangeRate-API',url:FX_PROVIDER,refresh:'daily'},
    purpose:'price_display_only',checkout_enabled:false
  };
}
