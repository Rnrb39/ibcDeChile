const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const model = require('../../catalog-utils.js');
const progressModel = require('../../playback-progress.js');
const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem:key=>data.get(key) ?? null, setItem:(key,value)=>data.set(key,value), removeItem:key=>data.delete(key) };
}

async function interfaceWith(records, options = {}) {
  let clock = options.now || Date.now();
  const nodes = [];
  const windowEvents = {};
  const documentEvents = {};
  const timers = [];
  const storage = options.storage || memoryStorage();
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.events = {}; this.hidden = false; this.open = false; this.textContent = ''; nodes.push(this); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(key, value) { this.attrs[key] = value; }
    removeAttribute(key) { delete this.attrs[key]; }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    emit(type) { for (const fn of this.events[type] || []) fn(); }
    click() { if (!this.disabled) this.emit('click'); }
    querySelectorAll(tag) { return this.children.filter(child => child.tag === tag); }
    focus() { document.activeElement = this; }
    scrollIntoView() {}
  }
  const ids = Object.fromEntries([...html.matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"[^>]*>([^<]*)/g)].map(match => {
    const element = new Element(match[1]);
    element.textContent = match[3].trim();
    element.hidden = /\bhidden\b/.test(match[0]);
    return [match[2], element];
  }));
  const document = {
    visibilityState:'visible', getElementById:id=>ids[id], createElement:tag=>new Element(tag),
    querySelectorAll:()=>nodes.filter(node=>node.className==='sermon-choice'),
    addEventListener:(type,fn)=>(documentEvents[type] ||= []).push(fn)
  };
  const player = ids.player;
  player.paused = true;
  player.currentTime = 0;
  player.duration = NaN;
  player.readyState = 0;
  player.currentSrc = '';
  player.playCalls = 0;
  player.pause = () => { if (!player.paused) {player.paused=true;player.emit('pause');} };
  player.play = async () => { player.playCalls++; if (options.playError) throw Error('play refused'); player.paused=false;player.emit('play'); };
  player.load = () => { player.currentSrc=player.src;player.currentTime=0;player.duration=NaN;player.readyState=0;player.emit('emptied'); };
  player.metadata = duration => {player.duration=duration;player.readyState=4;player.emit('loadedmetadata');player.emit('durationchange');player.emit('canplay');};
  const context = vm.createContext({
    IBCCatalog:model, IBCPlaybackProgress:{...progressModel,createStore:provider=>progressModel.createStore(provider,()=>clock)},
    Date:class extends Date { static now() {return clock;} }, document, navigator:{onLine:true},
    window:{localStorage:storage,addEventListener:(type,fn)=>(windowEvents[type] ||= []).push(fn),setInterval:fn=>timers.push(fn)},
    fetch:async()=>({ok:true,json:async()=>({version:1,sermons:records})})
  });
  vm.runInContext(script, context);
  await new Promise(setImmediate);
  return {
    ids, player, document, storage,
    select:(item, moveFocus=true)=>context.selectSermon(item, moveFocus),
    tick:ms=>{clock+=ms;timers.forEach(fn=>fn());},
    advanceClock:ms=>{clock+=ms;},
    hide:()=>{document.visibilityState='hidden';(documentEvents.visibilitychange || []).forEach(fn=>fn());},
    pagehide:()=>{(windowEvents.pagehide || []).forEach(fn=>fn());}
  };
}
module.exports = { interfaceWith, memoryStorage };
