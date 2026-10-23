'use strict';
// View changes never load, pause or replace media. Only selecting a recording does.
const IBCViews = (() => {
  function create({document,window,library,hasAudio,recordings,current,isPlaying,saved,select,catalogFailed=()=>false}) {
    const names={'predicaciones':'Predicaciones','catecismo-confesion':'Catecismo y Confesión','taller-biblico':'Taller Bíblico'};
    const el=id=>document.getElementById(id);
    let view='home',category='predicaciones',key=null,page=0,visitedPlayer=false;
    function state() { return {ibcView:view,category,key,page}; }
    function remember(method='pushState') { window.history?.[method](state(),'','#'+view); }
    function show(name,focus=true,rememberView=true) {
      view=name;
      for(const candidate of ['home','library','player'])el(candidate+'-view').hidden=candidate!==view;
      if(focus)el(view==='player'?'sermon-title':view+'-heading').focus();
      window.scrollTo?.({top:0,behavior:'auto'});
      if(rememberView)remember();
    }
    function groupList() { return library.groups(recordings().filter(hasAudio),category); }
    function refresh() {
      const groups=groupList();
      let group=groups.find(item=>item.key===key);
      if(!group && groups.length===1)group=groups[0];
      key=group?.key || null;
      const focusedId=document.activeElement?.dataset?.id;
      const focusedSeries=document.activeElement?.dataset?.series;
      const listing=library.page(group?group.items:groups,page);page=listing.index;
      el('library-heading').textContent=group?.title || names[category];
      el('library-back').textContent=group && groups.length>1?'← Series':'← Inicio';
      el('library-empty').hidden=groups.length>0 || (!recordings().length && !catalogFailed());
      el('library-empty').textContent=catalogFailed() && !recordings().length?'No se pudieron cargar las grabaciones.':'Próximamente estarán disponibles las grabaciones';
      el('series-list').hidden=Boolean(group) || !groups.length;
      el('message-picker').hidden=!group;
      const series=el('series-list'),messages=el('sermon-list');series.replaceChildren();messages.replaceChildren();
      // Keep the series entries available to the same component, even when a sole
      // series opens directly. No extra category-specific player or long lists.
      for(const entry of (group?groups.slice(0,library.PAGE_SIZE):listing.items)) {
        const button=document.createElement('button');button.type='button';button.className='series-choice sermon-choice';button.dataset.series=entry.key;
        button.textContent=entry.title;
        button.addEventListener('click',()=>{key=entry.key;page=0;refresh();show('library');});
        series.append(button);
      }
      if(group)for(const item of listing.items) {
        const li=document.createElement('li'),button=document.createElement('button');
        button.type='button';button.className='sermon-choice';button.dataset.id=item.id;
        button.setAttribute('aria-current',String(item.id===current()?.id));
        button.setAttribute('aria-controls','player-view');
        const title=document.createElement('span');title.className='choice-title';title.textContent=library.label(item);
        const passage=document.createElement('span');passage.className='choice-meta';passage.textContent=item.passage || '';
        button.append(title,passage);button.addEventListener('click',()=>select(item));li.append(button);messages.append(li);
      }
      el('message-range').textContent=groups.length?`Página ${page+1}`:'';
      el('group-navigation').hidden=!groups.length || listing.pages<=1;
      el('previous-group').disabled=page===0;
      el('next-group').disabled=page===listing.pages-1;
      el('previous-group').hidden=false;el('next-group').hidden=false;
      el('previous-group').textContent='Anterior';el('next-group').textContent='Siguiente';
      el('return-player').hidden=!visitedPlayer;
      if(view==='library' && (focusedId || focusedSeries)) {
        const buttons=[...messages.children].map(li=>li.children[0]).concat([...series.children]);
        const target=buttons.find(button=>focusedId?button.dataset.id===focusedId:button.dataset.series===focusedSeries);
        (target || el('library-heading')).focus();
      }
      continuation();
    }
    function continuation() {
      const choice=saved();
      el('open-saved').hidden=!choice && !visitedPlayer;
      el('open-saved').textContent=choice && !isPlaying()?'Continuar escuchando':'Volver al reproductor';
    }
    function selected(item,open) {
      // Initial catalog loading must not move someone who already opened a category.
      if(open || view!=='library') {
        category=item.category;key=library.key(item);
        const group=groupList().find(entry=>entry.key===key);
        page=Math.floor(Math.max(0,group?.items.findIndex(entry=>entry.id===item.id) ?? 0)/library.PAGE_SIZE);
      }
      if(open)visitedPlayer=true;
      refresh();
      if(open)show('player');
    }
    for(const value of Object.keys(names))el('open-'+value).addEventListener('click',()=>{
      category=value;key=null;page=0;refresh();show('library');
    });
    el('skip-link').addEventListener('click',event=>{event?.preventDefault();el('contenido').focus();});
    el('library-back').addEventListener('click',()=>{
      if(key && groupList().length>1){key=null;page=0;refresh();show('library');}
      else show('home');
    });
    el('player-back').addEventListener('click',()=>{refresh();show('library');});
    el('return-player').addEventListener('click',()=>show('player'));
    el('open-saved').addEventListener('click',()=>{
      const item=isPlaying()?current():(saved()?.item || current());if(!item)return;
      if(current()?.id!==item.id)select(item);
      else {visitedPlayer=true;refresh();show('player');}
    });
    for(const [id,offset] of [['previous-group',-1],['next-group',1]])el(id).addEventListener('click',()=>{
      page+=offset;refresh();remember('replaceState');el('library-heading').focus();window.scrollTo?.({top:0,behavior:'auto'});
    });
    window.addEventListener('popstate',event=>{
      const value=event.state;
      if(value && ['home','library','player'].includes(value.ibcView) && Object.prototype.hasOwnProperty.call(names,value.category)) {
        category=value.category;key=typeof value.key==='string'?value.key:null;page=Number.isSafeInteger(value.page)&&value.page>=0?value.page:0;
        refresh();show(value.ibcView,true,false);
      }else show('home',true,false);
    });
    remember('replaceState');
    return {refresh,selected,continuation};
  }
  return {create};
})();
