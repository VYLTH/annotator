(function(){"use strict";function ne(n){if(typeof n=="string")return n;if(n instanceof Error)return`${n.name}: ${n.message}`;try{return JSON.stringify(n,(g,r)=>typeof r=="function"?`[Function ${r.name||"anon"}]`:r instanceof HTMLElement?`<${r.tagName.toLowerCase()}>`:r).slice(0,1e3)}catch{return String(n)}}function z(n,g,r){n.push(g),n.length>r&&n.splice(0,n.length-r)}function ae(){const n={console:[],network:[],errors:[],perf:{longTasks:[]}},g=["log","info","warn","error","debug"];for(const l of g){const h=console[l];console[l]=function(...v){return z(n.console,{level:l,ts:Date.now(),args:v.map(ne)},100),h.apply(this,v)}}if(typeof window.fetch=="function"){const l=window.fetch.bind(window);window.fetch=async function(h,v){const A=performance.now(),L=(v?.method??(h instanceof Request?h.method:"GET")).toUpperCase(),u=typeof h=="string"?h:h instanceof URL?h.href:h.url;try{const S=await l(h,v);return S.status>=400&&z(n.network,{url:u,method:L,status:S.status,ms:Math.round(performance.now()-A),ts:Date.now()},50),S}catch(S){throw z(n.network,{url:u,method:L,status:0,ms:Math.round(performance.now()-A),ts:Date.now()},50),S}}}const r=XMLHttpRequest.prototype,t=r.open,m=r.send;if(r.open=function(l,h,...v){return this.__vy={method:l.toUpperCase(),url:String(h),start:0},t.call(this,l,h,...v)},r.send=function(l){return this.__vy&&(this.__vy.start=performance.now()),this.addEventListener("loadend",()=>{this.__vy&&(this.status>=400||this.status===0)&&z(n.network,{url:this.__vy.url,method:this.__vy.method,status:this.status,ms:Math.round(performance.now()-this.__vy.start),ts:Date.now()},50)}),m.call(this,l)},window.addEventListener("error",l=>{z(n.errors,{msg:l.message??"unknown error",stack:l.error?.stack,ts:Date.now(),source:"window.onerror"},20)}),window.addEventListener("unhandledrejection",l=>{const h=l.reason;z(n.errors,{msg:h instanceof Error?`${h.name}: ${h.message}`:ne(h),stack:h instanceof Error?h.stack:void 0,ts:Date.now(),source:"unhandledrejection"},20)}),"PerformanceObserver"in window){try{new PerformanceObserver(l=>{for(const h of l.getEntries())h.name==="first-contentful-paint"&&(n.perf.fcp=Math.round(h.startTime))}).observe({type:"paint",buffered:!0})}catch{}try{new PerformanceObserver(l=>{const h=l.getEntries(),v=h[h.length-1];v&&(n.perf.lcp=Math.round(v.startTime))}).observe({type:"largest-contentful-paint",buffered:!0})}catch{}try{new PerformanceObserver(l=>{for(const h of l.getEntries())z(n.perf.longTasks,{ms:Math.round(h.duration),ts:Math.round(h.startTime)},10)}).observe({type:"longtask",buffered:!0})}catch{}}return n}const le='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><g fill="none" fill-rule="evenodd"><path d="m18.7104 4 1.293 1.293.793-.793-1.293-1.293zm-12.483 9.517 4.259 4.259 9.826-10.76-3.325-3.325zm-1.517 4.483 1.293 1.293 1.146-1.147c.094-.093.221-.146.354-.146h1.793l-3.293-3.293v1.793c0 .133-.053.26-.147.354zm-.707.707-1.292 1.292 2.585.001zm-1.293 2.293c-.406 0-.769-.242-.924-.617s-.07-.804.218-1.091l2.999-2.999v-2.791c-.001-.127.047-.254.143-.352l.022-.022 11.498-10.497c.197-.18.501-.174.69.015l.647.647 1.146-1.147c.196-.195.512-.195.707 0l2 2c.196.196.196.512 0 .708l-1.146 1.146.646.646c.19.19.197.494.016.691l-10.497 11.498-.014.014-.01.01c-.099.095-.239.116-.35.141h-2.791l-1.854 1.854c-.093.093-.22.146-.353.146z" fill="currentColor"/></g></svg>';function ce(){const n=document.currentScript??document.querySelector('script[data-project][src*="w.js"]');if(!n)throw new Error("[annotator] script tag not found");return{project:n.dataset.project??"default",token:n.dataset.token??"",webhooks:(n.dataset.webhook??"").split("|").filter(Boolean),target:n.dataset.target,redact:n.dataset.redact,capture:n.dataset.capture??"viewport",alsoLog:n.dataset.alsoLog==="console"}}const oe="vylth.annot.bubble.pos";function de(){try{const n=localStorage.getItem(oe);if(!n)return null;const g=JSON.parse(n);return typeof g?.x=="number"&&typeof g?.y=="number"?g:null}catch{return null}}function ue(n){try{localStorage.setItem(oe,JSON.stringify(n))}catch{}}function J(n,g=44,r=8){const t=Math.max(r,window.innerWidth-g-r),m=Math.max(r,window.innerHeight-g-r);return{x:Math.min(Math.max(r,n.x),t),y:Math.min(Math.max(r,n.y),m)}}function re(n,g){const r=document.createElement("div");r.id="__vylth_annotator__";const t=de(),m=t?J(t):{x:window.innerWidth-44-24,y:window.innerHeight-44-24};r.style.cssText=`all:initial;position:fixed;left:${m.x}px;top:${m.y}px;z-index:2147483647;`,document.documentElement.appendChild(r);const l=r.attachShadow({mode:"closed"});l.innerHTML=`
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
    <button type="button" aria-label="Send feedback">${le}</button>
  `;const h=l.querySelector("button");let v=!1;const A=4,L=220;let u=null;h.addEventListener("pointerdown",S=>{if(v)return;h.setPointerCapture(S.pointerId);const _=r.getBoundingClientRect();u={pid:S.pointerId,startX:S.clientX,startY:S.clientY,hostStartX:_.left,hostStartY:_.top,startedAt:Date.now(),moved:!1}}),h.addEventListener("pointermove",S=>{if(!u||u.pid!==S.pointerId)return;const _=S.clientX-u.startX,D=S.clientY-u.startY;if(!u.moved&&Math.hypot(_,D)<A)return;u.moved=!0;const R=J({x:u.hostStartX+_,y:u.hostStartY+D});r.style.left=`${R.x}px`,r.style.top=`${R.y}px`,h.style.cursor="grabbing"}),h.addEventListener("pointerup",async S=>{if(!u||u.pid!==S.pointerId)return;const _=u.moved,D=Date.now()-u.startedAt;if(u=null,h.style.cursor="",_||D>L){const R=r.getBoundingClientRect();ue({x:R.left,y:R.top});return}if(!v){v=!0;try{const{openOverlay:R}=await Promise.resolve().then(()=>_e);await R({config:n,buffers:g,host:r})}finally{v=!1}}}),window.addEventListener("resize",()=>{const S=r.getBoundingClientRect(),_=J({x:S.left,y:S.top});r.style.left=`${_.x}px`,r.style.top=`${_.y}px`})}function fe(){if(window.__vylth_annotator_loaded__)return;window.__vylth_annotator_loaded__=!0;let n;try{n=ce()}catch(r){console.warn("[annotator]",r);return}const g=ae();document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>re(n,g),{once:!0}):re(n,g)}fe();var pe=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function he(n){return n&&n.__esModule&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n}var ie={exports:{}};/*! dom-to-image-more 23-10-2025 */(function(n,g){(r=>{let t=(()=>{let d=0;return{escape:function(e){return e.replace(/([.*+?^${}()|[\]/\\])/g,"\\$1")},isDataUrl:function(e){return e.search(/^(data:)/)!==-1},canvasToBlob:function(e){return e.toBlob?new Promise(function(s){e.toBlob(s)}):(s=>new Promise(function(f){var c=D(s.toDataURL().split(",")[1]),x=c.length,P=new Uint8Array(x);for(let N=0;N<x;N++)P[N]=c.charCodeAt(N);f(new Blob([P],{type:"image/png"}))}))(e)},resolveUrl:function(e,s){var f=document.implementation.createHTMLDocument(),c=f.createElement("base"),x=(f.head.appendChild(c),f.createElement("a"));return f.body.appendChild(x),c.href=s,x.href=e,x.href},getAndEncode:function(e){let s=u.impl.urlCache.find(function(f){return f.url===e});return s||(s={url:e,promise:null},u.impl.urlCache.push(s)),s.promise===null&&(u.impl.options.cacheBust&&(e+=(/\?/.test(e)?"&":"?")+new Date().getTime()),s.promise=new Promise(function(f){let c=new XMLHttpRequest;function x(b){console.error(b),f("")}function P(){var b=u.impl.options.imagePlaceholder;b?f(b):x("Status:"+c.status+" while fetching resource: "+e)}if(c.timeout=u.impl.options.httpTimeout,c.onerror=P,c.ontimeout=P,c.onloadend=function(){if(c.readyState===XMLHttpRequest.DONE){var b=c.status;if(b===0&&e.toLowerCase().startsWith("file://")||200<=b&&b<=300&&c.response!==null){b=c.response,b instanceof Blob||x("Expected response to be a Blob, but got: "+typeof b);let k=new FileReader;k.onloadend=function(){var E=k.result;f(E)};try{k.readAsDataURL(b)}catch(E){x("Failed to read the response as Data URL: "+E.toString())}}else P()}},0<u.impl.options.useCredentialsFilters.length&&(u.impl.options.useCredentials=0<u.impl.options.useCredentialsFilters.filter(b=>0<=e.search(b)).length),u.impl.options.useCredentials&&(c.withCredentials=!0),u.impl.options.corsImg&&e.indexOf("http")===0&&e.indexOf(window.location.origin)===-1){var N=(u.impl.options.corsImg.method||"GET").toUpperCase()==="POST"?"POST":"GET";c.open(N,(u.impl.options.corsImg.url||"").replace("#{cors}",e),!0);let b=!1,k=u.impl.options.corsImg.headers||{},E=(Object.keys(k).forEach(function(p){k[p].indexOf("application/json")!==-1&&(b=!0),c.setRequestHeader(p,k[p])}),(p=>{try{return JSON.parse(JSON.stringify(p))}catch(C){x("corsImg.data is missing or invalid:"+C.toString())}})(u.impl.options.corsImg.data||""));Object.keys(E).forEach(function(p){typeof E[p]=="string"&&(E[p]=E[p].replace("#{cors}",e))}),c.responseType="blob",c.send(b?JSON.stringify(E):E)}else c.open("GET",e,!0),c.responseType="blob",c.send()})),s.promise},uid:function(){return"u"+("0000"+(Math.random()*Math.pow(36,4)<<0).toString(36)).slice(-4)+d++},asArray:function(e){var s=[],f=e.length;for(let c=0;c<f;c++)s.push(e[c]);return s},escapeXhtml:function(e){return e.replace(/%/g,"%25").replace(/#/g,"%23").replace(/\n/g,"%0A")},makeImage:function(e){return e!=="data:,"?new Promise(function(s,f){let c=document.createElementNS("http://www.w3.org/2000/svg","svg"),x=new Image;u.impl.options.useCredentials&&(x.crossOrigin="use-credentials"),x.onload=function(){document.body.removeChild(c),window&&window.requestAnimationFrame?window.requestAnimationFrame(function(){s(x)}):s(x)},x.onerror=P=>{document.body.removeChild(c),f(P)},c.appendChild(x),x.src=e,document.body.appendChild(c)}):Promise.resolve()},width:function(e){var s=i(e,"width");if(!isNaN(s))return s;var s=i(e,"border-left-width"),f=i(e,"border-right-width");return e.scrollWidth+s+f},height:function(e){var s=i(e,"height");if(!isNaN(s))return s;var s=i(e,"border-top-width"),f=i(e,"border-bottom-width");return e.scrollHeight+s+f},getWindow:o,isElement:a,isElementHostForOpenShadowRoot:function(e){return a(e)&&e.shadowRoot!==null},isShadowRoot:w,isInShadowRoot:y,isHTMLElement:function(e){return e instanceof o(e).HTMLElement},isHTMLCanvasElement:function(e){return e instanceof o(e).HTMLCanvasElement},isHTMLInputElement:function(e){return e instanceof o(e).HTMLInputElement},isHTMLImageElement:function(e){return e instanceof o(e).HTMLImageElement},isHTMLLinkElement:function(e){return e instanceof o(e).HTMLLinkElement},isHTMLScriptElement:function(e){return e instanceof o(e).HTMLScriptElement},isHTMLStyleElement:function(e){return e instanceof o(e).HTMLStyleElement},isHTMLTextAreaElement:function(e){return e instanceof o(e).HTMLTextAreaElement},isShadowSlotElement:function(e){return y(e)&&e instanceof o(e).HTMLSlotElement},isSVGElement:function(e){return e instanceof o(e).SVGElement},isSVGRectElement:function(e){return e instanceof o(e).SVGRectElement},isDimensionMissing:function(e){return isNaN(e)||e<=0}};function o(e){return e=e?e.ownerDocument:void 0,(e?e.defaultView:void 0)||window||r}function w(e){return e instanceof o(e).ShadowRoot}function y(e){return e!=null&&e.getRootNode!==void 0&&w(e.getRootNode())}function a(e){return e instanceof o(e).Element}function i(e,s){if(e.nodeType===S){let f=_(e).getPropertyValue(s);if(f.slice(-2)==="px")return f=f.slice(0,-2),parseFloat(f)}return NaN}})(),m=(()=>{let d=/url\(\s*(["']?)((?:\\.|[^\\)])+)\1\s*\)/gm;return{inlineAll:function(i,e,s){return o(i)?Promise.resolve(i).then(w).then(function(f){let c=Promise.resolve(i);return f.forEach(function(x){c=c.then(function(P){return a(P,x,e,s)})}),c}):Promise.resolve(i)},shouldProcess:o,impl:{readUrls:w,inline:a,urlAsRegex:y}};function o(i){return i.search(d)!==-1}function w(i){for(var e,s=[];(e=d.exec(i))!==null;)s.push(e[2]);return s.filter(function(f){return!t.isDataUrl(f)})}function y(i){return new RegExp(`url\\((["']?)(${t.escape(i)})\\1\\)`,"gm")}function a(i,e,s,f){return Promise.resolve(e).then(function(c){return s?t.resolveUrl(c,s):c}).then(f||t.getAndEncode).then(function(c){var x=y(e);return i.replace(x,`url($1${c}$1)`)})}})(),l={resolveAll:function(){return h().then(function(d){return Promise.all(d.map(function(o){return o.resolve()}))}).then(function(d){return d.join(`
`)})},impl:{readAll:h}};function h(){return Promise.resolve(t.asArray(document.styleSheets)).then(function(o){let w=[];return o.forEach(function(y){var a=Object.getPrototypeOf(y);if(Object.prototype.hasOwnProperty.call(a,"cssRules"))try{t.asArray(y.cssRules||[]).forEach(w.push.bind(w))}catch(i){console.error("domtoimage: Error while reading CSS rules from: "+y.href,i.toString())}}),w}).then(function(o){return o.filter(function(w){return w.type===CSSRule.FONT_FACE_RULE}).filter(function(w){return m.shouldProcess(w.style.getPropertyValue("src"))})}).then(function(o){return o.map(d)});function d(o){return{resolve:function(){var w=(o.parentStyleSheet||{}).href;return m.inlineAll(o.cssText,w)},src:function(){return o.style.getPropertyValue("src")}}}}let v={inlineAll:function d(o){if(!t.isElement(o))return Promise.resolve(o);return w(o).then(function(){return t.isHTMLImageElement(o)?A(o).inline():Promise.all(t.asArray(o.childNodes).map(function(y){return d(y)}))});function w(y){let a=["background","background-image"],i=a.map(function(e){let s=y.style.getPropertyValue(e),f=y.style.getPropertyPriority(e);return s?m.inlineAll(s).then(function(c){y.style.setProperty(e,c,f)}):Promise.resolve()});return Promise.all(i).then(function(){return y})}},impl:{newImage:A}};function A(d){return{inline:function(o){return t.isDataUrl(d.src)?Promise.resolve():Promise.resolve(d.src).then(o||t.getAndEncode).then(function(w){return new Promise(function(y){d.onload=y,d.onerror=y,d.src=w})})}}}let L={copyDefaultStyles:!0,imagePlaceholder:void 0,cacheBust:!1,useCredentials:!1,useCredentialsFilters:[],httpTimeout:3e4,styleCaching:"strict",corsImg:void 0},u={toSvg:R,toPng:function(d,o){return B(d,o).then(function(w){return w.toDataURL()})},toJpeg:function(d,o){return B(d,o).then(function(w){return w.toDataURL("image/jpeg",(o?o.quality:void 0)||1)})},toBlob:function(d,o){return B(d,o).then(t.canvasToBlob)},toPixelData:function(d,o){return B(d,o).then(function(w){return w.getContext("2d").getImageData(0,0,t.width(d),t.height(d)).data})},toCanvas:B,impl:{fontFaces:l,images:v,util:t,inliner:m,urlCache:[],options:{},copyOptions:function(d){d.copyDefaultStyles===void 0?u.impl.options.copyDefaultStyles=L.copyDefaultStyles:u.impl.options.copyDefaultStyles=d.copyDefaultStyles,u.impl.options.imagePlaceholder=(d.imagePlaceholder===void 0?L:d).imagePlaceholder,u.impl.options.cacheBust=(d.cacheBust===void 0?L:d).cacheBust,u.impl.options.corsImg=(d.corsImg===void 0?L:d).corsImg,u.impl.options.useCredentials=(d.useCredentials===void 0?L:d).useCredentials,u.impl.options.useCredentialsFilters=(d.useCredentialsFilters===void 0?L:d).useCredentialsFilters,u.impl.options.httpTimeout=(d.httpTimeout===void 0?L:d).httpTimeout,u.impl.options.styleCaching=(d.styleCaching===void 0?L:d).styleCaching}}},S=(n.exports=u,(Node===void 0?void 0:Node.ELEMENT_NODE)||1),_=(r===void 0?void 0:r.getComputedStyle)||(window===void 0?void 0:window.getComputedStyle)||globalThis.getComputedStyle,D=(r===void 0?void 0:r.atob)||(window===void 0?void 0:window.atob)||globalThis.atob;function R(d,o){u.impl.util.getWindow(d);let w=(o=o||{},u.impl.copyOptions(o),[]);return Promise.resolve(d).then(function(y){if(y.nodeType===S)return y;var a=y,i=document.createElement("span");return a.replaceWith(i),i.append(y),w.push({child:a,wrapper:i}),i}).then(function(y){return function a(i,e,s,f){let c=e.filter;if(i===O||t.isHTMLScriptElement(i)||t.isHTMLStyleElement(i)||t.isHTMLLinkElement(i)||s!==null&&c&&!c(i))return Promise.resolve();return Promise.resolve(i).then(x).then(P).then(function(p){return k(p,b(i))}).then(N).then(function(p){return E(p,i)});function x(p){return t.isHTMLCanvasElement(p)?t.makeImage(p.toDataURL()):p.cloneNode(!1)}function P(p){return e.adjustClonedNode&&e.adjustClonedNode(i,p,!1),Promise.resolve(p)}function N(p){return e.adjustClonedNode&&e.adjustClonedNode(i,p,!0),Promise.resolve(p)}function b(p){return t.isElementHostForOpenShadowRoot(p)?p.shadowRoot:p}function k(p,C){let W=F(C),U=Promise.resolve();if(W.length!==0){let H=_(q(C));t.asArray(W).forEach(function(I){U=U.then(function(){return a(I,e,H).then(function(X){X&&p.appendChild(X)})})})}return U.then(function(){return p});function q(H){return t.isShadowRoot(H)?H.host:H}function F(H){if(t.isShadowSlotElement(H)){let I=H.assignedNodes();if(I&&0<I.length)return I}return H.childNodes}}function E(p,C){return!t.isElement(p)||t.isShadowSlotElement(C)?Promise.resolve(p):Promise.resolve().then(U).then(q).then(F).then(H).then(W).then(function(){return p});function W(){t.isHTMLImageElement(p)&&(p.removeAttribute("loading"),C.srcset||C.sizes)&&(p.removeAttribute("srcset"),p.removeAttribute("sizes"),p.src=C.currentSrc||C.src)}function U(){function I(M,T){T.font=M.font,T.fontFamily=M.fontFamily,T.fontFeatureSettings=M.fontFeatureSettings,T.fontKerning=M.fontKerning,T.fontSize=M.fontSize,T.fontStretch=M.fontStretch,T.fontStyle=M.fontStyle,T.fontVariant=M.fontVariant,T.fontVariantCaps=M.fontVariantCaps,T.fontVariantEastAsian=M.fontVariantEastAsian,T.fontVariantLigatures=M.fontVariantLigatures,T.fontVariantNumeric=M.fontVariantNumeric,T.fontVariationSettings=M.fontVariationSettings,T.fontWeight=M.fontWeight}function X(M,T){let V=_(M);V.cssText?(T.style.cssText=V.cssText,I(V,T.style)):(ee(e,M,V,s,T),s===null&&(["inset-block","inset-block-start","inset-block-end"].forEach(Y=>T.style.removeProperty(Y)),["left","right","top","bottom"].forEach(Y=>{T.style.getPropertyValue(Y)&&T.style.setProperty(Y,"0px")})))}X(C,p)}function q(){let I=t.uid();function X(M){let T=_(C,M),V=T.getPropertyValue("content");if(V!==""&&V!=="none"){let Ae=function(){let Oe=`.${I}:`+M,Re=(T.cssText?De:He)();return document.createTextNode(Oe+`{${Re}}`);function De(){return`${T.cssText} content: ${V};`}function He(){return t.asArray(T).map(Ie).join("; ")+";";function Ie(te){let Ne=T.getPropertyValue(te),$e=T.getPropertyPriority(te)?" !important":"";return te+": "+Ne+$e}}},Y=p.getAttribute("class")||"",se=(p.setAttribute("class",Y+" "+I),document.createElement("style"));se.appendChild(Ae()),p.appendChild(se)}}[":before",":after"].forEach(function(M){X(M)})}function F(){t.isHTMLTextAreaElement(C)&&(p.innerHTML=C.value),t.isHTMLInputElement(C)&&p.setAttribute("value",C.value)}function H(){t.isSVGElement(p)&&(p.setAttribute("xmlns","http://www.w3.org/2000/svg"),t.isSVGRectElement(p))&&["width","height"].forEach(function(I){let X=p.getAttribute(I);X&&p.style.setProperty(I,X)})}}}(y,o,null)}).then(o.disableEmbedFonts?Promise.resolve(d):Q).then(o.disableInlineImages?Promise.resolve(d):G).then(function(y){o.bgcolor&&(y.style.backgroundColor=o.bgcolor),o.width&&(y.style.width=o.width+"px"),o.height&&(y.style.height=o.height+"px"),o.style&&Object.keys(o.style).forEach(function(i){y.style[i]=o.style[i]});let a=null;return typeof o.onclone=="function"&&(a=o.onclone(y)),Promise.resolve(a).then(function(){return y})}).then(function(y){let a=o.width||t.width(d),i=o.height||t.height(d);return Promise.resolve(y).then(function(e){return e.setAttribute("xmlns","http://www.w3.org/1999/xhtml"),new XMLSerializer().serializeToString(e)}).then(t.escapeXhtml).then(function(e){var s=(t.isDimensionMissing(a)?' width="100%"':` width="${a}"`)+(t.isDimensionMissing(i)?' height="100%"':` height="${i}"`);return`<svg xmlns="http://www.w3.org/2000/svg"${(t.isDimensionMissing(a)?"":` width="${a}"`)+(t.isDimensionMissing(i)?"":` height="${i}"`)}><foreignObject${s}>${e}</foreignObject></svg>`}).then(function(e){return"data:image/svg+xml;charset=utf-8,"+e})}).then(function(y){for(;0<w.length;){var a=w.pop();a.wrapper.replaceWith(a.child)}return y}).then(function(y){return u.impl.urlCache=[],O&&(document.body.removeChild(O),O=null),j&&clearTimeout(j),j=setTimeout(()=>{j=null,$={}},2e4),y})}function B(d,o){return R(d,o=o||{}).then(t.makeImage).then(function(w){var y=typeof o.scale!="number"?1:o.scale,a=((e,s)=>{let f=o.width||t.width(e),c=o.height||t.height(e);return t.isDimensionMissing(f)&&(f=t.isDimensionMissing(c)?300:2*c),t.isDimensionMissing(c)&&(c=f/2),(e=document.createElement("canvas")).width=f*s,e.height=c*s,o.bgcolor&&((s=e.getContext("2d")).fillStyle=o.bgcolor,s.fillRect(0,0,e.width,e.height)),e})(d,y),i=a.getContext("2d");return i.msImageSmoothingEnabled=!1,i.imageSmoothingEnabled=!1,w&&(i.scale(y,y),i.drawImage(w,0,0)),a})}let O=null;function Q(d){return l.resolveAll().then(function(o){var w;return o!==""&&(w=document.createElement("style"),d.appendChild(w),w.appendChild(document.createTextNode(o))),d})}function G(d){return v.inlineAll(d).then(function(){return d})}function ee(d,o,w,y,a){let i=u.impl.options.copyDefaultStyles?((s,f)=>{var c,x=(b=>(s.styleCaching!=="relaxed"?b:b.filter((k,E,p)=>E===0||E===p.length-1)).join(">"))(f=(b=>{var k=[];do if(b.nodeType===S){var E=b.tagName;if(k.push(E),K.includes(E))break}while(b=b.parentNode);return k})(f));{if($[x])return $[x];f=((b,k)=>{let E=b.body;do{var p=k.pop(),p=b.createElement(p);E.appendChild(p),E=p}while(0<k.length);return E.textContent="​",E})((c=(()=>{if(O)return O.contentWindow;k=document.characterSet||"UTF-8",b=(b=document.doctype)?(`<!DOCTYPE ${q(b.name)} ${q(b.publicId)} `+q(b.systemId)).trim()+">":"",(O=document.createElement("iframe")).id="domtoimage-sandbox-"+t.uid(),O.style.top="-9999px",O.style.visibility="hidden",O.style.position="fixed",document.body.appendChild(O);var b,k,E=O,p="domtoimage-sandbox";try{return E.contentWindow.document.write(b+`<html><head><meta charset='${k}'><title>${p}</title></head><body></body></html>`),E.contentWindow}catch{}var C=document.createElement("meta");C.setAttribute("charset",k);try{var W=document.implementation.createHTMLDocument(p),U=(W.head.appendChild(C),b+W.documentElement.outerHTML);return E.setAttribute("srcdoc",U),E.contentWindow}catch{}return E.contentDocument.head.appendChild(C),E.contentDocument.title=p,E.contentWindow;function q(F){var H;return F?((H=document.createElement("div")).innerText=F,H.innerHTML):""}})()).document,f),c=((b,k)=>{let E={},p=b.getComputedStyle(k);return t.asArray(p).forEach(function(C){E[C]=C==="width"||C==="height"?"auto":p.getPropertyValue(C)}),E})(c,f);var P=f;do{var N=P.parentElement;N!==null&&N.removeChild(P),P=N}while(P&&P.tagName!=="BODY");return $[x]=c}})(d,o):{},e=a.style;t.asArray(w).forEach(function(s){var f,c,x,P;d.filterStyles&&!d.filterStyles(o,s)||(c=w.getPropertyValue(s),x=i[s],f=y?y.getPropertyValue(s):void 0,e.getPropertyValue(s))||(c!==x||y&&c!==f)&&(x=w.getPropertyPriority(s),f=e,c=c,x=x,P=0<=["background-clip"].indexOf(s=s),x?(f.setProperty(s,c,x),P&&f.setProperty("-webkit-"+s,c,x)):(f.setProperty(s,c),P&&f.setProperty("-webkit-"+s,c)))})}let j=null,$={},K=["ADDRESS","ARTICLE","ASIDE","BLOCKQUOTE","DETAILS","DIALOG","DD","DIV","DL","DT","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","H1","H2","H3","H4","H5","H6","HEADER","HGROUP","HR","LI","MAIN","NAV","OL","P","PRE","SECTION","SVG","TABLE","UL","math","svg","BODY","HEAD","HTML"]})(pe)})(ie);var me=ie.exports;const ge=he(me);let Z=null;async function ye(n){we(n.redact);let g,r;if(n.capture==="target"&&n.target){const m=document.querySelector(n.target);if(!m)throw new Error(`target not found: ${n.target}`);g=m;const l=m.getBoundingClientRect();r={x:l.left,y:l.top,w:l.width,h:l.height}}else n.capture==="page"?(g=document.documentElement,r={x:0,y:0,w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}):(g=document.documentElement,r={x:window.scrollX,y:window.scrollY,w:window.innerWidth,h:window.innerHeight});return{dataUrl:await ge.toPng(g,{width:r.w,height:r.h,style:n.capture==="viewport"?{transform:`translate(-${r.x}px, -${r.y}px)`,transformOrigin:"0 0"}:void 0,cacheBust:!0,filter:m=>!(m instanceof HTMLElement&&(m.id==="__vylth_annotator__"||m.id==="__vylth_annotator_overlay__"))}),rect:r}}function we(n){if(!n)return;const g=document.querySelectorAll(n),r=[];g.forEach(t=>{const m=t.style.filter;t.style.filter="blur(8px)",r.push(()=>{t.style.filter=m})}),Z=()=>{r.forEach(t=>t()),Z=null}}function be(){Z?.()}function ve({config:n,buffers:g,comment:r,rects:t,pngBase64:m}){return{project:n.project,comment:r,image:m,rects:t,url:{href:location.href,pathname:location.pathname,search:location.search,hash:location.hash},viewport:{w:window.innerWidth,h:window.innerHeight,dpr:window.devicePixelRatio},document:{scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,scrollX:window.scrollX,scrollY:window.scrollY},targets:t.map(l=>xe(l)).filter(Boolean),env:{ua:navigator.userAgent,platform:navigator.platform,lang:navigator.language,tz:Intl.DateTimeFormat().resolvedOptions().timeZone,online:navigator.onLine,theme:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"},console:g.console.slice(),network:g.network.slice(),errors:g.errors.slice(),perf:{fcp:g.perf.fcp,lcp:g.perf.lcp,longTasks:g.perf.longTasks.slice()},metadata:window.__vylth_annotator_react_metadata__}}function xe(n){const g=n.x+n.w/2,r=n.y+n.h/2;let t=document.elementFromPoint(g,r);if(!t)return null;for(;t&&(t.id==="__vylth_annotator__"||t.id==="__vylth_annotator_overlay__");)t=t.parentElement;if(!t)return null;const m=t.getBoundingClientRect(),l=getComputedStyle(t),h={};for(const v of["display","position","fontSize","color","backgroundColor","width","height","margin","padding","border"])h[v]=l.getPropertyValue(v.replace(/[A-Z]/g,A=>"-"+A.toLowerCase()));return{selector:Ee(t),rect:{x:Math.round(m.left),y:Math.round(m.top),w:Math.round(m.width),h:Math.round(m.height)},text:(t.innerText??"").slice(0,200),computed:h}}function Ee(n){const g=[];let r=n,t=0;for(;r&&r.nodeType===1&&t<6;){let m=r.tagName.toLowerCase();if(r.id){g.unshift(`${m}#${r.id}`);break}r.classList.length&&(m+="."+Array.from(r.classList).slice(0,2).join("."));const l=r.parentElement;if(l){const h=Array.from(l.children).filter(v=>v.tagName===r.tagName);h.length>1&&(m+=`:nth-of-type(${h.indexOf(r)+1})`)}g.unshift(m),r=l,t++}return g.join(" > ")}async function Se(n,g){if(!n.webhooks.length&&!n.alsoLog)throw new Error('no webhook configured (set data-webhook or data-also-log="console")');const r=await Promise.allSettled(n.webhooks.map(m=>fetch(m,{method:"POST",headers:{"Content-Type":"application/json",...n.token?{"X-Annot-Token":n.token}:{}},body:JSON.stringify(g),keepalive:!0}).then(l=>{if(!l.ok)throw new Error(`${m} → ${l.status}`);return l})));if(!r.some(m=>m.status==="fulfilled")&&n.webhooks.length>0&&!n.alsoLog){const m=r.filter(l=>l.status==="rejected").map(l=>l.reason);throw new Error(`all webhooks failed: ${m.join(", ")}`)}}async function Te({config:n,buffers:g,host:r}){const t=r.style.display;r.style.display="none",await new Promise(m=>{Le({config:n,buffers:g,onClose:()=>{r.style.display=t,be(),m()}})})}function Le(n){const{config:g,buffers:r,onClose:t}=n,m=document.createElement("div");m.id="__vylth_annotator_overlay__",m.style.cssText="all:initial;position:fixed;inset:0;z-index:2147483646;",document.documentElement.appendChild(m);const l=m.attachShadow({mode:"closed"}),h=[];let v=null,A="",L=!1;l.innerHTML=ke+Me();const u=l.querySelector("#draw"),S=l.querySelector(".panel"),_=l.querySelector("#rects"),D=l.querySelector("#comment"),R=l.querySelector("#send"),B=l.querySelector("#close"),O=l.querySelector("#toast"),Q=l.querySelector("#url"),G=l.querySelector(".progress"),ee=l.querySelector("#progress-msg");Q.textContent=location.pathname||"/";const j=()=>{u.width=window.innerWidth,u.height=window.innerHeight,$()};j(),window.addEventListener("resize",j);function $(){const a=u.getContext("2d");a.clearRect(0,0,u.width,u.height),a.lineWidth=2,a.strokeStyle="#ffffff",a.font="600 12px ui-sans-serif, system-ui, sans-serif",a.textBaseline="top",h.forEach(i=>{a.fillStyle="rgba(255, 255, 255, 0.10)",a.fillRect(i.x,i.y,i.w,i.h),a.strokeRect(i.x,i.y,i.w,i.h);const e=String(i.n),s=6,f=3,c=a.measureText(e).width;a.fillStyle="#ffffff",a.fillRect(i.x,i.y,c+s*2,18),a.fillStyle="#fff",a.fillText(e,i.x+s,i.y+f)})}function K(){_.innerHTML=h.map(a=>`
      <li><span>#${a.n}</span><code>${Math.round(a.w)}×${Math.round(a.h)}</code><button data-rm="${a.n}" aria-label="Remove">×</button></li>
    `).join(""),_.querySelectorAll("button[data-rm]").forEach(a=>{a.addEventListener("click",()=>{const i=Number(a.dataset.rm),e=h.findIndex(s=>s.n===i);e>=0&&(h.splice(e,1),h.forEach((s,f)=>s.n=f+1),K(),$())})})}u.addEventListener("pointerdown",a=>{L||(u.setPointerCapture(a.pointerId),v={x:a.clientX,y:a.clientY})}),u.addEventListener("pointermove",a=>{if(!v)return;$();const i=u.getContext("2d"),e=Math.min(v.x,a.clientX),s=Math.min(v.y,a.clientY),f=Math.abs(a.clientX-v.x),c=Math.abs(a.clientY-v.y);i.fillStyle="rgba(255, 255, 255, 0.10)",i.strokeStyle="#ffffff",i.lineWidth=2,i.fillRect(e,s,f,c),i.strokeRect(e,s,f,c)}),u.addEventListener("pointerup",a=>{if(!v)return;const i=Math.min(v.x,a.clientX),e=Math.min(v.y,a.clientY),s=Math.abs(a.clientX-v.x),f=Math.abs(a.clientY-v.y);if(v=null,s<6||f<6){$();return}h.push({x:i,y:e,w:s,h:f,n:h.length+1}),K(),$()}),D.addEventListener("input",()=>{A=D.value});const d=()=>{L||(window.removeEventListener("resize",j),window.removeEventListener("keydown",o),m.remove(),t())},o=a=>{a.key==="Escape"&&d()};window.addEventListener("keydown",o),B.addEventListener("click",d);function w(a){ee.textContent=a,G.classList.add("show"),S.classList.add("busy")}function y(){G.classList.remove("show"),S.classList.remove("busy")}R.addEventListener("click",async()=>{if(!L){if(!A.trim()){D.focus(),D.style.outline="2px solid #ff4d4d",setTimeout(()=>D.style.outline="",800);return}L=!0,R.disabled=!0,u.style.cursor="wait";try{w("Capturing screenshot…"),await new Promise(requestAnimationFrame),await new Promise(requestAnimationFrame);const a=await ye(g);w("Sending…");const i=await Ce(a.dataUrl,h,a.rect),e=ve({config:g,buffers:r,comment:A,rects:h,pngBase64:i});g.alsoLog&&console.log("[annotator] envelope",e),await Se(g,e),y(),O.textContent="Sent · Claude will pick it up next session",O.classList.add("show"),setTimeout(()=>{L=!1,d()},1200)}catch(a){console.error("[annotator] send failed",a),y(),L=!1,R.disabled=!1,u.style.cursor="crosshair",O.textContent=`Failed: ${a?.message||"unknown error"}`,O.classList.add("show","err"),setTimeout(()=>O.classList.remove("show","err"),3500)}}})}async function Ce(n,g,r){const t=await Pe(n),m=document.createElement("canvas");m.width=t.naturalWidth,m.height=t.naturalHeight;const l=m.getContext("2d");l.drawImage(t,0,0);const h=m.width/r.w,v=m.height/r.h;l.lineWidth=2,l.strokeStyle="#ffffff",l.font="600 14px ui-sans-serif, system-ui, sans-serif",l.textBaseline="top";for(const A of g){const L=(A.x-r.x)*h,u=(A.y-r.y)*v,S=A.w*h,_=A.h*v;l.fillStyle="rgba(255, 255, 255, 0.10)",l.fillRect(L,u,S,_),l.strokeRect(L,u,S,_);const D=String(A.n),R=l.measureText(D).width+12;l.fillStyle="#ffffff",l.fillRect(L,u,R,22),l.fillStyle="#fff",l.fillText(D,L+6,u+4)}return m.toDataURL("image/png")}function Pe(n){return new Promise((g,r)=>{const t=new Image;t.onload=()=>g(t),t.onerror=r,t.src=n})}const ke=`<style>
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
</style>`,Me=()=>`
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
`,_e=Object.freeze(Object.defineProperty({__proto__:null,openOverlay:Te},Symbol.toStringTag,{value:"Module"}))})();
