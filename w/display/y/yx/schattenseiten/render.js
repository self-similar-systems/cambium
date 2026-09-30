(() => {
'use strict';
const id='organism:schattenseiten';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());

/* ============ genealogy as address ============
 * The first four rows are one tetrahedron (four perspectives): w, with the forest at its self-child ww and the
 * three clusterings of the seven at wx wz wy. The three clusterings of those 28 are x z y. Each row is one
 * container. Its seven shadows do not float: each rests in its own cell of the row (two ranks smaller than the
 * row), so that seen along the shadow axis the whole is one flat picture and only turning it shows the tetrahedra. */
const ROWS=['ww','wx','wz','wy','x','z','y'];
const ROW_NOUN=['Wald','Cluster 1','Cluster 2','Cluster 3','Cluster 4','Cluster 5','Cluster 6'];
let P=null,selected=null,panel=null,byId=new Map();

function tree(){
  const n=(noun,children)=>children?{noun,de:noun,en:noun,children}:{noun,de:noun,en:noun,children:{}};
  const leaf=r=>n(ROW_NOUN[r]);
  return n('Schattenseiten',{
    w:n('Rang 1–2',{w:leaf(0),x:leaf(1),z:leaf(2),y:leaf(3)}),
    x:leaf(4),z:leaf(5),y:leaf(6)
  });
}
const freeze=node=>{for(const g of Object.keys(node.children||{}))freeze(node.children[g]);Object.freeze(node.children);return Object.freeze(node)};

/* Display's own cell geometry: the four corners of a cell, and the cell toward one corner */
const V0=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>{const m=Math.hypot(...v);return v.map(x=>x/m)});
const GI={w:0,x:1,z:2,y:3},GENES=['w','x','z','y'];
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const childOf=(t,g)=>t.map((q,j)=>j===GI[g]?q:mid(t[GI[g]],q));
const cellFor=p=>{let t=V0;for(const g of p)t=childOf(t,g);return t};
const I4=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

/* the sixteen cells two ranks inside a row, read as the flat picture reads: top to bottom, left to right.
 * Each carries its barycentre in the row's own cell (where Display places the point) and the size of its body. */
function rowCells(rowPath){
  const row=cellFor(rowPath),out=[];
  for(const a of GENES)for(const b of GENES){
    const bt=childOf(childOf(I4,a),b),t=childOf(childOf(row,a),b);
    const bary=[0,1,2,3].map(k=>bt.reduce((s,v)=>s+v[k],0)/4);
    const world=[0,1,2].map(k=>t.reduce((s,v)=>s+v[k],0)/4);
    const edge=Math.hypot(...[0,1,2].map(k=>t[0][k]-t[1][k]));
    out.push({bary,world,size:edge/(2*Math.SQRT2)*.94});
  }
  out.sort((p,q)=>Math.abs(q.world[1]-p.world[1])>1e-6?q.world[1]-p.world[1]:p.world[0]-q.world[0]);
  return out;
}

function fieldProjection(projection={}){
  P=projection;byId=new Map((projection.works||[]).map(w=>[w.id,w]));
  const points=[],seen=ROWS.map(()=>0),cells=ROWS.map(rowCells);
  BODY.list=[];
  (projection.works||[]).forEach(w=>{
    const r=w.row-1,path=ROWS[r],cell=cells[r][seen[r]++];if(!cell)return;
    const p=Object.freeze({id:'work:'+w.id,gene:path[0],path,kind:'work',label:w.id,bary:cell.bary,meta:`${w.id} · Rang ${w.rank} · ${w.source==='forest'?'Wald':w.source.replace('cluster','Cluster')}`,work:w});
    points.push(p);
    BODY.list.push({p,work:w,row:r,world:cell.world,size:cell.size});
  });
  return Object.freeze({root:freeze(tree()),points});
}

/* ============ field: the host's own environment; shadows rest on it ============ */
const shader={
  id:'shader:organism:schattenseiten',
  clear:[0.93,0.925,0.91,1],
  fallbackAlpha:.10,
  /* the rest view: along the shadow axis, parallel projection — a tetrahedron is then a square and everything is flat */
  view:Object.freeze({rest:Object.freeze([1,0,0,0]),projection:'orthographic'}),
  state:Object.freeze({blend:true,depthTest:true,depthWrite:false}),
  fragment:`#version 300 es
precision highp float;
in vec3 vN;in vec3 vW;in float vRegion;
uniform float uFocus;
out vec4 outColor;
void main(){
  vec3 n=normalize(vN);vec3 eye=normalize(vec3(0.,0.,3.2)-vW);
  float fres=pow(1.-abs(dot(n,eye)),1.6);
  float sel=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.5;
  outColor=vec4(vec3(.08),(.02+.10*fres)*sel);
}`
};

/* ============ bodies: one tetrahedron per shadow, the shadow on it ============
 * Seen along the body's own z (the rest view), the tetrahedron is a square and the shadow resolves;
 * turned, it breaks into faces. Nothing drifts. */
const BODY={list:[],gl:null,dim:0,last:0,L:null};
const SZ=512,LEVELS=10;
const VS=`#version 300 es
precision highp float;
uniform mat4 uProj,uView,uModel;uniform vec4 uB[49];
const vec3 V[4]=vec3[4](vec3(1,1,1),vec3(-1,-1,1),vec3(-1,1,-1),vec3(1,-1,-1));
const int S[6]=int[6](0,1,2,3,0,1);
out vec2 vUV;out vec3 vW;flat out int vI;
void main(){vec4 b=uB[gl_InstanceID];vec3 l=V[S[gl_VertexID]];
  vec4 w=uModel*vec4(b.xyz+l*b.w,1.);vW=w.xyz;vI=gl_InstanceID;vUV=vec2(l.x*.5+.5,.5-l.y*.5);
  gl_Position=uProj*uView*w;}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DArray;
uniform sampler2DArray uImg;uniform int uHot;uniform float uDim;uniform float uReady[49];
in vec2 vUV;in vec3 vW;flat in int vI;out vec4 o;
void main(){float r=uReady[vI];if(r<.004)discard;
  vec3 c=texture(uImg,vec3(vUV,float(vI))).rgb;
  vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));
  c*=mix(.62,1.,clamp(abs(n.z)*1.7320508,0.,1.));
  float a=r;
  if(vI==uHot)c=mix(c,vec3(.95,.55,.35),.14);else a*=1.-.88*uDim;
  o=vec4(c,a);}`;
function prog(gl,vs,fs){const p=gl.createProgram();for(const[t,s]of[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const h=gl.createShader(t);gl.shaderSource(h,s);gl.compileShader(h);
  if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(h));gl.attachShader(p,h)}gl.linkProgram(p);return p}

/* Load-in: rows in genealogy order, a few at a time, decoded off the main thread straight to the texture size, each
 * fading in when it lands. Mipmaps are rebuilt once per burst, so the small bodies do not shimmer. */
function upload(gl,L,i,src){
  gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,SZ,SZ,1,gl.RGBA,gl.UNSIGNED_BYTE,src);
  L.target[i]=1;clearTimeout(L.mipTimer);
  L.mipTimer=setTimeout(()=>{if(BODY.gl===gl){gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.generateMipmap(gl.TEXTURE_2D_ARRAY)}},140);
}
function fetchBitmap(url){
  return fetch(url,{mode:'cors'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.blob()})
    .then(b=>createImageBitmap(b,{resizeWidth:SZ,resizeHeight:SZ,resizeQuality:'medium'}));
}
function legacyImage(url){
  return new Promise((res,rej)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=SZ;c.getContext('2d').drawImage(im,0,0,SZ,SZ);res(c)};im.onerror=rej;im.src=url});
}
function startLoading(gl,L){
  const queue=BODY.list.map((b,i)=>i);let running=0;
  const pump=()=>{
    while(running<5&&queue.length&&BODY.gl===gl){
      const i=queue.shift(),url=(P?.fat||'')+BODY.list[i].work.still;running++;
      (typeof createImageBitmap==='function'?fetchBitmap(url):legacyImage(url))
        .then(src=>{if(BODY.gl===gl)upload(gl,L,i,src);if(src.close)src.close()})
        .catch(()=>{}).finally(()=>{running--;pump()});
    }
  };
  pump();
}
function layer(gl){
  if(BODY.gl===gl)return BODY.L;
  const L={p:prog(gl,VS,FS),vao:gl.createVertexArray(),tex:gl.createTexture(),ready:new Float32Array(49),target:new Float32Array(49),mipTimer:0};
  gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,LEVELS,gl.RGBA8,SZ,SZ,49);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  BODY.gl=gl;BODY.L=L;startLoading(gl,L);return L;
}
function afterDraw({gl,proj,view,model,ms}){
  if(!gl||!BODY.list.length)return;
  const L=layer(gl),B=new Float32Array(49*4);
  BODY.list.forEach((b,i)=>B.set([...b.world,b.size],i*4));
  const dt=Math.min(.1,Math.max(0,(ms-BODY.last)*.001));BODY.last=ms;
  for(let i=0;i<49;i++)L.ready[i]+=(L.target[i]-L.ready[i])*(1-Math.exp(-dt*7));
  /* the entered shadow is its own world: the others recede on a damped ease, and return on ascent */
  BODY.dim+=((selected?1:0)-BODY.dim)*(1-Math.exp(-dt*4));
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(L.p);gl.bindVertexArray(L.vao);
  gl.uniformMatrix4fv(gl.getUniformLocation(L.p,'uProj'),false,proj);gl.uniformMatrix4fv(gl.getUniformLocation(L.p,'uView'),false,view);
  gl.uniformMatrix4fv(gl.getUniformLocation(L.p,'uModel'),false,model);gl.uniform4fv(gl.getUniformLocation(L.p,'uB'),B);
  gl.uniform1fv(gl.getUniformLocation(L.p,'uReady'),L.ready);
  gl.uniform1i(gl.getUniformLocation(L.p,'uHot'),selected?BODY.list.findIndex(b=>b.work===selected):-1);
  gl.uniform1f(gl.getUniformLocation(L.p,'uDim'),BODY.dim);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.uniform1i(gl.getUniformLocation(L.p,'uImg'),0);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,6,BODY.list.length);
  gl.depthMask(false);gl.bindVertexArray(null);
}
/* Descent into one shadow: Display's continuous focus carries the camera until the body fills the view */
function focus(){if(!selected)return null;const b=BODY.list.find(x=>x.work===selected);return b?{center:b.world,scale:1/(b.size*1.9)}:null}
shader.afterDraw=afterDraw;shader.focus=focus;Object.freeze(shader);

/* ============ site-owned HUD: every kind of information has a fixed place at the edges ============ */
const el=(t,c,s)=>{const n=document.createElement(t);if(c)n.className=c;if(s!==undefined)n.textContent=s;return n};
const stat=(v,l)=>{const m=el('span','ss-hud-stat');m.append(el('b','',String(v)),el('small','',l));return m};
function block(label,right){const b=el('section','ss-hud-block'),h=el('div','ss-hud-label');h.append(el('span','',label));if(right)h.append(el('span','',right));b.append(h);return b}
function showWork(w){
  if(!panel)return;panel.replaceChildren();panel.hidden=!w;if(!w)return;
  const src=w.source==='forest'?'aus dem Wald':'aus '+w.source.replace('cluster','Cluster');
  const b=block(w.id,`Rang ${w.rank} · Reihe ${w.row}`);b.append(el('p','ss-meta',src));
  if(w.cluster_positive){const f=el('figure','ss-cluster');for(const k of ['cluster_positive','cluster_negative']){const i=el('img');i.src=P.fat+w[k];i.alt='';i.decoding='async';f.append(i)}
    f.append(el('figcaption','','das Cluster, aus dem dieser Schatten geschnitten wurde'));b.append(f)}
  if(w.animation){const i=el('img','ss-anim');i.src=P.fat+w.animation;i.alt='';i.decoding='async';b.append(i)}
  panel.append(b);
}
function render({host,content,projection}={}){
  if(!host||!content||!Array.isArray(projection?.works))return false;
  P=projection;host.hidden=false;content.className='interlocutor-content schattenseiten-content';content.replaceChildren();
  const works=projection.works,ranks=projection.ranks||[],clusters=new Set(works.map(w=>w.cluster_positive).filter(Boolean)).size;
  // left — who this is and how it grew
  const top=el('div','ss-hud-top');top.append(el('h1','','Schattenseiten'));
  for(const [v,l] of [[works.length,'shadows'],[ranks.length,'ranks'],[clusters,'clusters'],[works.filter(w=>w.animation).length,'moving']])top.append(stat(v,l));
  const rail=el('div','ss-hud-rail');rail.append(top);
  if(projection.words?.[0])rail.append(el('p','ss-word',projection.words[0]));
  if(projection.operation)rail.append(el('p','ss-op',projection.operation));
  if(ranks.length){const rb=block('rank');for(const r of ranks)rb.append(el('p','ss-rank',`${r.rank} · ${r.ids} · ${r.input}`));rail.append(rb)}
  // right — the one shadow you are in
  const side=el('div','ss-hud-side');panel=el('div','ss-panel');side.append(panel);
  // bottom — his words
  const bottom=el('div','ss-hud-bottom');
  if(projection.words?.[2])bottom.append(el('p','ss-word ss-way',projection.words[2]));
  if(projection.words?.[1])bottom.append(el('p','ss-word ss-mirror',projection.words[1]));
  content.append(rail,side,bottom);showWork(selected);return true;
}
function activateFieldPoint({point}={}){selected=point?.work||null;showWork(selected)}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren();selected=null;panel=null}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
