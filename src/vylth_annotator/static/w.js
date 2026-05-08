(function(){"use strict";const ce=[/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+)?\b/g,/\bsk_(live|test)_[A-Za-z0-9]{16,}\b/g,/\bpk_(live|test)_[A-Za-z0-9]{16,}\b/g,/\b[A-Za-z0-9-_]{32,}\.[A-Za-z0-9-_]{32,}\b/g,/\bAKIA[0-9A-Z]{16}\b/g,/\bgh[ps]_[A-Za-z0-9]{36,}\b/g];function G(t){let m=t;for(const o of ce)m=m.replace(o,"[REDACTED]");return m}const de=new Set(["token","access_token","refresh_token","id_token","auth_token","api_key","apikey","key","password","sig","signature","jwt","session","session_id","sessionid"]);function J(t){try{const m=new URL(t,location.origin);let o=!1;return m.searchParams.forEach((n,w)=>{de.has(w.toLowerCase())&&(m.searchParams.set(w,"[REDACTED]"),o=!0)}),o?m.toString():t}catch{return t}}function re(t){if(typeof t=="string")return G(t);if(t instanceof Error)return G(`${t.name}: ${t.message}`);try{const m=JSON.stringify(t,(o,n)=>typeof n=="function"?`[Function ${n.name||"anon"}]`:n instanceof HTMLElement?`<${n.tagName.toLowerCase()}>`:n).slice(0,1e3);return G(m)}catch{return G(String(t))}}function X(t,m,o){t.push(m),t.length>o&&t.splice(0,t.length-o)}function ue(){const t={console:[],network:[],errors:[],perf:{longTasks:[]}},m=["log","info","warn","error","debug"];for(const c of m){const f=console[c];console[c]=function(...g){return X(t.console,{level:c,ts:Date.now(),args:g.map(re)},100),f.apply(this,g)}}if(typeof window.fetch=="function"){const c=window.fetch.bind(window);window.fetch=async function(f,g){const L=performance.now(),A=(g?.method??(f instanceof Request?f.method:"GET")).toUpperCase(),d=typeof f=="string"?f:f instanceof URL?f.href:f.url;try{const S=await c(f,g);return S.status>=400&&X(t.network,{url:J(d),method:A,status:S.status,ms:Math.round(performance.now()-L),ts:Date.now()},50),S}catch(S){throw X(t.network,{url:J(d),method:A,status:0,ms:Math.round(performance.now()-L),ts:Date.now()},50),S}}}const o=XMLHttpRequest.prototype,n=o.open,w=o.send;if(o.open=function(c,f,...g){return this.__vy={method:c.toUpperCase(),url:String(f),start:0},n.call(this,c,f,...g)},o.send=function(c){return this.__vy&&(this.__vy.start=performance.now()),this.addEventListener("loadend",()=>{this.__vy&&(this.status>=400||this.status===0)&&X(t.network,{url:J(this.__vy.url),method:this.__vy.method,status:this.status,ms:Math.round(performance.now()-this.__vy.start),ts:Date.now()},50)}),w.call(this,c)},window.addEventListener("error",c=>{X(t.errors,{msg:c.message??"unknown error",stack:c.error?.stack,ts:Date.now(),source:"window.onerror"},20)}),window.addEventListener("unhandledrejection",c=>{const f=c.reason;X(t.errors,{msg:f instanceof Error?`${f.name}: ${f.message}`:re(f),stack:f instanceof Error?f.stack:void 0,ts:Date.now(),source:"unhandledrejection"},20)}),"PerformanceObserver"in window){try{new PerformanceObserver(c=>{for(const f of c.getEntries())f.name==="first-contentful-paint"&&(t.perf.fcp=Math.round(f.startTime))}).observe({type:"paint",buffered:!0})}catch{}try{new PerformanceObserver(c=>{const f=c.getEntries(),g=f[f.length-1];g&&(t.perf.lcp=Math.round(g.startTime))}).observe({type:"largest-contentful-paint",buffered:!0})}catch{}try{new PerformanceObserver(c=>{for(const f of c.getEntries())X(t.perf.longTasks,{ms:Math.round(f.duration),ts:Math.round(f.startTime)},10)}).observe({type:"longtask",buffered:!0})}catch{}}return t}const fe='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><g fill="none" fill-rule="evenodd"><path d="m18.7104 4 1.293 1.293.793-.793-1.293-1.293zm-12.483 9.517 4.259 4.259 9.826-10.76-3.325-3.325zm-1.517 4.483 1.293 1.293 1.146-1.147c.094-.093.221-.146.354-.146h1.793l-3.293-3.293v1.793c0 .133-.053.26-.147.354zm-.707.707-1.292 1.292 2.585.001zm-1.293 2.293c-.406 0-.769-.242-.924-.617s-.07-.804.218-1.091l2.999-2.999v-2.791c-.001-.127.047-.254.143-.352l.022-.022 11.498-10.497c.197-.18.501-.174.69.015l.647.647 1.146-1.147c.196-.195.512-.195.707 0l2 2c.196.196.196.512 0 .708l-1.146 1.146.646.646c.19.19.197.494.016.691l-10.497 11.498-.014.014-.01.01c-.099.095-.239.116-.35.141h-2.791l-1.854 1.854c-.093.093-.22.146-.353.146z" fill="currentColor"/></g></svg>';function pe(){const t=document.currentScript??document.querySelector('script[data-project][src*="w.js"]');if(!t)throw new Error("[annotator] script tag not found");return{project:t.dataset.project??"default",token:t.dataset.token??"",webhooks:(t.dataset.webhook??"").split("|").filter(Boolean),target:t.dataset.target,redact:t.dataset.redact,capture:t.dataset.capture??"viewport",alsoLog:t.dataset.alsoLog==="console"}}const ie="vylth.annot.bubble.pos";function he(){try{const t=localStorage.getItem(ie);if(!t)return null;const m=JSON.parse(t);return typeof m?.x=="number"&&typeof m?.y=="number"?m:null}catch{return null}}function me(t){try{localStorage.setItem(ie,JSON.stringify(t))}catch{}}function Q(t,m=44,o=8){const n=Math.max(o,window.innerWidth-m-o),w=Math.max(o,window.innerHeight-m-o);return{x:Math.min(Math.max(o,t.x),n),y:Math.min(Math.max(o,t.y),w)}}function se(t,m){const o=document.createElement("div");o.id="__vylth_annotator__";const n=he(),w=n?Q(n):{x:window.innerWidth-44-24,y:window.innerHeight-44-24};o.style.cssText=`all:initial;position:fixed;left:${w.x}px;top:${w.y}px;z-index:2147483647;`,document.documentElement.appendChild(o);const c=o.attachShadow({mode:"closed"});c.innerHTML=`
    <style>
      :host { all: initial; }
      button {
        all: unset; box-sizing: border-box; cursor: grab;
        touch-action: none;
        width: 44px; height: 44px; border-radius: 50%;
        background: linear-gradient(180deg, #1a1b1f 0%, #0a0b0d 100%);
        color: #f0f0f2;
        display: grid; place-items: center;
        box-shadow:
          0 6px 16px rgba(0, 0, 0, 0.55),
          0 0 0 1px rgba(255, 255, 255, 0.06) inset,
          0 1px 0 0 rgba(255, 255, 255, 0.08) inset;
        transition: transform 120ms ease, box-shadow 180ms ease, color 180ms ease;
      }
      button:hover {
        transform: translateY(-1px);
        box-shadow:
          0 10px 22px rgba(0, 0, 0, 0.6),
          0 0 0 1px rgba(255, 255, 255, 0.18) inset,
          0 0 0 2px rgba(255, 255, 255, 0.18),
          0 1px 0 0 rgba(255, 255, 255, 0.12) inset;
        color: #ffffff;
      }
      button:active {
        transform: translateY(0);
        box-shadow:
          0 4px 10px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.12) inset;
      }
    </style>
    <button type="button" aria-label="Send feedback">${fe}</button>
  `;const f=c.querySelector("button");let g=!1;const L=4,A=220;let d=null;f.addEventListener("pointerdown",S=>{if(g)return;f.setPointerCapture(S.pointerId);const C=o.getBoundingClientRect();d={pid:S.pointerId,startX:S.clientX,startY:S.clientY,hostStartX:C.left,hostStartY:C.top,startedAt:Date.now(),moved:!1}}),f.addEventListener("pointermove",S=>{if(!d||d.pid!==S.pointerId)return;const C=S.clientX-d.startX,D=S.clientY-d.startY;if(!d.moved&&Math.hypot(C,D)<L)return;d.moved=!0;const O=Q({x:d.hostStartX+C,y:d.hostStartY+D});o.style.left=`${O.x}px`,o.style.top=`${O.y}px`,f.style.cursor="grabbing"}),f.addEventListener("pointercancel",()=>{d=null,f.style.cursor=""}),f.addEventListener("pointerup",async S=>{if(!d||d.pid!==S.pointerId)return;const C=d.moved,D=Date.now()-d.startedAt;if(d=null,f.style.cursor="",C||D>A){const O=o.getBoundingClientRect();me({x:O.left,y:O.top});return}if(!g){g=!0;try{const{openOverlay:O}=await Promise.resolve().then(()=>De);await O({config:t,buffers:m,host:o})}finally{g=!1}}}),window.addEventListener("resize",()=>{const S=o.getBoundingClientRect(),C=Q({x:S.left,y:S.top});o.style.left=`${C.x}px`,o.style.top=`${C.y}px`})}function ge(){if(window.__vylth_annotator_loaded__)return;window.__vylth_annotator_loaded__=!0;let t;try{t=pe()}catch(o){console.warn("[annotator]",o);return}const m=ue();document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>se(t,m),{once:!0}):se(t,m)}ge();var ye=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function we(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}var ae={exports:{}};/*! dom-to-image-more 23-10-2025 */(function(t,m){(o=>{let n=(()=>{let u=0;return{escape:function(e){return e.replace(/([.*+?^${}()|[\]/\\])/g,"\\$1")},isDataUrl:function(e){return e.search(/^(data:)/)!==-1},canvasToBlob:function(e){return e.toBlob?new Promise(function(s){e.toBlob(s)}):(s=>new Promise(function(p){var l=D(s.toDataURL().split(",")[1]),x=l.length,k=new Uint8Array(x);for(let N=0;N<x;N++)k[N]=l.charCodeAt(N);p(new Blob([k],{type:"image/png"}))}))(e)},resolveUrl:function(e,s){var p=document.implementation.createHTMLDocument(),l=p.createElement("base"),x=(p.head.appendChild(l),p.createElement("a"));return p.body.appendChild(x),l.href=s,x.href=e,x.href},getAndEncode:function(e){let s=d.impl.urlCache.find(function(p){return p.url===e});return s||(s={url:e,promise:null},d.impl.urlCache.push(s)),s.promise===null&&(d.impl.options.cacheBust&&(e+=(/\?/.test(e)?"&":"?")+new Date().getTime()),s.promise=new Promise(function(p){let l=new XMLHttpRequest;function x(v){console.error(v),p("")}function k(){var v=d.impl.options.imagePlaceholder;v?p(v):x("Status:"+l.status+" while fetching resource: "+e)}if(l.timeout=d.impl.options.httpTimeout,l.onerror=k,l.ontimeout=k,l.onloadend=function(){if(l.readyState===XMLHttpRequest.DONE){var v=l.status;if(v===0&&e.toLowerCase().startsWith("file://")||200<=v&&v<=300&&l.response!==null){v=l.response,v instanceof Blob||x("Expected response to be a Blob, but got: "+typeof v);let P=new FileReader;P.onloadend=function(){var E=P.result;p(E)};try{P.readAsDataURL(v)}catch(E){x("Failed to read the response as Data URL: "+E.toString())}}else k()}},0<d.impl.options.useCredentialsFilters.length&&(d.impl.options.useCredentials=0<d.impl.options.useCredentialsFilters.filter(v=>0<=e.search(v)).length),d.impl.options.useCredentials&&(l.withCredentials=!0),d.impl.options.corsImg&&e.indexOf("http")===0&&e.indexOf(window.location.origin)===-1){var N=(d.impl.options.corsImg.method||"GET").toUpperCase()==="POST"?"POST":"GET";l.open(N,(d.impl.options.corsImg.url||"").replace("#{cors}",e),!0);let v=!1,P=d.impl.options.corsImg.headers||{},E=(Object.keys(P).forEach(function(h){P[h].indexOf("application/json")!==-1&&(v=!0),l.setRequestHeader(h,P[h])}),(h=>{try{return JSON.parse(JSON.stringify(h))}catch(_){x("corsImg.data is missing or invalid:"+_.toString())}})(d.impl.options.corsImg.data||""));Object.keys(E).forEach(function(h){typeof E[h]=="string"&&(E[h]=E[h].replace("#{cors}",e))}),l.responseType="blob",l.send(v?JSON.stringify(E):E)}else l.open("GET",e,!0),l.responseType="blob",l.send()})),s.promise},uid:function(){return"u"+("0000"+(Math.random()*Math.pow(36,4)<<0).toString(36)).slice(-4)+u++},asArray:function(e){var s=[],p=e.length;for(let l=0;l<p;l++)s.push(e[l]);return s},escapeXhtml:function(e){return e.replace(/%/g,"%25").replace(/#/g,"%23").replace(/\n/g,"%0A")},makeImage:function(e){return e!=="data:,"?new Promise(function(s,p){let l=document.createElementNS("http://www.w3.org/2000/svg","svg"),x=new Image;d.impl.options.useCredentials&&(x.crossOrigin="use-credentials"),x.onload=function(){document.body.removeChild(l),window&&window.requestAnimationFrame?window.requestAnimationFrame(function(){s(x)}):s(x)},x.onerror=k=>{document.body.removeChild(l),p(k)},l.appendChild(x),x.src=e,document.body.appendChild(l)}):Promise.resolve()},width:function(e){var s=i(e,"width");if(!isNaN(s))return s;var s=i(e,"border-left-width"),p=i(e,"border-right-width");return e.scrollWidth+s+p},height:function(e){var s=i(e,"height");if(!isNaN(s))return s;var s=i(e,"border-top-width"),p=i(e,"border-bottom-width");return e.scrollHeight+s+p},getWindow:r,isElement:a,isElementHostForOpenShadowRoot:function(e){return a(e)&&e.shadowRoot!==null},isShadowRoot:b,isInShadowRoot:y,isHTMLElement:function(e){return e instanceof r(e).HTMLElement},isHTMLCanvasElement:function(e){return e instanceof r(e).HTMLCanvasElement},isHTMLInputElement:function(e){return e instanceof r(e).HTMLInputElement},isHTMLImageElement:function(e){return e instanceof r(e).HTMLImageElement},isHTMLLinkElement:function(e){return e instanceof r(e).HTMLLinkElement},isHTMLScriptElement:function(e){return e instanceof r(e).HTMLScriptElement},isHTMLStyleElement:function(e){return e instanceof r(e).HTMLStyleElement},isHTMLTextAreaElement:function(e){return e instanceof r(e).HTMLTextAreaElement},isShadowSlotElement:function(e){return y(e)&&e instanceof r(e).HTMLSlotElement},isSVGElement:function(e){return e instanceof r(e).SVGElement},isSVGRectElement:function(e){return e instanceof r(e).SVGRectElement},isDimensionMissing:function(e){return isNaN(e)||e<=0}};function r(e){return e=e?e.ownerDocument:void 0,(e?e.defaultView:void 0)||window||o}function b(e){return e instanceof r(e).ShadowRoot}function y(e){return e!=null&&e.getRootNode!==void 0&&b(e.getRootNode())}function a(e){return e instanceof r(e).Element}function i(e,s){if(e.nodeType===S){let p=C(e).getPropertyValue(s);if(p.slice(-2)==="px")return p=p.slice(0,-2),parseFloat(p)}return NaN}})(),w=(()=>{let u=/url\(\s*(["']?)((?:\\.|[^\\)])+)\1\s*\)/gm;return{inlineAll:function(i,e,s){return r(i)?Promise.resolve(i).then(b).then(function(p){let l=Promise.resolve(i);return p.forEach(function(x){l=l.then(function(k){return a(k,x,e,s)})}),l}):Promise.resolve(i)},shouldProcess:r,impl:{readUrls:b,inline:a,urlAsRegex:y}};function r(i){return i.search(u)!==-1}function b(i){for(var e,s=[];(e=u.exec(i))!==null;)s.push(e[2]);return s.filter(function(p){return!n.isDataUrl(p)})}function y(i){return new RegExp(`url\\((["']?)(${n.escape(i)})\\1\\)`,"gm")}function a(i,e,s,p){return Promise.resolve(e).then(function(l){return s?n.resolveUrl(l,s):l}).then(p||n.getAndEncode).then(function(l){var x=y(e);return i.replace(x,`url($1${l}$1)`)})}})(),c={resolveAll:function(){return f().then(function(u){return Promise.all(u.map(function(r){return r.resolve()}))}).then(function(u){return u.join(`
`)})},impl:{readAll:f}};function f(){return Promise.resolve(n.asArray(document.styleSheets)).then(function(r){let b=[];return r.forEach(function(y){var a=Object.getPrototypeOf(y);if(Object.prototype.hasOwnProperty.call(a,"cssRules"))try{n.asArray(y.cssRules||[]).forEach(b.push.bind(b))}catch(i){console.error("domtoimage: Error while reading CSS rules from: "+y.href,i.toString())}}),b}).then(function(r){return r.filter(function(b){return b.type===CSSRule.FONT_FACE_RULE}).filter(function(b){return w.shouldProcess(b.style.getPropertyValue("src"))})}).then(function(r){return r.map(u)});function u(r){return{resolve:function(){var b=(r.parentStyleSheet||{}).href;return w.inlineAll(r.cssText,b)},src:function(){return r.style.getPropertyValue("src")}}}}let g={inlineAll:function u(r){if(!n.isElement(r))return Promise.resolve(r);return b(r).then(function(){return n.isHTMLImageElement(r)?L(r).inline():Promise.all(n.asArray(r.childNodes).map(function(y){return u(y)}))});function b(y){let a=["background","background-image"],i=a.map(function(e){let s=y.style.getPropertyValue(e),p=y.style.getPropertyPriority(e);return s?w.inlineAll(s).then(function(l){y.style.setProperty(e,l,p)}):Promise.resolve()});return Promise.all(i).then(function(){return y})}},impl:{newImage:L}};function L(u){return{inline:function(r){return n.isDataUrl(u.src)?Promise.resolve():Promise.resolve(u.src).then(r||n.getAndEncode).then(function(b){return new Promise(function(y){u.onload=y,u.onerror=y,u.src=b})})}}}let A={copyDefaultStyles:!0,imagePlaceholder:void 0,cacheBust:!1,useCredentials:!1,useCredentialsFilters:[],httpTimeout:3e4,styleCaching:"strict",corsImg:void 0},d={toSvg:O,toPng:function(u,r){return F(u,r).then(function(b){return b.toDataURL()})},toJpeg:function(u,r){return F(u,r).then(function(b){return b.toDataURL("image/jpeg",(r?r.quality:void 0)||1)})},toBlob:function(u,r){return F(u,r).then(n.canvasToBlob)},toPixelData:function(u,r){return F(u,r).then(function(b){return b.getContext("2d").getImageData(0,0,n.width(u),n.height(u)).data})},toCanvas:F,impl:{fontFaces:c,images:g,util:n,inliner:w,urlCache:[],options:{},copyOptions:function(u){u.copyDefaultStyles===void 0?d.impl.options.copyDefaultStyles=A.copyDefaultStyles:d.impl.options.copyDefaultStyles=u.copyDefaultStyles,d.impl.options.imagePlaceholder=(u.imagePlaceholder===void 0?A:u).imagePlaceholder,d.impl.options.cacheBust=(u.cacheBust===void 0?A:u).cacheBust,d.impl.options.corsImg=(u.corsImg===void 0?A:u).corsImg,d.impl.options.useCredentials=(u.useCredentials===void 0?A:u).useCredentials,d.impl.options.useCredentialsFilters=(u.useCredentialsFilters===void 0?A:u).useCredentialsFilters,d.impl.options.httpTimeout=(u.httpTimeout===void 0?A:u).httpTimeout,d.impl.options.styleCaching=(u.styleCaching===void 0?A:u).styleCaching}}},S=(t.exports=d,(Node===void 0?void 0:Node.ELEMENT_NODE)||1),C=(o===void 0?void 0:o.getComputedStyle)||(window===void 0?void 0:window.getComputedStyle)||globalThis.getComputedStyle,D=(o===void 0?void 0:o.atob)||(window===void 0?void 0:window.atob)||globalThis.atob;function O(u,r){d.impl.util.getWindow(u);let b=(r=r||{},d.impl.copyOptions(r),[]);return Promise.resolve(u).then(function(y){if(y.nodeType===S)return y;var a=y,i=document.createElement("span");return a.replaceWith(i),i.append(y),b.push({child:a,wrapper:i}),i}).then(function(y){return function a(i,e,s,p){let l=e.filter;if(i===R||n.isHTMLScriptElement(i)||n.isHTMLStyleElement(i)||n.isHTMLLinkElement(i)||s!==null&&l&&!l(i))return Promise.resolve();return Promise.resolve(i).then(x).then(k).then(function(h){return P(h,v(i))}).then(N).then(function(h){return E(h,i)});function x(h){return n.isHTMLCanvasElement(h)?n.makeImage(h.toDataURL()):h.cloneNode(!1)}function k(h){return e.adjustClonedNode&&e.adjustClonedNode(i,h,!1),Promise.resolve(h)}function N(h){return e.adjustClonedNode&&e.adjustClonedNode(i,h,!0),Promise.resolve(h)}function v(h){return n.isElementHostForOpenShadowRoot(h)?h.shadowRoot:h}function P(h,_){let U=V(_),W=Promise.resolve();if(U.length!==0){let I=C(Y(_));n.asArray(U).forEach(function(H){W=W.then(function(){return a(H,e,I).then(function(z){z&&h.appendChild(z)})})})}return W.then(function(){return h});function Y(I){return n.isShadowRoot(I)?I.host:I}function V(I){if(n.isShadowSlotElement(I)){let H=I.assignedNodes();if(H&&0<H.length)return H}return I.childNodes}}function E(h,_){return!n.isElement(h)||n.isShadowSlotElement(_)?Promise.resolve(h):Promise.resolve().then(W).then(Y).then(V).then(I).then(U).then(function(){return h});function U(){n.isHTMLImageElement(h)&&(h.removeAttribute("loading"),_.srcset||_.sizes)&&(h.removeAttribute("srcset"),h.removeAttribute("sizes"),h.src=_.currentSrc||_.src)}function W(){function H(M,T){T.font=M.font,T.fontFamily=M.fontFamily,T.fontFeatureSettings=M.fontFeatureSettings,T.fontKerning=M.fontKerning,T.fontSize=M.fontSize,T.fontStretch=M.fontStretch,T.fontStyle=M.fontStyle,T.fontVariant=M.fontVariant,T.fontVariantCaps=M.fontVariantCaps,T.fontVariantEastAsian=M.fontVariantEastAsian,T.fontVariantLigatures=M.fontVariantLigatures,T.fontVariantNumeric=M.fontVariantNumeric,T.fontVariationSettings=M.fontVariationSettings,T.fontWeight=M.fontWeight}function z(M,T){let j=C(M);j.cssText?(T.style.cssText=j.cssText,H(j,T.style)):(ne(e,M,j,s,T),s===null&&(["inset-block","inset-block-start","inset-block-end"].forEach(q=>T.style.removeProperty(q)),["left","right","top","bottom"].forEach(q=>{T.style.getPropertyValue(q)&&T.style.setProperty(q,"0px")})))}z(_,h)}function Y(){let H=n.uid();function z(M){let T=C(_,M),j=T.getPropertyValue("content");if(j!==""&&j!=="none"){let Ie=function(){let He=`.${H}:`+M,Ne=(T.cssText?$e:ze)();return document.createTextNode(He+`{${Ne}}`);function $e(){return`${T.cssText} content: ${j};`}function ze(){return n.asArray(T).map(Be).join("; ")+";";function Be(oe){let Ve=T.getPropertyValue(oe),je=T.getPropertyPriority(oe)?" !important":"";return oe+": "+Ve+je}}},q=h.getAttribute("class")||"",le=(h.setAttribute("class",q+" "+H),document.createElement("style"));le.appendChild(Ie()),h.appendChild(le)}}[":before",":after"].forEach(function(M){z(M)})}function V(){n.isHTMLTextAreaElement(_)&&(h.innerHTML=_.value),n.isHTMLInputElement(_)&&h.setAttribute("value",_.value)}function I(){n.isSVGElement(h)&&(h.setAttribute("xmlns","http://www.w3.org/2000/svg"),n.isSVGRectElement(h))&&["width","height"].forEach(function(H){let z=h.getAttribute(H);z&&h.style.setProperty(H,z)})}}}(y,r,null)}).then(r.disableEmbedFonts?Promise.resolve(u):te).then(r.disableInlineImages?Promise.resolve(u):K).then(function(y){r.bgcolor&&(y.style.backgroundColor=r.bgcolor),r.width&&(y.style.width=r.width+"px"),r.height&&(y.style.height=r.height+"px"),r.style&&Object.keys(r.style).forEach(function(i){y.style[i]=r.style[i]});let a=null;return typeof r.onclone=="function"&&(a=r.onclone(y)),Promise.resolve(a).then(function(){return y})}).then(function(y){let a=r.width||n.width(u),i=r.height||n.height(u);return Promise.resolve(y).then(function(e){return e.setAttribute("xmlns","http://www.w3.org/1999/xhtml"),new XMLSerializer().serializeToString(e)}).then(n.escapeXhtml).then(function(e){var s=(n.isDimensionMissing(a)?' width="100%"':` width="${a}"`)+(n.isDimensionMissing(i)?' height="100%"':` height="${i}"`);return`<svg xmlns="http://www.w3.org/2000/svg"${(n.isDimensionMissing(a)?"":` width="${a}"`)+(n.isDimensionMissing(i)?"":` height="${i}"`)}><foreignObject${s}>${e}</foreignObject></svg>`}).then(function(e){return"data:image/svg+xml;charset=utf-8,"+e})}).then(function(y){for(;0<b.length;){var a=b.pop();a.wrapper.replaceWith(a.child)}return y}).then(function(y){return d.impl.urlCache=[],R&&(document.body.removeChild(R),R=null),B&&clearTimeout(B),B=setTimeout(()=>{B=null,$={}},2e4),y})}function F(u,r){return O(u,r=r||{}).then(n.makeImage).then(function(b){var y=typeof r.scale!="number"?1:r.scale,a=((e,s)=>{let p=r.width||n.width(e),l=r.height||n.height(e);return n.isDimensionMissing(p)&&(p=n.isDimensionMissing(l)?300:2*l),n.isDimensionMissing(l)&&(l=p/2),(e=document.createElement("canvas")).width=p*s,e.height=l*s,r.bgcolor&&((s=e.getContext("2d")).fillStyle=r.bgcolor,s.fillRect(0,0,e.width,e.height)),e})(u,y),i=a.getContext("2d");return i.msImageSmoothingEnabled=!1,i.imageSmoothingEnabled=!1,b&&(i.scale(y,y),i.drawImage(b,0,0)),a})}let R=null;function te(u){return c.resolveAll().then(function(r){var b;return r!==""&&(b=document.createElement("style"),u.appendChild(b),b.appendChild(document.createTextNode(r))),u})}function K(u){return g.inlineAll(u).then(function(){return u})}function ne(u,r,b,y,a){let i=d.impl.options.copyDefaultStyles?((s,p)=>{var l,x=(v=>(s.styleCaching!=="relaxed"?v:v.filter((P,E,h)=>E===0||E===h.length-1)).join(">"))(p=(v=>{var P=[];do if(v.nodeType===S){var E=v.tagName;if(P.push(E),Z.includes(E))break}while(v=v.parentNode);return P})(p));{if($[x])return $[x];p=((v,P)=>{let E=v.body;do{var h=P.pop(),h=v.createElement(h);E.appendChild(h),E=h}while(0<P.length);return E.textContent="​",E})((l=(()=>{if(R)return R.contentWindow;P=document.characterSet||"UTF-8",v=(v=document.doctype)?(`<!DOCTYPE ${Y(v.name)} ${Y(v.publicId)} `+Y(v.systemId)).trim()+">":"",(R=document.createElement("iframe")).id="domtoimage-sandbox-"+n.uid(),R.style.top="-9999px",R.style.visibility="hidden",R.style.position="fixed",document.body.appendChild(R);var v,P,E=R,h="domtoimage-sandbox";try{return E.contentWindow.document.write(v+`<html><head><meta charset='${P}'><title>${h}</title></head><body></body></html>`),E.contentWindow}catch{}var _=document.createElement("meta");_.setAttribute("charset",P);try{var U=document.implementation.createHTMLDocument(h),W=(U.head.appendChild(_),v+U.documentElement.outerHTML);return E.setAttribute("srcdoc",W),E.contentWindow}catch{}return E.contentDocument.head.appendChild(_),E.contentDocument.title=h,E.contentWindow;function Y(V){var I;return V?((I=document.createElement("div")).innerText=V,I.innerHTML):""}})()).document,p),l=((v,P)=>{let E={},h=v.getComputedStyle(P);return n.asArray(h).forEach(function(_){E[_]=_==="width"||_==="height"?"auto":h.getPropertyValue(_)}),E})(l,p);var k=p;do{var N=k.parentElement;N!==null&&N.removeChild(k),k=N}while(k&&k.tagName!=="BODY");return $[x]=l}})(u,r):{},e=a.style;n.asArray(b).forEach(function(s){var p,l,x,k;u.filterStyles&&!u.filterStyles(r,s)||(l=b.getPropertyValue(s),x=i[s],p=y?y.getPropertyValue(s):void 0,e.getPropertyValue(s))||(l!==x||y&&l!==p)&&(x=b.getPropertyPriority(s),p=e,l=l,x=x,k=0<=["background-clip"].indexOf(s=s),x?(p.setProperty(s,l,x),k&&p.setProperty("-webkit-"+s,l,x)):(p.setProperty(s,l),k&&p.setProperty("-webkit-"+s,l)))})}let B=null,$={},Z=["ADDRESS","ARTICLE","ASIDE","BLOCKQUOTE","DETAILS","DIALOG","DD","DIV","DL","DT","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","H1","H2","H3","H4","H5","H6","HEADER","HGROUP","HR","LI","MAIN","NAV","OL","P","PRE","SECTION","SVG","TABLE","UL","math","svg","BODY","HEAD","HTML"]})(ye)})(ae);var be=ae.exports;const ve=we(be);let ee=null;async function xe(t){Ee(t.redact);let m,o;if(t.capture==="target"&&t.target){const f=document.querySelector(t.target);if(!f)throw new Error(`target not found: ${t.target}`);m=f;const g=f.getBoundingClientRect();o={x:g.left,y:g.top,w:g.width,h:g.height}}else t.capture==="page"?(m=document.documentElement,o={x:0,y:0,w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}):(m=document.documentElement,o={x:window.scrollX,y:window.scrollY,w:window.innerWidth,h:window.innerHeight});const n=ve.toPng(m,{width:o.w,height:o.h,style:t.capture==="viewport"?{transform:`translate(-${o.x}px, -${o.y}px)`,transformOrigin:"0 0"}:void 0,cacheBust:!0,imagePlaceholder:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",filter:f=>!(f instanceof HTMLElement&&(f.id==="__vylth_annotator__"||f.id==="__vylth_annotator_overlay__"))}),w=new Promise((f,g)=>setTimeout(()=>g(new Error("capture timed out after 30s — likely a cross-origin image without CORS headers")),3e4));return{dataUrl:await Promise.race([n,w]),rect:o}}function Ee(t){if(!t)return;const m=document.querySelectorAll(t),o=[];m.forEach(n=>{const w=n.style.filter;n.style.filter="blur(8px)",o.push(()=>{n.style.filter=w})}),ee=()=>{o.forEach(n=>n()),ee=null}}function Se(){ee?.()}function Te({config:t,buffers:m,comment:o,rects:n,pngBase64:w}){return{project:t.project,comment:o,image:w,rects:n,url:{href:location.href,pathname:location.pathname,search:location.search,hash:location.hash},viewport:{w:window.innerWidth,h:window.innerHeight,dpr:window.devicePixelRatio},document:{scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,scrollX:window.scrollX,scrollY:window.scrollY},targets:n.map(c=>Ae(c)).filter(Boolean),env:{ua:navigator.userAgent,platform:navigator.platform,lang:navigator.language,tz:Intl.DateTimeFormat().resolvedOptions().timeZone,online:navigator.onLine,theme:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"},console:m.console.slice(),network:m.network.slice(),errors:m.errors.slice(),perf:{fcp:m.perf.fcp,lcp:m.perf.lcp,longTasks:m.perf.longTasks.slice()},metadata:window.__vylth_annotator_react_metadata__}}function Ae(t){const m=document.getElementById("__vylth_annotator_overlay__"),o=document.getElementById("__vylth_annotator__"),n=m?.style.pointerEvents,w=o?.style.pointerEvents;m&&(m.style.pointerEvents="none"),o&&(o.style.pointerEvents="none");const c=t.x+t.w/2,f=t.y+t.h/2;let g=document.elementFromPoint(c,f);if(m&&(m.style.pointerEvents=n??""),o&&(o.style.pointerEvents=w??""),!g)return null;for(;g&&(g.id==="__vylth_annotator__"||g.id==="__vylth_annotator_overlay__");)g=g.parentElement;if(!g||g===document.documentElement||g===document.body)return null;const L=g.getBoundingClientRect(),A=getComputedStyle(g),d={};for(const S of["display","position","fontSize","color","backgroundColor","width","height","margin","padding","border"])d[S]=A.getPropertyValue(S.replace(/[A-Z]/g,C=>"-"+C.toLowerCase()));return{selector:_e(g),rect:{x:Math.round(L.left),y:Math.round(L.top),w:Math.round(L.width),h:Math.round(L.height)},text:(g.innerText??"").slice(0,200),computed:d}}function _e(t){const m=[];let o=t,n=0;for(;o&&o.nodeType===1&&n<6;){let w=o.tagName.toLowerCase();if(o.id){m.unshift(`${w}#${o.id}`);break}o.classList.length&&(w+="."+Array.from(o.classList).slice(0,2).join("."));const c=o.parentElement;if(c){const f=Array.from(c.children).filter(g=>g.tagName===o.tagName);f.length>1&&(w+=`:nth-of-type(${f.indexOf(o)+1})`)}m.unshift(w),o=c,n++}return m.join(" > ")}async function Ce(t,m){if(!t.webhooks.length&&!t.alsoLog)throw new Error('no webhook configured (set data-webhook or data-also-log="console")');const o=await Promise.allSettled(t.webhooks.map(w=>fetch(w,{method:"POST",headers:{"Content-Type":"application/json",...t.token?{"X-Annot-Token":t.token}:{}},body:JSON.stringify(m),keepalive:!0}).then(c=>{if(!c.ok)throw new Error(`${w} → ${c.status}`);return c})));if(!o.some(w=>w.status==="fulfilled")&&t.webhooks.length>0&&!t.alsoLog){const w=o.filter(c=>c.status==="rejected").map(c=>c.reason);throw new Error(`all webhooks failed: ${w.join(", ")}`)}}async function Le({config:t,buffers:m,host:o}){const n=o.style.display;o.style.display="none",await new Promise(w=>{ke({config:t,buffers:m,onClose:()=>{o.style.display=n,Se(),w()}})})}function ke(t){const{config:m,buffers:o,onClose:n}=t,w=document.createElement("div");w.id="__vylth_annotator_overlay__",w.style.cssText="all:initial;position:fixed;inset:0;z-index:2147483646;",document.documentElement.appendChild(w);const c=w.attachShadow({mode:"closed"}),f=[];let g=null,L="",A=!1;c.innerHTML=Re+Oe();const d=c.querySelector("#draw"),S=c.querySelector(".panel"),C=c.querySelector("#rects"),D=c.querySelector("#comment"),O=c.querySelector("#send"),F=c.querySelector("#close"),R=c.querySelector("#toast"),te=c.querySelector("#url"),K=c.querySelector(".progress"),ne=c.querySelector("#progress-msg");te.textContent=location.pathname||"/";const B=()=>{d.width=window.innerWidth,d.height=window.innerHeight,$()};B(),window.addEventListener("resize",B);function $(){const a=d.getContext("2d");a.clearRect(0,0,d.width,d.height),a.lineWidth=2,a.strokeStyle="#ffffff",a.font="600 12px ui-sans-serif, system-ui, sans-serif",a.textBaseline="top",f.forEach(i=>{a.fillStyle="rgba(255, 255, 255, 0.10)",a.fillRect(i.x,i.y,i.w,i.h),a.strokeRect(i.x,i.y,i.w,i.h);const e=String(i.n),s=6,p=3,l=a.measureText(e).width;a.fillStyle="#ffffff",a.fillRect(i.x,i.y,l+s*2,18),a.fillStyle="#fff",a.fillText(e,i.x+s,i.y+p)})}function Z(){C.innerHTML=f.map(a=>`
      <li><span>#${a.n}</span><code>${Math.round(a.w)}×${Math.round(a.h)}</code><button data-rm="${a.n}" aria-label="Remove">×</button></li>
    `).join(""),C.querySelectorAll("button[data-rm]").forEach(a=>{a.addEventListener("click",()=>{const i=Number(a.dataset.rm),e=f.findIndex(s=>s.n===i);e>=0&&(f.splice(e,1),f.forEach((s,p)=>s.n=p+1),Z(),$())})})}d.addEventListener("pointerdown",a=>{A||(d.setPointerCapture(a.pointerId),g={x:a.clientX,y:a.clientY})}),d.addEventListener("pointermove",a=>{if(!g)return;$();const i=d.getContext("2d"),e=Math.min(g.x,a.clientX),s=Math.min(g.y,a.clientY),p=Math.abs(a.clientX-g.x),l=Math.abs(a.clientY-g.y);i.fillStyle="rgba(255, 255, 255, 0.10)",i.strokeStyle="#ffffff",i.lineWidth=2,i.fillRect(e,s,p,l),i.strokeRect(e,s,p,l)}),d.addEventListener("pointerup",a=>{if(!g)return;const i=Math.min(g.x,a.clientX),e=Math.min(g.y,a.clientY),s=Math.abs(a.clientX-g.x),p=Math.abs(a.clientY-g.y);if(g=null,s<6||p<6){$();return}f.push({x:i,y:e,w:s,h:p,n:f.length+1}),Z(),$()}),D.addEventListener("input",()=>{L=D.value});const u=()=>{A||(window.removeEventListener("resize",B),window.removeEventListener("keydown",r),w.remove(),n())},r=a=>{a.key==="Escape"&&u()};window.addEventListener("keydown",r),F.addEventListener("click",u);function b(a){ne.textContent=a,K.classList.add("show"),S.classList.add("busy")}function y(){K.classList.remove("show"),S.classList.remove("busy")}O.addEventListener("click",async()=>{if(!A){if(!L.trim()){D.focus(),D.style.outline="2px solid #ff4d4d",setTimeout(()=>D.style.outline="",800);return}A=!0,O.disabled=!0,d.style.cursor="wait";try{b("Capturing screenshot…"),await new Promise(requestAnimationFrame),await new Promise(requestAnimationFrame);const a=await xe(m);b("Sending…");const i=await Pe(a.dataUrl,f,a.rect),e=Te({config:m,buffers:o,comment:L,rects:f,pngBase64:i});m.alsoLog&&console.log("[annotator] envelope",e),await Ce(m,e),y(),R.textContent="Sent · Claude will pick it up next session",R.classList.add("show"),setTimeout(()=>{A=!1,u()},1200)}catch(a){console.error("[annotator] send failed",a),y(),A=!1,O.disabled=!1,d.style.cursor="crosshair",R.textContent=`Failed: ${a?.message||"unknown error"}`,R.classList.add("show","err"),setTimeout(()=>R.classList.remove("show","err"),3500)}}})}async function Pe(t,m,o){const n=await Me(t),w=document.createElement("canvas");w.width=n.naturalWidth,w.height=n.naturalHeight;const c=w.getContext("2d");c.drawImage(n,0,0);const f=w.width/o.w,g=w.height/o.h;c.lineWidth=2,c.strokeStyle="#ffffff",c.font="600 14px ui-sans-serif, system-ui, sans-serif",c.textBaseline="top";for(const L of m){const A=(L.x-o.x)*f,d=(L.y-o.y)*g,S=L.w*f,C=L.h*g;c.fillStyle="rgba(255, 255, 255, 0.10)",c.fillRect(A,d,S,C),c.strokeRect(A,d,S,C);const D=String(L.n),O=c.measureText(D).width+12;c.fillStyle="#ffffff",c.fillRect(A,d,O,22),c.fillStyle="#fff",c.fillText(D,A+6,d+4)}return w.toDataURL("image/png")}function Me(t){return new Promise((m,o)=>{const n=new Image;n.onload=()=>m(n),n.onerror=o,n.src=t})}const Re=`<style>
  :host, * { box-sizing: border-box; }

  /* No backdrop dim — page stays visible. A tiny vignette signals annotation mode. */
  .root {
    position: fixed; inset: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #ededed;
    pointer-events: none;  /* children re-enable individually */
  }

  /* Crosshair canvas catches all pointer events on the visible page */
  canvas#draw {
    position: absolute; inset: 0;
    width: 100vw; height: 100vh;
    cursor: crosshair; touch-action: none;
    pointer-events: auto;
    /* Subtle inner border to indicate annotation mode is active */
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.22);
  }

  /* Top hint banner */
  .banner {
    position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
    background: rgba(20, 20, 24, 0.92);
    backdrop-filter: blur(8px);
    color: #ededed; font-size: 12px; font-weight: 500;
    padding: 6px 14px; border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    pointer-events: none;
    user-select: none;
  }
  .banner b { color: #ffffff; font-weight: 600; }

  /* Floating panel bottom-right — neumorphic dark surface */
  .panel {
    position: absolute;
    bottom: 16px; right: 16px;
    width: 340px; max-height: calc(100vh - 32px);
    display: flex; flex-direction: column; gap: 10px;
    background: linear-gradient(180deg, #161718 0%, #0a0b0c 100%);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 14px;
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.55),
      0 0 0 1px rgba(255, 255, 255, 0.03) inset,
      0 1px 0 0 rgba(255, 255, 255, 0.06) inset;
    pointer-events: auto;
    overflow: auto;
    transition: opacity 200ms;
  }
  .panel.busy { opacity: 0.6; }

  .panel header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .kicker {
    text-transform: uppercase; letter-spacing: 0.10em; font-size: 10px;
    color: rgba(255, 255, 255, 0.85); font-weight: 600;
  }
  #close {
    all: unset; cursor: pointer; padding: 3px 7px;
    color: #888; font-size: 11px; border-radius: 4px;
  }
  #close:hover { color: #fff; background: #1a1c21; }
  #url { font-size: 10px; color: #6a6e76; word-break: break-all; }
  .hint { font-size: 11px; color: #6a6e76; }
  ul#rects {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 4px;
    max-height: 120px; overflow: auto;
  }
  ul#rects:empty { display: none; }
  ul#rects li {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 8px; background: rgba(22,24,29,0.7); border-radius: 6px;
    font-size: 12px;
  }
  ul#rects span { color: #ffffff; font-weight: 600; }
  ul#rects code { color: #888; font-size: 10px; margin-left: auto; }
  ul#rects button {
    all: unset; cursor: pointer;
    width: 18px; height: 18px; line-height: 18px; text-align: center;
    border-radius: 4px; color: #888;
  }
  ul#rects button:hover { background: #2a2d34; color: #fff; }
  textarea#comment {
    width: 100%; min-height: 70px; resize: vertical;
    background: rgba(22,24,29,0.7); border: 1px solid #232730; color: #ededed;
    border-radius: 6px; padding: 8px 10px;
    font-family: inherit; font-size: 13px; line-height: 1.45;
  }
  textarea#comment:focus { outline: 1px solid rgba(255, 255, 255, 0.45); border-color: transparent; }
  textarea#comment:disabled { opacity: 0.5; }

  /* Send: white pill, dark text — premium primary */
  button#send {
    all: unset; cursor: pointer;
    background: linear-gradient(180deg, #ffffff 0%, #e8e8ea 100%);
    color: #0a0a0c;
    padding: 10px 14px; border-radius: 8px; text-align: center;
    font-weight: 600; font-size: 13px; letter-spacing: 0.01em;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(255, 255, 255, 0.20) inset;
    transition: transform 80ms ease, box-shadow 180ms ease, background 180ms ease;
  }
  button#send:hover {
    background: linear-gradient(180deg, #ffffff 0%, #f4f4f6 100%);
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.30) inset;
  }
  button#send:active { transform: translateY(1px); }
  button#send:disabled {
    opacity: 0.45; cursor: default; transform: none;
    background: linear-gradient(180deg, #2a2b2d 0%, #1a1b1d 100%); color: #888;
  }

  /* Progress overlay inside the panel */
  .progress {
    position: absolute; inset: 0;
    display: none; align-items: center; justify-content: center;
    background: rgba(14, 15, 18, 0.92);
    border-radius: 12px;
    flex-direction: column; gap: 12px;
    font-size: 13px;
    pointer-events: auto;
  }
  .progress.show { display: flex; }
  .spinner {
    width: 22px; height: 22px;
    border: 2px solid rgba(255, 255, 255, 0.18);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: vy-spin 0.7s linear infinite;
  }
  @keyframes vy-spin { to { transform: rotate(360deg); } }

  #toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #1a1c21; color: #ededed; padding: 10px 14px;
    border-radius: 8px; font-size: 13px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    opacity: 0; pointer-events: none; transition: opacity 200ms;
    z-index: 10;
  }
  #toast.show { opacity: 1; }
  #toast.err { background: #2a1316; color: #ffb4b4; }
</style>`,Oe=()=>`
<div class="root">
  <canvas id="draw"></canvas>

  <div class="banner">
    Drag to mark · type one sentence · <b>Send</b> · Esc to close
  </div>

  <div class="panel">
    <header>
      <span class="kicker">Annotate</span>
      <button id="close" type="button">Close · Esc</button>
    </header>
    <div id="url"></div>
    <ul id="rects"></ul>
    <textarea id="comment" placeholder="What's wrong? One sentence is enough."></textarea>
    <button id="send" type="button">Send</button>

    <div class="progress">
      <div class="spinner"></div>
      <div id="progress-msg">Working…</div>
    </div>
  </div>

  <div id="toast"></div>
</div>
`,De=Object.freeze(Object.defineProperty({__proto__:null,openOverlay:Le},Symbol.toStringTag,{value:"Module"}))})();
