"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Milk, Moon, Smile, Droplets, Pill, Ruler, HeartPulse, Users, Bell, LogOut, Cloud, HardDrive } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Entry={id:string;kind:string;detail:string;time:string};
type BabyProfile={id:string;name:string};
const kinds=[{key:"喂奶",icon:Milk},{key:"补剂",icon:Pill},{key:"排便",icon:Droplets},{key:"玩耍",icon:Smile},{key:"睡眠",icon:Moon},{key:"测量",icon:Ruler}];
const categoryFor=(kind:string)=>kind==="喂奶"?"feeding":kind==="补剂"?"supplement":kind==="排便"?"diaper":kind==="玩耍"?"play":kind==="睡眠"?"sleep":"other";
const kindFor=(category:string)=>({feeding:"喂奶",supplement:"补剂",diaper:"排便",play:"玩耍",sleep:"睡眠"} as Record<string,string>)[category]||"测量";

export default function Home(){
 const router=useRouter();
 const [tab,setTab]=useState("今日");const [records,setRecords]=useState<Entry[]>([]);const [baby,setBaby]=useState("宝宝");const [babyId,setBabyId]=useState("");const [householdId,setHouseholdId]=useState("");const [kind,setKind]=useState("喂奶");const [detail,setDetail]=useState("");const [show,setShow]=useState(false);const [date,setDate]=useState("");const [userEmail,setUserEmail]=useState("");const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [notice,setNotice]=useState("");const [cloud,setCloud]=useState(false);
 useEffect(()=>{setDate(new Intl.DateTimeFormat("zh-CN",{dateStyle:"full"}).format(new Date()));},[]);
 useEffect(()=>{let alive=true;async function init(){const s=createClient();if(!s){try{const raw=localStorage.getItem("babycare-records");if(raw&&alive)setRecords(JSON.parse(raw));const n=localStorage.getItem("babycare-name");if(n&&alive)setBaby(n);}catch{}if(alive){setNotice("尚未配置 Supabase 环境变量，当前使用本机演示数据。");setLoading(false);}return;}
 const {data:{user},error:authError}=await s.auth.getUser();if(!alive)return;if(authError){setNotice(authError.message);setLoading(false);return;}
 if(!user){try{const raw=localStorage.getItem("babycare-records");if(raw)setRecords(JSON.parse(raw));const n=localStorage.getItem("babycare-name");if(n)setBaby(n);}catch{}setLoading(false);return;}
 setUserEmail(user.email||"");setCloud(true);
 const {data:households,error:houseError}=await s.from("households").select("id,name").limit(1);
 if(!alive)return;if(houseError){setNotice("读取家庭空间失败："+houseError.message);setLoading(false);return;}
 if(!households?.length){router.replace("/family-setup");return;}
 const h=households[0];setHouseholdId(h.id);
 const {data:babies,error:babyError}=await s.from("babies").select("id,name").eq("household_id",h.id).order("created_at").limit(1);
 if(!alive)return;if(babyError){setNotice("读取宝宝档案失败："+babyError.message);setLoading(false);return;}
 if(!babies?.length){router.replace("/family-setup");return;}
 const b=babies[0] as BabyProfile;setBabyId(b.id);setBaby(b.name);
 const {data:rows,error:recordError}=await s.from("care_records").select("id,category,detail,occurred_at").eq("baby_id",b.id).order("occurred_at",{ascending:false}).limit(200);
 if(!alive)return;if(recordError){setNotice("读取照护记录失败："+recordError.message);}else{setRecords((rows||[]).map((r:any)=>({id:r.id,kind:kindFor(r.category),detail:r.detail,time:r.occurred_at})));}
 setLoading(false);
 }
 init();return()=>{alive=false;};
 },[router]);
 useEffect(()=>{if(!cloud&&!loading){try{localStorage.setItem("babycare-records",JSON.stringify(records));}catch{}}},[records,cloud]);
 const today=useMemo(()=>records.filter(r=>new Date(r.time).toDateString()===new Date().toDateString()),[records]);
 async function add(k:string,d:string){
  if(saving)return;
  setSaving(true);setNotice("");
  try{
   const s=createClient();
   if(cloud){
    if(!s)throw new Error("Supabase 客户端未初始化，请刷新页面后重试。");
    if(!householdId||!babyId)throw new Error("家庭或宝宝档案尚未加载完成，请刷新页面后重试。");
    const {data:{user},error:authError}=await s.auth.getUser();
    if(authError)throw new Error("验证登录状态失败："+authError.message);
    if(!user)throw new Error("登录状态已失效，请重新登录。");
    let timeoutId:ReturnType<typeof setTimeout>|undefined;
    let result;
    try{
     const saveRequest=s.from("care_records").insert({household_id:householdId,baby_id:babyId,created_by:user.id,category:categoryFor(k),detail:d,occurred_at:new Date().toISOString()}).select("id,category,detail,occurred_at").single();
     const timeoutRequest=new Promise<never>((_,reject)=>{timeoutId=setTimeout(()=>reject(new Error("请求超过 20 秒仍未返回，请检查网络或 Supabase 服务状态。")),20000);});
     result=await Promise.race([saveRequest,timeoutRequest]);
    }finally{if(timeoutId)clearTimeout(timeoutId);}
    if(result.error)throw new Error(result.error.message);
    if(!result.data)throw new Error("数据库没有返回保存结果，请刷新记录列表确认是否写入。");
    setRecords(p=>[{id:result.data.id,kind:k,detail:result.data.detail,time:result.data.occurred_at},...p]);
   }else{
    setRecords(p=>[{id:crypto.randomUUID(),kind:k,detail:d,time:new Date().toISOString()},...p]);
   }
   setShow(false);setDetail("");setTab("记录");
  }catch(error){
   const message=error instanceof Error?error.message:String(error);
   setNotice("保存失败："+message+(message.toLowerCase().includes("abort")?"（请求超过 20 秒，已停止等待）":""));
  }finally{setSaving(false);}
 }
 async function signOut(){const s=createClient();if(s)await s.auth.signOut();window.location.href="/";}
 return <main className="shell"><header className="top"><div><div className="brand">🌱 BabyCare</div><div className="muted" style={{fontSize:13}}>让每一份照护，都有迹可循</div></div><div style={{display:"flex",gap:8,alignItems:"center"}}><button className="secondary" onClick={()=>setTab("家庭")}><Users size={16}/> 家庭</button>{userEmail?<button className="secondary" onClick={signOut} title="退出登录"><LogOut size={16}/></button>:<button className="secondary" onClick={()=>router.push("/login")}>登录 / 注册</button>}</div></header>
 <div className="notice" style={{display:"flex",alignItems:"center",gap:8}}>{cloud?<><Cloud size={16}/> 云端已连接 · {userEmail}</>:<><HardDrive size={16}/> 本机模式 · 登录后可使用家庭云端空间</>}</div>
 <nav className="tabs">{["今日","记录","成长","提醒","家庭"].map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</nav>
 {loading?<section className="panel">正在加载家庭数据…</section>:null}
 {tab==="今日"&&<><section className="hero"><div className="muted">{date}</div><h1 style={{fontSize:26,margin:"8px 0"}}>{baby}，今天也要健康快乐呀 💚</h1><div className="muted">家庭共同记录 · 每个小进步都值得珍藏</div></section><div className="grid"><div className="panel"><div className="muted">今日照护记录</div><div className="metric">{today.length}</div><small className="muted">条记录</small></div><div className="panel"><div className="muted">喂养次数</div><div className="metric">{today.filter(x=>x.kind==="喂奶").length}</div><small className="muted">次</small></div><div className="panel"><div className="muted">睡眠记录</div><div className="metric">{today.filter(x=>x.kind==="睡眠").length}</div><small className="muted">段</small></div><div className="panel"><div className="muted">待完成提醒</div><div className="metric">—</div><small className="muted">配置后启用</small></div></div><h2 className="section">快捷记录</h2><div className="actions">{kinds.map(({key,icon:Icon})=><button className="action" key={key} onClick={()=>{setKind(key);setShow(true)}}><Icon size={22}/><b>{key}</b></button>)}</div><h2 className="section">最近动态</h2><div className="panel">{today.slice(0,5).length?today.slice(0,5).map(r=><div className="record" key={r.id}><div><b>{r.kind}</b><div className="muted" style={{fontSize:13}}>{r.detail||"已记录"}</div></div><small className="muted">{new Date(r.time).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}</small></div>):<div className="muted">今天还没有记录，点击上方快捷按钮开始吧。</div>}</div></>}
 {tab==="记录"&&<><h1 className="section">照护记录</h1><div className="panel"><div className="formrow"><select value={kind} onChange={e=>setKind(e.target.value)}>{kinds.map(x=><option key={x.key}>{x.key}</option>)}</select><input value={detail} onChange={e=>setDetail(e.target.value)} placeholder="填写奶量、时长或备注"/><button className="primary" disabled={saving||!babyId&&cloud} onClick={()=>add(kind,detail)}>{saving?"保存中…":"添加记录"}</button></div>{records.length?records.map(r=><div className="record" key={r.id}><div><b>{r.kind}</b><div className="muted">{r.detail||"无备注"}</div></div><small className="muted">{new Date(r.time).toLocaleString("zh-CN")}</small></div>):<p className="muted">还没有记录。</p>}</div></>}
 {tab==="成长"&&<><h1 className="section">成长与健康</h1><div className="panel"><HeartPulse size={28}/><h3>身高、体重、头围与体温</h3><p className="muted">成长曲线和百分位需要宝宝出生日期、性别及经核验的标准数据。当前不会生成虚构的百分位结果。</p><button className="secondary" onClick={()=>{setKind("测量");setShow(true)}}>＋ 添加健康测量</button><p className="notice">标准规划：中国 WS/T 423—2022 与 WHO Child Growth Standards。正式启用前需导入并校验原始标准数据。</p></div></>}
 {tab==="提醒"&&<><h1 className="section">照护提醒</h1><div className="panel"><Bell size={28}/><h3>建立每日照护节奏</h3><p className="muted">喂养、补剂、睡眠和健康观察提醒将在后续接入云端定时任务与 Web Push。浏览器关闭时不能仅依赖网页本地计时器。</p><p className="notice">当前版本提供记录功能；服务端定时提醒和推送尚未启用。</p></div></>}
 {tab==="家庭"&&<><h1 className="section">家庭空间</h1><div className="panel"><Users size={28}/><h3>爸爸、妈妈和照护者一起记录</h3>{cloud?<><p className="muted">已登录：{userEmail}</p><p className="muted">家庭与宝宝档案已连接到云端。家庭邀请和角色管理正在开发中。</p><button className="secondary" onClick={signOut}>退出登录</button></>:<><p className="muted">登录后创建家庭档案，爸爸、妈妈和照护者即可共享记录。</p><button className="primary" onClick={()=>router.push("/login")}>登录 / 注册</button><label className="muted" style={{display:"block",marginTop:16}}>本机演示宝宝昵称</label><div className="formrow" style={{marginTop:8}}><input value={baby} onChange={e=>setBaby(e.target.value)} onBlur={()=>localStorage.setItem("babycare-name",baby)}/><button className="secondary" onClick={()=>localStorage.setItem("babycare-name",baby)}>保存昵称</button></div></>}</div></>}
 {notice&&<p className="notice" style={{overflowWrap:"anywhere"}}>{notice}</p>}
 {show&&<div style={{position:"fixed",inset:0,background:"#10251e66",display:"grid",placeItems:"center",padding:18,zIndex:5}}><div className="panel" style={{width:"min(440px,100%)"}}><h2 style={{marginTop:0}}>记录：{kind}</h2><input autoFocus value={detail} onChange={e=>setDetail(e.target.value)} placeholder="例如：母乳 120ml / 维生素D 1滴" style={{width:"100%",padding:12,border:"1px solid #dce6df",borderRadius:10}}/><div className="formrow" style={{justifyContent:"flex-end",marginTop:16}}><button className="secondary" onClick={()=>setShow(false)}>取消</button><button className="primary" disabled={saving} onClick={()=>add(kind,detail)}>{saving?"保存中…":"保存记录"}</button></div></div></div>}
 <footer className="notice">BabyCare 是家庭记录工具，不替代医生诊断。健康异常请及时咨询儿科医生。{!cloud?"数据说明：本机模式下记录仅保存在当前浏览器。":"照护记录已保存至家庭云端。"}</footer></main>;
}
