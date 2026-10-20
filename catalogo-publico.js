'use strict';
// One versioned consumer shared by the web and PWA. No administrative endpoints.
const IBCPublicCatalog=(()=>{
 const categories={predicacion:'predicaciones',catecismo_confesion:'catecismo-confesion',taller_biblico:'taller-biblico'};
 function media(value,kind){try{const url=new URL(value.url);return url.origin==='https://videos.ibcdechile.org'&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname.endsWith(kind==='audio'?'.mp3':'.mp4')&&(kind!=='audio'||url.pathname.startsWith('/audio/'))&&value.mime_type===(kind==='audio'?'audio/mpeg':'video/mp4')&&typeof value.version==='string'&&!!value.version;}catch{return false;}}
 function adapt(catalog){
  if(catalog?.version_esquema!==1||!/^\d+$/.test(catalog.revision_catalogo)||!Number.isFinite(Date.parse(catalog.actualizado_en))||!Array.isArray(catalog.contenidos))throw Error('CATALOG_INVALID');
  const ids=new Set();const sermons=catalog.contenidos.map(d=>{if(!/^[1-9]\d*$/.test(d.id)||ids.has(d.id)||!categories[d.categoria]||typeof d.titulo!=='string'||!d.titulo.trim()||typeof d.predicador?.nombre!=='string'||!media(d.video,'video')||d.audio!==undefined&&!media(d.audio,'audio'))throw Error('CATALOG_INVALID');ids.add(d.id);return {id:'admin-'+d.id,publicId:d.id,title:d.titulo,category:categories[d.categoria],speaker:d.predicador.nombre,description:typeof d.descripcion==='string'?d.descripcion:null,passage:d.pasaje_biblico,series:d.serie?.titulo||null,number:d.numero_mensaje,date:d.fecha,dateEstimated:false,videoUrl:d.video.url,videoVersion:d.video.version,audioUrl:d.audio?.url||null,audioVersion:d.audio?.version||null,audioSizeBytes:d.audio?.bytes||null,transcriptText:null};});
  return {version:1,revision:catalog.revision_catalogo,sermons};
 }
 function create({endpoint='https://api.ibcdechile.org/v1/catalogo.json',fetcher=globalThis.fetch,storage}={}){
  if(endpoint!=='https://api.ibcdechile.org/v1/catalogo.json')throw Error('CATALOG_ENDPOINT_REJECTED');let etag=null,last=null,pending=null;
  try{const raw=storage?.getItem('ibc-public-catalog-v1');if(raw&&raw.length<1048576){const cached=JSON.parse(raw);adapt(cached);last=cached;}}catch{}
  async function read(){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetcher(endpoint,{credentials:'omit',redirect:'error',cache:'no-cache',headers:etag?{'If-None-Match':etag}:{},signal:controller.signal});if(r.status===304&&last)return {catalog:adapt(last),stale:false};if(!r.ok)throw Error('CATALOG_UNAVAILABLE');const value=await r.json(),catalog=adapt(value);last=value;etag=r.headers.get('ETag');try{const serialized=JSON.stringify(value);if(serialized.length<1048576)storage?.setItem('ibc-public-catalog-v1',serialized);}catch{}return {catalog,stale:false};}catch{if(last)return {catalog:adapt(last),stale:true};throw Error('CATALOG_UNAVAILABLE');}finally{clearTimeout(timer);}}
  return {load(){pending??=read().finally(()=>{pending=null;});return pending;}};
 }
 function merge(legacy,live){return {version:1,sermons:[...live.sermons,...legacy.sermons.filter(x=>!String(x.id).startsWith('admin-'))]};}
 return {adapt,create,merge};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=IBCPublicCatalog;else globalThis.IBCPublicCatalog=IBCPublicCatalog;
