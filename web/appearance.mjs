/* Shared visual identity. Public SVG mascots only; no credentials.
   The source shapes match the existing seven Lumo SVG mascots. */
const FRUITS=[
 {id:'orange',name:'Laranjinha',caption:'Solar e sereno',emoji:'🍊'},
 {id:'strawberry',name:'Moranguinho',caption:'Gentil e curioso',emoji:'🍓'},
 {id:'lemon',name:'Limonzinho',caption:'Leve e esperto',emoji:'🍋'},
 {id:'blueberry',name:'Mirtilinho',caption:'Calmo e criativo',emoji:'🫐'},
 {id:'peach',name:'Pesseguinho',caption:'Doce e acolhedor',emoji:'🍑'},
 {id:'avocado',name:'Abacatinho',caption:'Tranquilo e simpático',emoji:'🥑'},
 {id:'watermelon',name:'Melancinha',caption:'Alegre e refrescante',emoji:'🍉'}
];
const mascotSafe=id=>FRUITS.some(f=>f.id===id)?id:'orange';
const mascot=(className='hero-mascot',overrideFruit=null)=>{
  const fruit=mascotSafe(overrideFruit||'orange');
  const spec=FRUITS.find(f=>f.id===fruit);
  const key='mascot-'+Math.random().toString(36).slice(2,9);
  const gradient=(a,b,c)=>`<defs><radialGradient id="${key}" cx="32%" cy="19%" r="83%"><stop offset="0%" stop-color="${a}"/><stop offset="54%" stop-color="${b}"/><stop offset="100%" stop-color="${c}"/></radialGradient></defs>`;
  let art='';
  switch(fruit){
    case 'strawberry':
      art=gradient('#FFA4AC','#FF4468','#CE123F')+`<path d="M103 53C69 40 37 51 35 86c-3 30 23 74 52 92 11 7 22 7 32-1 28-23 55-66 53-96-2-34-34-42-69-28Z" fill="url(#${key})"/>
      <path d="M104 54C87 38 66 42 57 28c19-5 34 3 45 16 2-18 12-29 28-35 2 18-4 28-18 38 17-10 31-9 42 0-15 14-34 17-50 7Z" fill="#4C9764"/>
      <path d="M104 43c-2-14 2-24 9-31" stroke="#397A51" stroke-width="6" stroke-linecap="round" fill="none"/>
      <g fill="#FFE7C0" opacity=".84"><ellipse cx="65" cy="92" rx="2.3" ry="4.5" transform="rotate(-22 65 92)"/><ellipse cx="141" cy="92" rx="2.3" ry="4.5" transform="rotate(24 141 92)"/><ellipse cx="53" cy="121" rx="2.5" ry="4"/><ellipse cx="153" cy="120" rx="2.5" ry="4"/><ellipse cx="76" cy="149" rx="2.4" ry="4"/><ellipse cx="125" cy="147" rx="2.5" ry="4"/></g>`;
      break;
    case 'lemon':
      art=gradient('#FFF18A','#FFDE21','#E0B004')+`<path d="M44 75c13-23 44-36 77-28 27 6 46 25 48 50 3 31-20 64-54 71-33 7-64-8-77-33-7-12-8-20-19-25 12-8 16-18 25-35Z" fill="url(#${key})"/>
      <path d="M107 51c-3-17 5-31 19-39" stroke="#5B8B47" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M108 34c22-19 42-17 54-7-11 19-29 24-54 16" fill="#76A758"/>`;
      break;
    case 'blueberry':
      art=gradient('#B6B6FF','#6177FF','#323DAA')+`<circle cx="104" cy="108" r="71" fill="url(#${key})"/>
      <path d="M80 45l-12-14 22 3 15-17 12 19 23-5-12 19" fill="#566CAD" stroke="#485EAA" stroke-width="2" stroke-linejoin="round"/>
      <path d="M65 59c14-16 32-21 43-20" fill="none" stroke="#CFD3FF" stroke-opacity=".68" stroke-width="7" stroke-linecap="round"/>`;
      break;
    case 'peach':
      art=gradient('#FFE1A4','#FFAA62','#EF617F')+`<path d="M104 54C71 28 40 44 34 76c-8 43 14 86 53 96 10 4 20 1 28-2 33-11 58-50 57-89-1-36-38-53-68-27Z" fill="url(#${key})"/>
      <path d="M104 52C96 71 93 84 100 96" fill="none" stroke="#DB8174" stroke-opacity=".65" stroke-width="4" stroke-linecap="round"/>
      <path d="M105 43c-7-16-3-27 7-36" stroke="#648B47" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M111 33c15-23 34-23 47-15-9 20-25 26-47 24" fill="#6D9F61"/>`;
      break;
    case 'avocado':
      art=`<path d="M103 33C73 33 64 55 61 76 38 91 29 124 43 151c10 21 34 31 61 31 31 0 56-12 65-35 9-24-1-51-22-71-4-25-15-43-44-43Z" fill="#426E45"/>
      <path d="M103 44c-24 0-31 21-34 38-20 17-24 41-16 62 8 19 29 29 51 29 25 0 47-9 56-29 8-21-1-45-23-62-2-18-10-38-34-38Z" fill="#C8D99B"/>
      <path d="M101 43c-3-14-1-24 5-34" stroke="#628D4F" stroke-width="7" stroke-linecap="round" fill="none"/>
      <ellipse cx="105" cy="150" rx="20" ry="17" fill="#AD7A52"/><ellipse cx="102" cy="145" rx="12" ry="11" fill="#BF8E61" opacity=".5"/>`;
      break;
    case 'watermelon':
      art=gradient('#FF8598','#FF3659','#D81E49')+`<path d="M28 70h149l-65 106c-5 9-14 9-20 0L28 70Z" fill="url(#${key})"/>
      <path d="M28 70h149" stroke="#C7DF9E" stroke-width="17" stroke-linecap="round"/>
      <path d="M28 68h149" stroke="#44865B" stroke-width="7" stroke-linecap="round"/>
      <g fill="#8D3945" opacity=".65"><ellipse cx="62" cy="92" rx="2.1" ry="4.2"/><ellipse cx="144" cy="91" rx="2.2" ry="4.1"/><ellipse cx="101" cy="152" rx="2.1" ry="4.1"/></g>`;
      break;
    default:
      art=gradient('#FFE09B','#FFA027','#F46B12')+`<path d="M103 35C63 31 32 63 33 106c2 44 32 70 71 72 40 1 70-29 69-71-1-43-28-74-70-72Z" fill="url(#${key})"/>
      <path d="M104 43c-6-17-3-29 9-38" fill="none" stroke="#7A9955" stroke-width="8" stroke-linecap="round"/>
      <path d="M105 27c16-20 37-23 52-14-8 21-24 29-52 27" fill="#64A46C"/>
      <path d="M54 75c5-11 12-17 21-23" stroke="#FFF4D5" stroke-opacity=".52" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  }
  const face=`<g class="mascot-face" style="--look-x:0px;--look-y:0px">
    <g class="mascot-eyes"><ellipse cx="79" cy="113" rx="6" ry="11" fill="#342A2A"/><ellipse cx="123" cy="113" rx="6" ry="11" fill="#342A2A"/></g>
    <path class="mascot-mouth" d="M94 137q9 9 18 0" stroke="#754A45" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="63" cy="132" rx="10" ry="5.3" fill="#FFB1A9" opacity=".55"/><ellipse cx="140" cy="132" rx="10" ry="5.3" fill="#FFB1A9" opacity=".55"/>
  </g>`;
  const interactive=!['picker-mascot','favicon-mascot','brand-mascot','history-mascot'].includes(className);
  return `<svg class="mascot-svg ${className} mascot-${fruit}" viewBox="0 0 210 200" role="${interactive?'button':'img'}" ${interactive?'tabindex="0" data-action="mascot-play"':''} data-fruit="${fruit}" aria-label="${spec.name}${interactive?'. Toque para brincar':''}" focusable="${interactive?'true':'false'}">
    <ellipse class="mascot-shadow" cx="105" cy="190" rx="49" ry="7" fill="#292119" opacity=".11"/>
    <g class="mascot-inner">${art}${face}</g>
    <g class="mascot-sparkles" aria-hidden="true"><path d="M27 35v12m-6-6h12" stroke="#E1B87F" stroke-width="3" stroke-linecap="round"/><circle cx="185" cy="50" r="3" fill="#E6C18B"/></g>
  </svg>`;
};

const PALETTE=[
 ['Laranja','#F97316'],['Tangerina','#FF8A00'],['Coral','#F2545B'],
 ['Morango','#E11D48'],['Framboesa','#BE185D'],['Violeta','#7C3AED'],
 ['Azul','#2563EB'],['Céu','#0EA5E9'],['Petróleo','#0F766E'],
 ['Turquesa','#0891B2'],['Verde','#16A34A'],['Esmeralda','#059669'],
 ['Lima','#65A30D'],['Amarelo','#D69E09'],['Grafite','#374151']
];
const GUEST_KEY='lumo_appearance_guest_v1';
const accountKey=id=>'lumo_appearance_account_'+id+'_v1';
const validColor=c=>/^#[a-f0-9]{6}$/i.test(String(c||''))?String(c).toUpperCase():'#F97316';
const appearance=(value={})=>({
 mascot:mascotSafe(value?.mascot),accentColor:validColor(value?.accentColor),
 theme:value?.theme==='dark'?'dark':'light'
});
const readKey=k=>{try{return appearance(JSON.parse(localStorage.getItem(k)||'{}'))}catch{return appearance()}};
const writeKey=(k,p)=>{try{localStorage.setItem(k,JSON.stringify(p))}catch{}};
const contrast=(hex)=>{
 const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 const light=.2126*v[0]+.7152*v[1]+.0722*v[2];
 return ((light+.05)/.05)>=(1.05/(light+.05))?'#172236':'#FFFFFF';
};
const renderMascot=(className,id)=>mascot('picker-mascot',mascotSafe(id))
 .replace('class="mascot-svg picker-mascot',`class="mascot-svg picker-mascot ${className}`);
function applyAppearance(raw){
 const p=appearance(raw);
 const root=document.documentElement.style;
 root.setProperty('--lumo-user-accent',p.accentColor);
 root.setProperty('--lumo-user-ink',contrast(p.accentColor));
 root.setProperty('--lumo-user-soft',`color-mix(in srgb,${p.accentColor} 14%,white)`);
 document.documentElement.dataset.lumoAppearance=p.theme;
 const gate=document.getElementById('lumo-identity-gate');
 if(gate){
  gate.dataset.mascot=p.mascot;
  gate.dataset.theme=p.theme;
  for(const [id,cls] of [['lumo-gate-entry-mascot','entry-illustration'],['lumo-gate-hero-mascot','hero-illustration']]){
   const el=document.getElementById(id);
   if(el&&el.dataset.renderedMascot!==p.mascot){
    el.innerHTML=renderMascot(cls,p.mascot);
    el.dataset.renderedMascot=p.mascot;
   }
  }
 }
 return p;
}
export {FRUITS,PALETTE,mascotSafe,validColor,appearance,readKey,writeKey,GUEST_KEY,accountKey,applyAppearance,renderMascot};
