import { mountPlayer } from "./player";

/**
 * SPA 视图过渡不会触发 pagehide，靠 astro:before-swap 统一清理上一页的定时器与监听，
 * 否则旧轮播的定时器会一直「点击」已脱离文档的旧海报节点，
 * 把旧数据写进新页面的信息栏，造成文字与海报对不上。
 */
const cleanups = new Set<() => void>();
if (typeof document !== "undefined") {
  document.addEventListener("astro:before-swap", () => {
    cleanups.forEach((fn) => fn());
    cleanups.clear();
  });
}

export function initMacApp(root: ParentNode=document){
 const app=root.querySelector<HTMLElement>('[data-mac-app]');if(!app)return;
 // 防重入：同一批 DOM 只初始化一次，避免监听叠加。
 if(app.dataset.macInit)return;app.dataset.macInit='1';
 const controller=new AbortController();const {signal}=controller;
 cleanups.add(()=>controller.abort());
 app.addEventListener('pointermove',e=>{const r=app.getBoundingClientRect();app.style.setProperty('--px',`${e.clientX-r.left}px`);app.style.setProperty('--py',`${e.clientY-r.top}px`)},{passive:true,signal});
 root.querySelectorAll<HTMLElement>('[data-choice]').forEach(choice=>choice.addEventListener('click',()=>{
  const group=choice.parentElement;group?.querySelectorAll('[data-choice]').forEach(x=>x.classList.remove('is-active'));choice.classList.add('is-active');
  const title=choice.dataset.title,sub=choice.dataset.sub,note=choice.dataset.note,color=choice.dataset.color,url=choice.dataset.url;
  root.querySelectorAll<HTMLElement>('[data-live-title]').forEach(x=>{if(title)x.textContent=title});root.querySelectorAll<HTMLElement>('[data-live-sub]').forEach(x=>{if(sub)x.textContent=sub});root.querySelectorAll<HTMLElement>('[data-live-note]').forEach(x=>{if(note)x.textContent=note});root.querySelectorAll<HTMLElement>('[data-live-cover]').forEach(x=>{if(color)x.style.setProperty('--cover',color)});root.querySelectorAll<HTMLAnchorElement>('[data-live-link]').forEach(x=>{if(url)x.href=url});
  const fields=['year','duration','director','actors','summary'] as const;fields.forEach(field=>{const value=choice.dataset[field];root.querySelectorAll<HTMLElement>(`[data-live-${field}]`).forEach(x=>{if(value)x.textContent=value})});
 },{signal}));
 const flow=root.querySelector<HTMLElement>('[data-record-flow]');
 if(flow){const items=Array.from(flow.querySelectorAll<HTMLElement>('[data-flow-item]'));let active=0,start=0;const paint=()=>{items.forEach((item,i)=>{const d=i-active;item.style.transform=`translate(-50%,-50%) translateX(${d*210}px) translateZ(${-Math.abs(d)*150}px) rotateY(${d*-22}deg)`;item.style.opacity=String(Math.max(.22,1-Math.abs(d)*.2));item.classList.toggle('is-active',i===active)})};const select=(n:number)=>{active=(n+items.length)%items.length;paint();items[active]?.click()};items.forEach((item,i)=>item.addEventListener('click',()=>{active=i;paint()},{signal}));flow.addEventListener('pointerdown',e=>{start=e.clientX;flow.setPointerCapture(e.pointerId)},{signal});flow.addEventListener('pointerup',e=>{const d=e.clientX-start;if(Math.abs(d)>35)select(active+(d<0?1:-1))},{signal});flow.addEventListener('wheel',e=>{e.preventDefault();select(active+(e.deltaY>0?1:-1))},{passive:false,signal});paint()}
 const ring=root.querySelector<HTMLElement>('[data-book-ring]');
 if(ring){const books=Array.from(ring.querySelectorAll<HTMLElement>('[data-book-object]'));let rotation=0,start=0;const rotate=(d:number)=>{rotation+=d;ring.style.setProperty('--ring-rotation',`${rotation}deg`)};ring.addEventListener('pointerdown',e=>{start=e.clientX;ring.setPointerCapture(e.pointerId)},{signal});ring.addEventListener('pointerup',e=>rotate((e.clientX-start)*.35),{signal});ring.addEventListener('wheel',e=>{e.preventDefault();rotate(e.deltaY*.08)},{passive:false,signal});books.forEach(book=>book.querySelector('.book-face')?.addEventListener('click',()=>{books.forEach(other=>{if(other!==book)other.classList.remove('is-open')});book.classList.toggle('is-open')},{signal}))}
 const carousel=root.querySelector<HTMLElement>('[data-movie-carousel]');
 if(carousel){const posters=Array.from(carousel.querySelectorAll<HTMLElement>('[data-choice]'));const counter=carousel.querySelector<HTMLElement>('[data-movie-current]');let active=0,paused=false;const paint=()=>{const compact=innerWidth<760;posters.forEach((poster,index)=>{let distance=(index-active+posters.length)%posters.length;if(distance>posters.length/2)distance-=posters.length;const visible=distance>=-3&&distance<=4;const angle=distance*18*Math.PI/180;const x=Math.sin(angle)*(compact?155:310);const depth=(1-Math.cos(angle))*(compact?72:125);const y=depth*.16;const scale=.76+Math.cos(angle)*.24;poster.classList.toggle('is-window-hidden',!visible);poster.style.setProperty('--ring-x',`${x.toFixed(1)}px`);poster.style.setProperty('--ring-y',`${y.toFixed(1)}px`);poster.style.setProperty('--ring-z',`${(-depth).toFixed(1)}px`);poster.style.setProperty('--ring-r',`${(-Math.sin(angle)*19).toFixed(1)}deg`);poster.style.setProperty('--ring-s',scale.toFixed(3));poster.style.zIndex=String(40-Math.round(depth));poster.setAttribute('aria-hidden',String(!visible))});if(counter)counter.textContent=String(active+1).padStart(2,'0')};const select=(next:number)=>{active=(next+posters.length)%posters.length;paint();posters[active]?.click()};const timer=window.setInterval(()=>{if(!paused)select(active+1)},4200);cleanups.add(()=>window.clearInterval(timer));carousel.addEventListener('pointerenter',()=>{paused=true},{signal});carousel.addEventListener('pointerleave',()=>{paused=false},{signal});posters.forEach((poster,index)=>poster.addEventListener('click',()=>{active=index;paint()},{signal}));paint();addEventListener('resize',paint,{passive:true,signal})}
 const music=root.querySelector<HTMLElement>('[data-music-player]');
 if(music)mountPlayer(music);
}
