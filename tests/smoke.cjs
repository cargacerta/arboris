const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');const fs=require('fs');
const html=fs.readFileSync('web/index.html','utf8').replace(/<script src="[^"]*"><\/script>/g,'');
const now=Date.now();
const board=(role)=>({now:new Date(now).toISOString(),notice:null,queue:[{profile_id:'u9',name:'Ana Lima',bloco:'2',apto:'31'}],
 points:[{id:1,off:false,session:{profile_id:'u1',name:'Maria Souza',bloco:'9',apto:'4',car:'BYD Dolphin',plate:'TMN7C49',started_at:new Date(now-3600e3).toISOString(),ends_at:new Date(now+3600e3).toISOString(),phone:role==='sindico'?'(71) 99999-0000':null}},
         {id:2,off:false,session:null,reservation:null}]});
function run(role,opt){opt=opt||{};return new Promise(res=>{
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://x.github.io/carga/',pretendToBeVisual:true});
 const w=dom.window;w.scrollTo=()=>{};
 const errs=[];w.addEventListener('error',e=>errs.push(e.message));
 const q=(data)=>{const o={data,error:null,then:(f,g)=>Promise.resolve({data,error:null}).then(f,g),select:()=>q(data),order:()=>q(data),limit:()=>q(data),eq:()=>q(data),maybeSingle:()=>q(Array.isArray(data)?data[0]:data),upsert:()=>q(null)};return o};
 const me={id:'u1',name:'Maria Souza',bloco:'9',apto:'4',plate:'TMN7C49',role,status:'approved',phone:'(71) 99999-0000',car:'BYD'};
 w.supabase={createClient:()=>({
  auth:{getSession:async()=>({data:{session:{user:{id:'u1',email:'m@x.com'}}}}),onAuthStateChange(){},signOut:async()=>{}},
  rpc:async(fn)=>fn==='usage_by_hour'?(opt.usageFail?{data:null,error:{message:'falhou'}}:{data:opt.usage||{days:30,sessions:0,weekday:Array(24).fill(0),weekend:Array(24).fill(0)},error:null}):({data:fn==='board'?board(role):fn==='monthly_report'?{total:5,hours:12.5,avg_minutes:90,late:1,hist:Array(24).fill(0).map((_,i)=>i===19?3:0),top:[{name:'Maria',count:3}],avg_wait:4,reports_open:1,reports_done:2}:[],error:null}),
  from:(t)=>q(t==='profiles'?[me]:[]),
  channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}})};
 w.qrcode=()=>({addData(){},make(){},createSvgTag:()=>'<svg></svg>'});
 w.eval(fs.readFileSync('web/config.js','utf8').replace(/COLE_[A-Z_]+/g,'https://abc.supabase.co'));
 w.eval(fs.readFileSync('web/app.js','utf8'));
 setTimeout(()=>{
  const out={errs,title:w.document.querySelector('#ttl').textContent,html:w.document.querySelector('#view').innerHTML};
  if(opt.after){opt.after(w,out,res);return}
  if(role==='sindico'){w.document.querySelector('[data-act=tab][data-id=registro]').click();setTimeout(()=>{out.rep=w.document.querySelector('#view').innerHTML;res(out)},300)}else res(out);
 },300);
})}
(async()=>{
 const m=await run('morador'),s=await run('sindico');let bad=0;
 const t=(c,n)=>{console.log((c?'ok  ':'FALHA ')+n);if(!c)bad++};
 t(!m.errs.length,'sem erros (morador) '+m.errs);t(m.title==='Pontos de recarga','título morador');
 t(/Maria Souza/.test(m.html)&&/Você/.test(m.html),'sessão própria');t(!/Iniciar carga/.test(m.html),'quem já carrega não vê Iniciar carga');t(/Terminei, liberar/.test(m.html),'botão liberar');t(!/99999-0000/.test(m.html),'telefone oculto ao morador');
 t(!s.errs.length,'sem erros (síndico) '+s.errs);t(/99999-0000/.test(s.html),'telefone visível ao síndico');t(/wa\.me\/5571999990000/.test(s.html),'link wa.me');
 t(/Relatório do mês/.test(s.title)||/cargas no mês/.test(s.rep||''),'relatório mensal');t(/70%|19h|Horário de maior demanda/.test(s.rep||''),'gráfico de horários');
 // gráfico de horários (dados simulados)
 const wd=Array(24).fill(0).map((_,i)=>i>=18&&i<=21?90:i>=10&&i<=12?5:40),we=Array(24).fill(20);
 const card=html=>{const i=html.indexOf('Horários mais movimentados');return i<0?'':html.slice(i,html.indexOf('</section>',i))};
 const u=await run('morador',{usage:{days:30,sessions:25,weekday:wd,weekend:we},after:(w,out,res)=>{
   out.card=card(w.document.querySelector('#view').innerHTML);
   const b=w.document.querySelector('[data-act=usageType][aria-pressed=false]');out.other=b&&b.dataset.id;
   if(b)b.click();setTimeout(()=>{out.card2=card(w.document.querySelector('#view').innerHTML);res(out)},50)}});
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Bahia',hour:'numeric',hourCycle:'h23',weekday:'short'}).formatToParts(new Date());
 const hr=+parts.find(x=>x.type==='hour').value%24,wkd=/Sat|Sun/.test(parts.find(x=>x.type==='weekday').value);
 t(!u.errs.length,'gráfico: sem erros '+u.errs);t(!!u.card,'gráfico: cartão aparece');
 t((u.card.match(/<rect /g)||[]).length===24,'gráfico: 24 barras');t((u.card.match(/>\d+h<\/text>/g)||[]).length===8,'gráfico: rótulos a cada 3h');
 t(new RegExp('data-id="'+(wkd?'weekend':'weekday')+'" aria-pressed="true"').test(u.card),'gráfico: abre no tipo de hoje');
 t((u.card.match(/class="hb now"/g)||[]).length===1,'gráfico: destaca a hora atual');
 const arr=wkd?we:wd,lvl=arr[hr]<=33?'baixo':arr[hr]<=66?'médio':'alto';
 t(u.card.includes('Agora: movimento '+lvl+'.'),'gráfico: nível de agora ('+lvl+')');
 if(!wkd){t(u.card.includes('mais livre entre 10h e 13h'),'gráfico: melhor intervalo 10h-13h');t((u.card.match(/class="hb (busy|now)"/g)||[]).length>=3,'gráfico: 3 horas mais cheias')}
 else{t(/mais livre entre 6h e 9h/.test(u.card),'gráfico: melhor intervalo (empate, 6h-9h)')}
 t(new RegExp('data-id="'+u.other+'" aria-pressed="true"').test(u.card2),'gráfico: alterna dias úteis / fim de semana');
 t(!wkd?(u.card2.match(/class="hb now"/g)||[]).length===0:true,'gráfico: hora atual só no tipo de hoje');
 const few=await run('morador',{usage:{days:30,sessions:4,weekday:wd,weekend:we}});
 t(/faltam 6 cargas\./.test(few.html)&&!/<svg class="chart"/.test(card(few.html)),'gráfico: poucos dados mostra quantas cargas faltam');
 const fail=await run('morador',{usageFail:true});
 t(!fail.errs.length&&!/Horários mais movimentados/.test(fail.html)&&/Pontos de recarga/.test(fail.title),'gráfico: falha silenciosa');
 console.log(bad?bad+' falhas':'tudo ok');process.exit(bad?1:0);
})();
