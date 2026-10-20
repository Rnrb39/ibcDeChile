'use strict';
const IBCLibrary = (() => {
  const PAGE_SIZE = 10;
  function key(item) { return JSON.stringify([item.category, item.series || '']); }
  function sequence(items) {
    return [...items].sort((a,b) => {
      if(a.category === 'catecismo-confesion') {
        const aq=Number.isSafeInteger(a.catechismQuestion)?a.catechismQuestion:null;
        const bq=Number.isSafeInteger(b.catechismQuestion)?b.catechismQuestion:null;
        if(aq!==null || bq!==null)return aq===null?1:bq===null?-1:bq-aq;
      }
      if(a.number && b.number)return a.number-b.number;
      if(a.number || b.number)return a.number?-1:1;
      const aDate=typeof a.date==='string'?a.date:'';
      const bDate=typeof b.date==='string'?b.date:'';
      return aDate.localeCompare(bDate);
    });
  }
  function groups(items,category) {
    const result=new Map();
    for(const item of items.filter(item=>item.category===category)) {
      const id=key(item);
      if(!result.has(id))result.set(id,{key:id,title:item.series || (category==='predicaciones'?'Predicaciones':'Grabaciones'),items:[]});
      result.get(id).items.push(item);
    }
    return [...result.values()].map(group=>({...group,items:sequence(group.items)}));
  }
  function page(items,index) {
    const pages=Math.max(1,Math.ceil(items.length/PAGE_SIZE));
    const selected=Math.max(0,Math.min(pages-1,index));
    const start=selected*PAGE_SIZE;
    return {index:selected,pages,start,end:Math.min(start+PAGE_SIZE,items.length),items:items.slice(start,start+PAGE_SIZE)};
  }
  function label(item) {
    if(item.category==='catecismo-confesion' && Number.isSafeInteger(item.catechismQuestion))return `Pregunta ${item.catechismQuestion} · ${item.title}`;
    return `${item.number ? `${item.number}. ` : ''}${item.title}`;
  }
  return {PAGE_SIZE,key,sequence,groups,page,label};
})();
if(typeof module!=='undefined' && module.exports)module.exports=IBCLibrary;
