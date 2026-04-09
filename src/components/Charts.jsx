import React from 'react';
import { getSources, getSourceColor } from '../lib/master.js';

export function SVGBarChart({ data, keys, colors, height=200 }) {
  const [tooltip, setTooltip] = React.useState(null);
  if (!data.length) return null;
  const maxVal = Math.ceil(Math.max(...data.flatMap(d => keys.map(k => d[k]||0)), 1) * 1.2);
  const padL=36,padR=12,padT=16,padB=28,W=560,H=height;
  const chartW=W-padL-padR, chartH=H-padT-padB;
  const groupW=chartW/data.length;
  const barW=Math.max(6,Math.min(30,groupW/keys.length-5));
  const yTicks=[0,0.25,0.5,0.75,1].map(r=>Math.round(maxVal*r));
  return (
    <div style={{position:"relative",width:"100%"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}}>
        {yTicks.map((v,i)=>{const y=padT+chartH-(v/maxVal)*chartH; return <g key={i}><line x1={padL} x2={W-padR} y1={y} y2={y} stroke={i===0?"#c0dece":"#e8f5ee"} strokeWidth={i===0?1.5:1} strokeDasharray={i===0?"":"4 3"}/><text x={padL-5} y={y+4} textAnchor="end" fontSize={9} fill="#9ca3af">{v}</text></g>;})}
        {data.map((d,di)=>{
          const gx=padL+di*groupW+groupW/2;
          const tw=barW*keys.length+(keys.length-1)*4;
          return <g key={di}>
            {keys.map((k,ki)=>{const val=d[k]||0;const bh=Math.max((val/maxVal)*chartH,val>0?3:0);const x=gx-tw/2+ki*(barW+4);const y=padT+chartH-bh;return <g key={k}><rect x={x} y={y} width={barW} height={bh} fill={colors[k]} rx={3} style={{cursor:"pointer"}} onMouseEnter={e=>setTooltip({x:e.clientX,y:e.clientY,label:d.month,key:k,val})} onMouseLeave={()=>setTooltip(null)}/>{val>0&&<text x={x+barW/2} y={Math.max(y-3,padT+8)} textAnchor="middle" fontSize={9} fill={colors[k]} fontWeight={700}>{val}</text>}</g>;})};
            <text x={gx} y={H-padB+14} textAnchor="middle" fontSize={10} fill="#6a9a7a">{d.month}</text>
          </g>;
        })}
      </svg>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:6,paddingLeft:padL}}>
        {keys.map(k=><div key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#6a9a7a"}}><span style={{width:12,height:12,borderRadius:3,background:colors[k],display:"inline-block"}}/>{k}</div>)}
      </div>
      {tooltip&&<div style={{position:"fixed",left:tooltip.x+12,top:tooltip.y-30,background:"#fff",border:"1px solid #e2f0e8",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#174f35",pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 12px #0002"}}><b>{tooltip.label}</b> / {tooltip.key}: <b>{tooltip.val}</b></div>}
    </div>
  );
}

export function SVGLineChart({ data, keys, colors, height=200 }) {
  const [tooltip, setTooltip] = React.useState(null);
  if (!data.length) return null;
  const maxVal=Math.max(...data.flatMap(d=>keys.map(k=>d[k]||0)),1);
  const padL=36,padR=12,padT=16,padB=28,W=560,H=height;
  const chartW=W-padL-padR,chartH=H-padT-padB;
  const xStep=data.length>1?chartW/(data.length-1):chartW;
  const px=i=>padL+(data.length>1?i*xStep:chartW/2);
  const py=v=>padT+chartH-(v/maxVal)*chartH;
  const yTicks=[0,0.25,0.5,0.75,1].map(r=>Math.round(maxVal*r));
  return (
    <div style={{position:"relative",width:"100%"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}}>
        {yTicks.map((v,i)=>{const y=py(v);return <g key={i}><line x1={padL} x2={W-padR} y1={y} y2={y} stroke={i===0?"#c0dece":"#e8f5ee"} strokeWidth={i===0?1.5:1} strokeDasharray={i===0?"":"4 3"}/><text x={padL-5} y={y+4} textAnchor="end" fontSize={9} fill="#9ca3af">{v}</text></g>;})}
        {keys.map(k=>{
          const pts=data.map((d,i)=>`${px(i)},${py(d[k]||0)}`).join(" ");
          return <g key={k}>
            <polyline points={pts} fill="none" stroke={colors[k]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
            {data.map((d,i)=>{const val=d[k]||0;const cx=px(i),cy=py(val);return <g key={i}><circle cx={cx} cy={cy} r={4} fill={colors[k]} stroke="#fff" strokeWidth={1.5} style={{cursor:"pointer"}} onMouseEnter={e=>setTooltip({x:e.clientX,y:e.clientY,label:d.month,key:k,val})} onMouseLeave={()=>setTooltip(null)}/>{val>0&&<text x={cx} y={Math.max(cy-8,padT+8)} textAnchor="middle" fontSize={9} fill={colors[k]} fontWeight={700}>{val}</text>}</g>;})}
          </g>;
        })}
        {data.map((d,i)=><text key={i} x={px(i)} y={H-padB+14} textAnchor="middle" fontSize={10} fill="#6a9a7a">{d.month}</text>)}
      </svg>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:6,paddingLeft:padL}}>
        {keys.map(k=><div key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#6a9a7a"}}><span style={{width:18,height:3,background:colors[k],display:"inline-block",borderRadius:2}}/>{k}</div>)}
      </div>
      {tooltip&&<div style={{position:"fixed",left:tooltip.x+12,top:tooltip.y-30,background:"#fff",border:"1px solid #e2f0e8",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#174f35",pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 12px #0002"}}><b>{tooltip.label}</b> / {tooltip.key}: <b>{tooltip.val}</b></div>}
    </div>
  );
}

export function Trend({ leads }) {
  const normYM=s=>{if(!s)return"";if(/^\d{4}-\d{2}/.test(s))return s.slice(0,7);const m=s.match(/^(\d{4})[\/-](\d{1,2})/);return m?m[1]+"-"+m[2].padStart(2,"0"):"";};
  const sources=getSources();
  const srcColors=Object.fromEntries(sources.map((src,i)=>[src,getSourceColor(src,i)]));
  const months=[...new Set(leads.map(l=>normYM(l.date)).filter(Boolean))].sort();
  const data=months.map(m=>{
    const fl=leads.filter(l=>normYM(l.date)===m);
    const srcCounts=Object.fromEntries(sources.map(src=>[src,fl.filter(l=>l.source===src).length]));
    const validCount=fl.filter(l=>l.status!=="育成対象外").length;
    return { month:m.slice(5)+"月", 反響数:fl.length, 有効リード数:validCount, 商談数:fl.filter(l=>["日程調整中","商談確定"].includes(l.status)).length, MQL数:fl.filter(l=>l.mql==="MQL").length, ...srcCounts };
  });
  if (data.length===0) return (
    <div style={{padding:"24px 28px"}}>
      <div style={{fontSize:17,fontWeight:900,color:"#174f35",marginBottom:16}}>📈 月別推移レポート</div>
      <div style={{textAlign:"center",padding:60,color:"#6a9a7a",background:"#fff",borderRadius:14,border:"1px solid #e2f0e8"}}>
        <div style={{fontSize:36,marginBottom:12}}>📊</div>
        <div style={{fontSize:14,fontWeight:600}}>まだデータがありません</div>
        <div style={{fontSize:12,marginTop:6}}>リードを登録すると月別推移が表示されます</div>
      </div>
    </div>
  );
  const latest=data[data.length-1], prev=data[data.length-2];
  const diffBadge=(key)=>{
    if(!prev) return null;
    const d=latest[key]-prev[key];
    return <span style={{fontSize:11,fontWeight:700,marginLeft:6,color:d>0?"#10b981":d<0?"#ef4444":"#9ca3af"}}>{d>0?"+":""}{d}件</span>;
  };
  return (
    <div className="page-pad" style={{padding:"24px 28px"}}>
      <div style={{fontSize:17,fontWeight:900,color:"#174f35",marginBottom:20}}>📈 月別推移レポート</div>
      <div className="two-col trend-charts" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        <div style={{background:"#fff",borderRadius:14,padding:"18px 20px",border:"1px solid #e2f0e8"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:12}}>📊 反響数・商談数・MQL数</div>
          <SVGBarChart data={data} keys={["反響数","商談数","MQL数"]} colors={{"反響数":"#10b981","商談数":"#6366f1","MQL数":"#ec4899"}} height={200}/>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:"18px 20px",border:"1px solid #e2f0e8"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:12}}>📉 流入元別推移</div>
          <SVGLineChart data={data} keys={sources} colors={srcColors} height={200}/>
        </div>
      </div>
      <div style={{background:"#fff",borderRadius:14,padding:"18px 20px",border:"1px solid #e2f0e8",overflowX:"auto"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:12}}>📋 月別詳細データ</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#f0f5f2"}}>
            {["月","流入元","反響数","有効リード数","商談数","商談化率","MQL数","MQL率"].map(h=>(
              <th key={h} style={{padding:"8px 12px",textAlign:"center",color:"#6a9a7a",fontWeight:700,borderBottom:"1px solid #e2f0e8",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[...data].reverse().flatMap((d,mi)=>{
              const isLatest=mi===0;
              const monthKey=months[months.length-1-mi];
              const monthLeads=leads.filter(l=>normYM(l.date)===monthKey);
              const srcList=sources.map(src=>({key:src,label:src,color:srcColors[src]}));
              const bgMonth=isLatest?"#f0fdf4":mi%2===0?"#fff":"#f8fbf9";
              const totalCnt=monthLeads.length;
              const totalValid=monthLeads.filter(l=>l.status!=="育成対象外").length;
              const totalDeals=monthLeads.filter(l=>["日程調整中","商談確定"].includes(l.status)).length;
              const totalMql=monthLeads.filter(l=>l.mql==="MQL").length;
              const srcRows=srcList.map((src,si)=>{
                const fl=monthLeads.filter(l=>l.source===src.key);
                const cnt=fl.length;
                const validCnt=fl.filter(l=>l.status!=="育成対象外").length;
                const deals=fl.filter(l=>["日程調整中","商談確定"].includes(l.status)).length;
                const mql=fl.filter(l=>l.mql==="MQL").length;
                const isFirst=si===0;
                return <tr key={`${mi}-${si}`} style={{borderBottom:"1px solid #f0f5f2",background:bgMonth}}>
                  {isFirst&&<td rowSpan={srcList.length+1} style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#174f35",borderRight:"1px solid #e2f0e8",verticalAlign:"middle"}}>{d.month}{isLatest&&<span style={{fontSize:9,marginLeft:4,background:"#10b981",color:"#fff",borderRadius:3,padding:"1px 4px"}}>最新</span>}</td>}
                  <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:src.color}}>{src.label}</td>
                  <td style={{padding:"8px 12px",textAlign:"center",color:src.color,fontWeight:700}}>{cnt}</td>
                  <td style={{padding:"8px 12px",textAlign:"center",color:"#15803d",fontWeight:700}}>{validCnt}</td>
                  <td style={{padding:"8px 12px",textAlign:"center",color:"#f59e0b",fontWeight:700}}>{deals}</td>
                  <td style={{padding:"8px 12px",textAlign:"center",color:"#d97706"}}>{validCnt?(deals/validCnt*100).toFixed(1):0}%</td>
                  <td style={{padding:"8px 12px",textAlign:"center",color:"#8b5cf6",fontWeight:700}}>{mql}</td>
                  <td style={{padding:"8px 12px",textAlign:"center",color:"#7c3aed"}}>{cnt?(mql/cnt*100).toFixed(1):0}%</td>
                </tr>;
              });
              const totalRow=<tr key={`${mi}-total`} style={{borderBottom:"2px solid #e2f0e8",background:isLatest?"#d1fae5":"#f0f5f2"}}>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#174f35"}}>合計</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#174f35"}}>{totalCnt}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#15803d"}}>{totalValid}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#f59e0b"}}>{totalDeals}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#d97706"}}>{totalValid?(totalDeals/totalValid*100).toFixed(1):0}%</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#8b5cf6"}}>{totalMql}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#7c3aed"}}>{totalCnt?(totalMql/totalCnt*100).toFixed(1):0}%</td>
              </tr>;
              return [...srcRows, totalRow];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
