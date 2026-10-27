/* ═══════════ 鎏金账房 · 逻辑层 ═══════════ */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const fmt = (n, d = 0) =>
  Number(n).toLocaleString("zh-CN", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtY = (n) => (Math.abs(n) >= 1e8 ? (n / 1e8).toFixed(2) + " 亿" : Math.abs(n) >= 1e4 ? (n / 1e4).toFixed(1) + " 万" : fmt(n));

const num = (id) => {
  const v = parseFloat($("#" + id).value);
  return isFinite(v) ? v : NaN;
};

/* ═══════════ I · 复利推演 ═══════════ */
let compSeries = [];

function compound() {
  const pv = Math.max(0, num("cPv") || 0);
  const pmt = Math.max(0, num("cPmt") || 0);
  const rate = Math.min(30, Math.max(0, num("cRate") || 0));
  const years = Math.min(50, Math.max(1, Math.round(num("cYears") || 1)));
  const r = rate / 100 / 12;

  let bal = pv, cost = pv;
  compSeries = [{ year: 0, bal, int: 0 }];
  let yInt = 0;
  for (let m = 1; m <= years * 12; m++) {
    const interest = bal * r;
    bal += interest + pmt;
    cost += pmt;
    yInt += interest;
    if (m % 12 === 0) {
      compSeries.push({ year: m / 12, bal, int: yInt });
      yInt = 0;
    }
  }

  const final = compSeries[compSeries.length - 1].bal;
  $("#cResult").hidden = false;
  $("#cFv").textContent = fmtY(final);
  $("#cCost").textContent = fmtY(cost);
  $("#cInt").textContent = fmtY(final - cost);

  $("#cChartFrame").hidden = false;
  $("#cTableFrame").hidden = false;
  drawChart();

  const tb = $("#cTable");
  tb.innerHTML = "";
  compSeries.slice(1).forEach((row) => {
    const tr = document.createElement("tr");
    const deposit = (row.year === 0 ? pv : pmt * 12);
    tr.innerHTML =
      "<td>第 " + row.year + " 年</td><td class='g'>" + fmt(row.bal) +
      "</td><td>" + fmt(deposit) + "</td><td>" + fmt(row.int) + "</td>";
    tb.appendChild(tr);
  });
}

/* 金色增长曲线（canvas，自适应 + 高分屏） */
function drawChart() {
  const cv = $("#cChart");
  const W = cv.clientWidth || cv.parentElement.clientWidth - 28;
  const H = 230;
  const dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.height = H + "px";
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 56, r: 14, t: 16, b: 26 };
  const data = compSeries.map((s) => s.bal);
  const maxV = Math.max.apply(null, data);
  const n = data.length - 1;
  const X = (i) => pad.l + (i / n) * (W - pad.l - pad.r);
  const Y = (v) => H - pad.b - (v / maxV) * (H - pad.t - pad.b);

  /* 网格与刻度 */
  ctx.strokeStyle = "rgba(34,51,46,.3)";
  ctx.fillStyle = "#7d8a80";
  ctx.font = "10px serif";
  ctx.textAlign = "right";
  for (let g = 0; g <= 4; g++) {
    const v = (maxV / 4) * g;
    const y = Y(v);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
    ctx.fillText(fmtY(v), pad.l - 8, y + 3);
  }
  ctx.textAlign = "center";
  const step = n <= 10 ? 1 : n <= 20 ? 5 : 10;
  for (let yr = 0; yr <= n; yr += step) {
    ctx.fillText(yr + "年", X(yr), H - 8);
  }

  /* 投入线（虚线） */
  const costData = compSeries.map((s, i) => (i === 0 ? num("cPv") || 0 : (num("cPv") || 0) + (num("cPmt") || 0) * 12 * s.year));
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = "rgba(46,95,107,.55)";
  ctx.beginPath();
  costData.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.stroke();
  ctx.setLineDash([]);

  /* 终值曲线 + 填充 */
  const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
  grad.addColorStop(0, "rgba(179,64,46,.2)");
  grad.addColorStop(1, "rgba(200,163,90,0)");
  ctx.beginPath();
  data.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.lineTo(X(n), Y(0));
  ctx.lineTo(X(0), Y(0));
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  data.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.strokeStyle = "#b3402e";
  ctx.lineWidth = 2;
  ctx.stroke();

  /* 端点金珠 */
  ctx.beginPath();
  ctx.arc(X(n), Y(data[n]), 4, 0, Math.PI * 2);
  ctx.fillStyle = "#b3402e";
  ctx.fill();

  /* 图注 */
  ctx.textAlign = "left";
  ctx.fillStyle = "#b3402e";
  ctx.fillText("— 期末余额", pad.l + 8, pad.t + 2);
  ctx.fillStyle = "rgba(46,95,107,.85)";
  ctx.fillText("-- 累计投入", pad.l + 108, pad.t + 2);
}

$("#cGo").addEventListener("click", compound);
window.addEventListener("resize", () => {
  if (!$("#cChartFrame").hidden) drawChart();
});

/* ═══════════ II · 目标缺口 ═══════════ */
$("#gGo").addEventListener("click", () => {
  const FV = num("gTarget"), pv = Math.max(0, num("gHave") || 0);
  const years = Math.min(50, Math.max(1, Math.round(num("gYears") || 1)));
  const rate = Math.min(30, Math.max(0, num("gRate") || 0));
  if (!(FV > 0)) return;

  const r = rate / 100 / 12;
  const n = years * 12;
  let pmt;
  if (r === 0) {
    pmt = (FV - pv) / n;
  } else {
    const growth = Math.pow(1 + r, n);
    pmt = (FV - pv * growth) * r / (growth - 1);
  }
  pmt = Math.max(0, pmt);

  const totalOut = pv + pmt * n;
  const share = totalOut > 0 ? (FV - totalOut) / FV : 0; /* 利息占目标比例 */
  const done = FV > 0 ? Math.min(100, pv / FV * 100) : 0;

  $("#gResult").hidden = false;
  $("#gPmt").textContent = fmt(pmt) + " 元";
  $("#gLine").innerHTML =
    "现有 <b style='color:#b3402e'>" + fmtY(pv) + "</b>，占目标 " + done.toFixed(1) +
    "%；存满 " + years + " 年共投入 <b style='color:#b3402e'>" + fmtY(pv + pmt * n) +
    "</b>，其余 " + fmtY(Math.max(0, FV - pv - pmt * n)) + " 由复利补足。";
  $("#gBar").style.width = done.toFixed(1) + "%";
  $("#gNote").textContent =
    pmt === 0
      ? "现有储蓄按此利率滚存即可达标，无需再存。"
      : "按年化 " + rate + "% 月复利测算 · 利息将贡献目标的 " + Math.max(0, share * 100).toFixed(1) + "%";
});

/* ═══════════ III · 债务分期（等额本息） ═══════════ */
$("#lGo").addEventListener("click", () => {
  const P = num("lP"), rate = Math.min(36, Math.max(0, num("lRate") || 0));
  const n = Math.min(600, Math.max(1, Math.round(num("lN") || 1)));
  if (!(P > 0)) return;

  const r = rate / 100 / 12;
  const M = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

  $("#lResult").hidden = false;
  $("#lM").textContent = fmt(M, 2) + " 元";
  $("#lTotal").textContent = fmtY(M * n);
  $("#lInt").textContent = fmtY(M * n - P);

  $("#lTableFrame").hidden = false;
  const tb = $("#lTable");
  tb.innerHTML = "";

  let bal = P;
  for (let k = 1; k <= n; k++) {
    const interest = bal * r;
    const principal = M - interest;
    bal -= principal;
    const isYearEnd = k % 12 === 0 || k === n;
    if (k <= 12 || isYearEnd) {
      const tr = document.createElement("tr");
      const label = k === n && n > 12 ? "末期" : "第 " + k + " 期" + (isYearEnd && n > 12 ? " · 满" + (k / 12) + "年" : "");
      tr.innerHTML =
        "<td>" + label + "</td><td class='g'>" + fmt(M, 2) +
        "</td><td>" + fmt(principal, 2) + "</td><td>" + fmt(interest, 2) +
        "</td><td>" + fmt(Math.max(0, bal), 2) + "</td>";
      tb.appendChild(tr);
    }
  }
});

/* ═══════════ IV · 配置罗盘 ═══════════ */
const QUIZ = [
  {
    q: "持仓单月回撤一成，你会？",
    opts: [["按计划补仓", 2], ["不动，等回来", 1], ["清仓保平安", 0]],
  },
  {
    q: "这笔钱的可用期限是？",
    opts: [["五年以上", 2], ["一到三年", 1], ["一年之内", 0]],
  },
  {
    q: "更想要哪种收益路径？",
    opts: [["大起大落博高收益", 2], ["稳中求进", 1], ["几乎不亏就好", 0]],
  },
  {
    q: "你的收入来源？",
    opts: [["稳定且有增长", 2], ["稳定但天花板明显", 1], ["波动较大", 0]],
  },
  {
    q: "投资经验年限？",
    opts: [["五年以上，经历过牛熊", 2], ["一至五年", 1], ["刚开始", 0]],
  },
];

const RISK = [
  { min: 0,  name: "保守方位", desc: "防御为上 · 现金与债为主", stocks: 15, bonds: 50, cash: 35, exp: "约 2% – 4%", vol: "低波动" },
  { min: 3,  name: "稳健方位", desc: "进可攻退可守", stocks: 35, bonds: 45, cash: 20, exp: "约 3% – 6%", vol: "中低波动" },
  { min: 5,  name: "平衡方位", desc: "股债均衡 · 长期主线", stocks: 55, bonds: 32, cash: 13, exp: "约 4% – 8%", vol: "中波动" },
  { min: 7,  name: "进取方位", desc: "权益主导 · 与波动共舞", stocks: 75, bonds: 20, cash: 5,  exp: "约 5% – 10%", vol: "高波动" },
];

const answers = new Array(QUIZ.length).fill(null);

function renderQuiz() {
  const ol = $("#quiz");
  ol.innerHTML = "";
  QUIZ.forEach((item, qi) => {
    const li = document.createElement("li");
    const head = document.createElement("span");
    head.textContent = item.q;
    li.appendChild(head);
    const box = document.createElement("div");
    box.className = "opts";
    item.opts.forEach(([label, score]) => {
      const b = document.createElement("button");
      b.className = "opt" + (answers[qi] === score ? " on" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        answers[qi] = score;
        box.querySelectorAll(".opt").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
      });
      box.appendChild(b);
    });
    li.appendChild(box);
    ol.appendChild(li);
  });
}

$("#aGo").addEventListener("click", () => {
  if (answers.some((a) => a === null)) {
    const plate = $("#aResult");
    plate.hidden = true;
    return;
  }
  const total = answers.reduce((s, a) => s + a, 0);
  let pick = RISK[0];
  for (const r of RISK) if (total >= r.min) pick = r;

  $("#aResult").hidden = false;
  $("#aName").textContent = pick.name;
  $("#aDesc").textContent = pick.desc + " · " + pick.vol;

  const bars = [
    ["权益类", pick.stocks],
    ["固收类", pick.bonds],
    ["现金类", pick.cash],
  ];
  $("#aBars").innerHTML = bars
    .map(
      ([n, v]) =>
        "<div class='ab'><small>" + n + "</small><div class='bar'><i style='width:" +
        v + "%'></i></div><b>" + v + "%</b></div>"
    )
    .join("");

  const sample = 100000;
  $("#aSample").innerHTML =
    "<h4>十万本金 · 按此方位的落子</h4>" +
    "权益类 <b>" + fmt(sample * pick.stocks / 100) + "</b> 元 · " +
    "固收类 <b>" + fmt(sample * pick.bonds / 100) + "</b> 元 · " +
    "现金类 <b>" + fmt(sample * pick.cash / 100) + "</b> 元。" +
    "长期年化参考区间 " + pick.exp + "（非承诺收益）。";
});

/* ═══════════ 吸顶导航高亮 ═══════════ */
const chaps = $$(".chapters a");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        chaps.forEach((a) => a.classList.toggle("hit", a.getAttribute("href") === "#" + e.target.id));
      }
    });
  },
  { rootMargin: "-40% 0px -55% 0px" }
);
$$(".chapter").forEach((c) => io.observe(c));

/* ═══════════ 初始化 ═══════════ */
renderQuiz();
