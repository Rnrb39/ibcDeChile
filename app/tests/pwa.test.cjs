const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const origin = 'https://ibcdechile.org';
const scope = `${origin}/app/`;

function workerHarness({offline = false, hang = false, quota = false, status = 200, cached = true} = {}) {
  const events = {};
  const observed = { deleted: [], stored: [], network: [], skipped: 0 };
  const cache = {
    addAll: async requests => { observed.installed = requests; },
    match: async () => cached ? new Response('cached interface') : undefined,
    put: async (request, response) => {
      if (quota) throw Error('quota');
      observed.stored.push({url: request.url, body: await response.text()});
    }
  };
  vm.runInNewContext(read('sw.js'), {
    URL, Request, Response, AbortController,
    setTimeout: callback => { if (hang) queueMicrotask(callback); return 1; }, clearTimeout() {},
    self: {registration:{scope}, addEventListener:(name, fn) => events[name] = fn, skipWaiting:async()=>{observed.skipped++;}},
    caches: {
      open: async name => {observed.cacheName=name;return cache;},
      keys: async () => ['ibc-pwa-/app/-v5','ibc-pwa-/app/-v6','public-site-cache','ibc-pwa-/other-app/-v1'],
      delete: async name => observed.deleted.push(name)
    },
    fetch: async (request, options) => {
      observed.network.push({url:request.url,cache:options.cache});
      if (offline) throw Error('offline');
      if (hang) return new Promise((resolve,reject) => options.signal.addEventListener('abort',()=>reject(Error('timeout'))));
      return new Response('fresh interface', {status});
    }
  });
  function request(url, options) {
    let result;
    events.fetch({request:new Request(url, options), respondWith:promise=>result=promise});
    return result;
  }
  async function lifecycle(type, data) { let result; events[type]({data,waitUntil:promise=>result=promise}); await result; }
  return {observed,request,lifecycle};
}

test('production manifest, local references and real PNG dimensions are valid below /app/', () => {
  const manifest=JSON.parse(read('manifest.webmanifest'));
  const url=`${scope}manifest.webmanifest`;
  assert.ok(manifest.name && manifest.short_name);
  assert.equal(manifest.display,'standalone');
  for(const field of ['id','start_url','scope']) assert.equal(new URL(manifest[field],url).href,scope);
  const icons=[...manifest.icons,{src:'icons/apple-touch-icon.png',sizes:'180x180'}];
  for(const icon of icons) {
    const image=fs.readFileSync(path.join(root,icon.src));
    assert.equal(image.subarray(1,4).toString(),'PNG');
    assert.equal(`${image.readUInt32BE(16)}x${image.readUInt32BE(20)}`,icon.sizes);
  }
  for(const [,reference] of read('index.html').matchAll(/(?:src|href)="([^"]+)"/g)) {
    if(reference.startsWith('#'))continue;
    assert.ok(new URL(reference,scope).href.startsWith(scope) || ['../catalogo-config.js','../catalogo-publico.js'].includes(reference));
    assert.ok(fs.existsSync(path.join(root,reference)),reference);
  }
});

test('installation revalidates shell; cleanup deletes only this app old cache', async () => {
  const harness=workerHarness();
  await harness.lifecycle('install');
  for(const request of harness.observed.installed) {
    assert.equal(request.cache,'reload');
    assert.ok(request.url.startsWith(scope) || [origin+'/catalogo-config.js',origin+'/catalogo-publico.js'].includes(request.url));
    assert.ok(fs.existsSync(path.join(root,request.url.startsWith(scope)?new URL(request.url).pathname.slice(5)||'index.html':'../'+new URL(request.url).pathname.slice(1))));
  }
  assert.ok(harness.observed.installed.some(request=>request.url===scope+'pwa.js'));
  await harness.lifecycle('activate');
  assert.deepEqual(harness.observed.deleted,['ibc-pwa-/app/-v5','ibc-pwa-/app/-v6']);
});

test('worker never intercepts R2, other pages, range requests or non-GET', () => {
  const harness=workerHarness();
  for(const item of JSON.parse(read('catalog.json')).sermons) assert.equal(harness.request(item.audioUrl),undefined);
  for(const url of [origin+'/',origin+'/index.html',origin+'/script.js',origin+'/data/videos.json',scope+'tests/preview-escuela.png']) assert.equal(harness.request(url),undefined);
  assert.equal(harness.request(scope+'index.html',{headers:{Range:'bytes=0-1023'}}),undefined);
  assert.equal(harness.request(scope+'catalog.json',{method:'POST'}),undefined);
  assert.equal(harness.observed.network.length,0);
});

test('online response revalidates HTTP cache and replaces stale shell', async () => {
  const harness=workerHarness();
  assert.equal(await (await harness.request(scope)).text(),'fresh interface');
  assert.equal(harness.observed.network[0].cache,'no-cache');
  assert.equal(harness.observed.stored[0].body,'fresh interface');
});

for(const [name,options] of [['offline',{offline:true}],['hung network',{hang:true}],['HTTP failure',{status:503}]]) {
  test(`${name} falls back to shell without caching failures`, async () => {
    const harness=workerHarness(options);
    assert.equal(await (await harness.request(scope)).text(),'cached interface');
    assert.equal(harness.observed.stored.length,0);
  });
}

test('quota failure preserves successful online response; no-cache offline returns 503', async () => {
  assert.equal(await (await workerHarness({quota:true}).request(scope)).text(),'fresh interface');
  assert.equal((await workerHarness({offline:true,cached:false}).request(scope)).status,503);
});

test('worker activates early only on explicit update request', async () => {
  const harness=workerHarness();
  await harness.lifecycle('install');
  await harness.lifecycle('message',{type:'UNRELATED'});
  assert.equal(harness.observed.skipped,0);
  await harness.lifecycle('message',{type:'ACTIVATE_UPDATE'});
  assert.equal(harness.observed.skipped,1);
});

test('update notice does not reload playing page without user action', async () => {
  const events={}; const button={addEventListener:(name,fn)=>events[name]=fn}; const notice={hidden:true};
  let reloads=0; const messages=[]; let options;
  const registration={waiting:{postMessage:message=>messages.push(message.type)},addEventListener(){},update:async()=>{}};
  const serviceWorker={controller:{},addEventListener:(name,fn)=>events[name]=fn,register:async(url,opts)=>{assert.equal(url,'sw.js');options=opts;return registration;}};
  vm.runInNewContext(read('pwa.js'), {
    navigator:{serviceWorker,onLine:true},
    document:{visibilityState:'visible',getElementById:id=>id==='update-notice'?notice:button,addEventListener(){}},
    window:{isSecureContext:true,location:{reload:()=>reloads++},addEventListener(){},setInterval(){}}
  });
  await new Promise(setImmediate);
  assert.equal(options.scope,'./');assert.equal(options.updateViaCache,'none');
  assert.equal(notice.hidden,false);
  events.controllerchange();assert.equal(reloads,0);
  events.click();assert.deepEqual(messages,['ACTIVATE_UPDATE']);assert.equal(button.disabled,true);
  events.controllerchange();events.controllerchange();assert.equal(reloads,1);
});

test('text and focus colors meet contrast thresholds', () => {
  function luminance(hex) {
    const rgb=hex.match(/\w\w/g).map(channel=>parseInt(channel,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
    return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  }
  function contrast(a,b) { const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05); }
  const css=read('app.css'),color=name=>css.match(new RegExp(`--${name}:#([a-f0-9]{6})`))[1];
  for(const [text,background] of [[color('ink'),color('paper')],[color('muted'),color('paper')],[color('muted'),'f4f3ef'],[color('muted'),'ffffff'],[color('navy'),'ffffff'],['ffffff',color('navy')],['ffffff',color('navy-hover')]]) assert.ok(contrast(text,background)>=4.5,`${text}/${background}`);
  assert.ok(contrast(color('navy'),'ffffff')>=3);
});
