import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

const currency = (n) => `$${Math.round(n || 0).toLocaleString()}`;

function project({ nw, income, saveRate, raisePct, raiseInvestPct, ret, infl, years }) {
  const d = [nw];
  const l = [nw];
  let incD = income;
  let incL = income;

  for (let i = 1; i <= years; i++) {
    incD *= 1 + raisePct / 100;
    incL *= 1 + raisePct / 100;

    const saveD = incD * (saveRate / 100) + (incD * (raiseInvestPct / 100) - income * (raiseInvestPct / 100));
    const driftSaveRate = Math.max(2, saveRate - 8);
    const saveL = incL * (driftSaveRate / 100);

    d.push(d[i - 1] * (1 + (ret - infl) / 100) + saveD);
    l.push(l[i - 1] * (1 + (ret - infl - 0.6) / 100) + saveL);
  }

  return { d, l };
}

function scenarioFinal(base, scenario) {
  const result = project({ ...base, ...scenario });
  return result.d[result.d.length - 1];
}

function randn() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const idx = Math.floor((arr.length - 1) * p);
  return arr[idx];
}

function buildPath(points, width, height, maxV, minV, p = 12) {
  if (!points.length) return '';
  const w = width - p * 2;
  const h = height - p * 2;
  const range = Math.max(1, maxV - minV);
  return points
    .map((v, i) => {
      const x = p + (i / (points.length - 1 || 1)) * w;
      const y = p + (1 - (v - minV) / range) * h;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function buildSpreadAreaPath(top, bottom, width, height, maxV, minV, pad = 12) {
  if (!top.length || top.length !== bottom.length) return '';
  const w = width - pad * 2;
  const h = height - pad * 2;
  const range = Math.max(1, maxV - minV);
  const point = (arr, i) => {
    const x = pad + (i / (arr.length - 1 || 1)) * w;
    const y = pad + (1 - (arr[i] - minV) / range) * h;
    return `${x} ${y}`;
  };

  const forward = top.map((_, i) => `${i === 0 ? 'M' : 'L'} ${point(top, i)}`).join(' ');
  const backward = [...bottom].reverse().map((_, j) => {
    const i = bottom.length - 1 - j;
    return `L ${point(bottom, i)}`;
  }).join(' ');

  return `${forward} ${backward} Z`;
}

function TrajectoryChart({ disciplined, drift, fiYear }) {
  const width = 360;
  const height = 250;
  const p = 14;
  const maxV = Math.max(...disciplined, ...drift);
  const minV = Math.min(...disciplined, ...drift);
  const dPath = buildPath(disciplined, width, height, maxV, minV, p);
  const lPath = buildPath(drift, width, height, maxV, minV, p);
  const plotW = width - p * 2;
  const plotH = height - p * 2;
  const xFi = fiYear >= 0 ? p + (fiYear / ((disciplined.length - 1) || 1)) * plotW : null;

  const yFrom = (v) => p + (1 - (v - minV) / Math.max(1, maxV - minV)) * plotH;
  const areaPath = buildSpreadAreaPath(disciplined, drift, width, height, maxV, minV, p);

  return (
    <View style={styles.chartWrap}>
      <Text style={styles.chartTitle}>Net Worth Trajectory</Text>
      <Svg width="100%" height={250} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#121a2d" />
            <Stop offset="100%" stopColor="#0b0f18" />
          </LinearGradient>
          <LinearGradient id="spreadGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6A88FF" stopOpacity="0.24" />
            <Stop offset="100%" stopColor="#6A88FF" stopOpacity="0.03" />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width={width} height={height} rx="14" fill="url(#bgGrad)" />

        {[0, 0.25, 0.5, 0.75, 1].map((k) => {
          const y = p + k * plotH;
          return <Line key={k} x1={p} y1={y} x2={width - p} y2={y} stroke="#24304a" strokeWidth="1" />;
        })}

        <Path d={areaPath} fill="url(#spreadGrad)" />

        {xFi !== null && (
          <>
            <Line x1={xFi} y1={p} x2={xFi} y2={height - p} stroke="#9EE493" strokeWidth="2" strokeDasharray="5,4" />
            <SvgText x={xFi + 4} y={p + 12} fill="#9EE493" fontSize="10">FI</SvgText>
          </>
        )}

        <Path d={lPath} stroke="#C35C76" strokeWidth="3" fill="none" />
        <Path d={dPath} stroke="#6A88FF" strokeWidth="3" fill="none" />

        <Circle cx={width - p} cy={yFrom(disciplined[disciplined.length - 1])} r="4" fill="#6A88FF" />
        <Circle cx={width - p} cy={yFrom(drift[drift.length - 1])} r="4" fill="#C35C76" />
      </Svg>
      <View style={styles.legendRow}>
        <Text style={[styles.legend, { color: '#6A88FF' }]}>● Disciplined</Text>
        <Text style={[styles.legend, { color: '#C35C76' }]}>● Drift</Text>
        <Text style={[styles.legend, { color: '#9EE493' }]}>● FI Marker</Text>
      </View>
    </View>
  );
}

function ScenarioBarChart({ a, b, c }) {
  const data = [
    { label: 'A', value: a, color: '#6A88FF' },
    { label: 'B', value: b, color: '#5CC3FF' },
    { label: 'C', value: c, color: '#9EE493' },
  ];
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.chartWrap}>
      <Text style={styles.chartTitle}>Scenario Outcome Compare</Text>
      {data.map((row) => {
        const pct = Math.max(4, (row.value / max) * 100);
        return (
          <View key={row.label} style={{ marginBottom: 10 }}>
            <View style={styles.rowLine}>
              <Text style={styles.metric}>Scenario {row.label}</Text>
              <Text style={styles.strong}>{currency(row.value)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: row.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function App() {
  const [form, setForm] = useState({
    netWorth: '50000', income: '100000', saveRate: '25', raisePct: '5', raiseInvestPct: '70',
    returnPct: '7', inflationPct: '2.5', horizon: '10', wr: '4', currentAge: '30', fiBandStart: '40', fiBandEnd: '50',
    sims: '120', volatility: '12', taxDrag: '1',
  });

  const [mc, setMc] = useState({ p10: '--', p50: '--', p90: '--' });

  const base = useMemo(() => ({
    nw: +form.netWorth || 0,
    income: +form.income || 0,
    saveRate: +form.saveRate || 0,
    raisePct: +form.raisePct || 0,
    raiseInvestPct: +form.raiseInvestPct || 0,
    ret: +form.returnPct || 0,
    infl: +form.inflationPct || 0,
    years: +form.horizon || 10,
    wr: +form.wr || 4,
    currentAge: +form.currentAge || 30,
    fiBandStart: +form.fiBandStart || 40,
    fiBandEnd: +form.fiBandEnd || 50,
    sims: +form.sims || 120,
    volatility: +form.volatility || 12,
    taxDrag: +form.taxDrag || 1,
  }), [form]);

  const output = useMemo(() => {
    const { d, l } = project(base);
    const annualSave = base.income * (base.saveRate / 100);
    const fiTarget = annualSave / ((base.wr || 4) / 100);
    const fiYear = d.findIndex((v) => v >= fiTarget);
    const fiAge = fiYear === -1 ? `${base.currentAge + base.years}+` : `${base.currentAge + fiYear}`;
    const fiAgeNum = fiYear === -1 ? null : base.currentAge + fiYear;

    return {
      d, l, fiTarget, fiYear, fiAge, fiAgeNum,
      driftCost: d[d.length - 1] - l[l.length - 1],
      delta10: d[Math.min(10, d.length - 1)] - l[Math.min(10, l.length - 1)],
      sA: scenarioFinal(base, { ret: 6, saveRate: 22, raiseInvestPct: 55, raisePct: 4 }),
      sB: scenarioFinal(base, { ret: 7, saveRate: 28, raiseInvestPct: 70, raisePct: 5 }),
      sC: scenarioFinal(base, { ret: 9, saveRate: 35, raiseInvestPct: 90, raisePct: 6 }),
    };
  }, [base]);

  const fiBandStatus = useMemo(() => {
    if (output.fiAgeNum === null) return 'Outside model horizon';
    if (output.fiAgeNum < base.fiBandStart) return 'Ahead of band';
    if (output.fiAgeNum > base.fiBandEnd) return 'Behind band';
    return 'Inside target band';
  }, [output, base]);

  const onChange = (key, value) => setForm((s) => ({ ...s, [key]: value }));

  const runMonteCarlo = () => {
    const finals = [];
    for (let i = 0; i < base.sims; i++) {
      let nw = base.nw;
      let income = base.income;
      for (let y = 0; y < base.years; y++) {
        income *= 1 + base.raisePct / 100;
        const annualSave = income * (base.saveRate / 100);
        const shock = randn() * (base.volatility / 100);
        const netReturn = (base.ret - base.infl - base.taxDrag) / 100 + shock;
        nw = nw * (1 + netReturn) + annualSave;
      }
      finals.push(nw);
    }
    finals.sort((a, b) => a - b);
    setMc({ p10: currency(percentile(finals, 0.1)), p50: currency(percentile(finals, 0.5)), p90: currency(percentile(finals, 0.9)) });
  };

  const ranked = [
    { name: 'A', value: output.sA },
    { name: 'B', value: output.sB },
    { name: 'C', value: output.sC },
  ].sort((a, b) => b.value - a.value);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>WealthArc Mobile</Text>
      <Text style={styles.sub}>Reworked charts to match the web-style trajectory look.</Text>

      <TrajectoryChart disciplined={output.d} drift={output.l} fiYear={output.fiYear} />
      <ScenarioBarChart a={output.sA} b={output.sB} c={output.sC} />

      <View style={styles.card}>
        <Text style={styles.h2}>FIRE Snapshot</Text>
        <Text style={styles.metric}>FI Target: <Text style={styles.strong}>{currency(output.fiTarget)}</Text></Text>
        <Text style={styles.metric}>Disciplined Final: <Text style={styles.strong}>{currency(output.d[output.d.length - 1])}</Text></Text>
        <Text style={styles.metric}>Drift Final: <Text style={styles.strong}>{currency(output.l[output.l.length - 1])}</Text></Text>
        <Text style={styles.metric}>Drift Cost: <Text style={styles.strong}>{currency(output.driftCost)}</Text></Text>
        <Text style={styles.metric}>FI Age: <Text style={styles.strong}>{output.fiAge}</Text></Text>
        <Text style={styles.metric}>FI Band: <Text style={styles.strong}>{fiBandStatus}</Text></Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Scenario Ranking</Text>
        {ranked.map((row, i) => (
          <Text key={row.name} style={styles.metric}>#{i + 1} Scenario {row.name}: <Text style={styles.strong}>{currency(row.value)}</Text></Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Monte Carlo</Text>
        <View style={styles.rowLine}><Text style={styles.label}>Sims</Text><TextInput keyboardType="numeric" value={form.sims} onChangeText={(t) => onChange('sims', t)} style={styles.inputMini} /></View>
        <View style={styles.rowLine}><Text style={styles.label}>Volatility %</Text><TextInput keyboardType="numeric" value={form.volatility} onChangeText={(t) => onChange('volatility', t)} style={styles.inputMini} /></View>
        <View style={styles.rowLine}><Text style={styles.label}>Tax Drag %</Text><TextInput keyboardType="numeric" value={form.taxDrag} onChangeText={(t) => onChange('taxDrag', t)} style={styles.inputMini} /></View>
        <Pressable style={styles.btn} onPress={runMonteCarlo}><Text style={styles.btnText}>Run Monte Carlo</Text></Pressable>
        <Text style={styles.metric}>P10: <Text style={styles.strong}>{mc.p10}</Text></Text>
        <Text style={styles.metric}>P50: <Text style={styles.strong}>{mc.p50}</Text></Text>
        <Text style={styles.metric}>P90: <Text style={styles.strong}>{mc.p90}</Text></Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Core Inputs</Text>
        {[
          ['Net Worth', 'netWorth'], ['Income', 'income'], ['Save Rate %', 'saveRate'], ['Raise %', 'raisePct'],
          ['Raise Invested %', 'raiseInvestPct'], ['Return %', 'returnPct'], ['Inflation %', 'inflationPct'], ['Horizon', 'horizon'],
          ['Current Age', 'currentAge'], ['FI Band Start', 'fiBandStart'], ['FI Band End', 'fiBandEnd'],
        ].map(([label, key]) => (
          <View style={styles.field} key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput keyboardType="numeric" value={form[key]} onChangeText={(t) => onChange(key, t)} style={styles.input} />
          </View>
        ))}
      </View>

      <StatusBar style="light" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D12' },
  wrap: { padding: 14, gap: 12 },
  title: { color: '#EAF0FF', fontSize: 28, fontWeight: '800' },
  sub: { color: '#AAB4CC', marginBottom: 6 },
  card: { backgroundColor: '#131722', borderColor: '#232B3D', borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  chartWrap: { backgroundColor: '#131722', borderColor: '#232B3D', borderWidth: 1, borderRadius: 14, padding: 10 },
  chartTitle: { color: '#EAF0FF', fontWeight: '700', marginBottom: 8 },
  legendRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  legend: { fontSize: 12, fontWeight: '600' },
  h2: { color: '#EAF0FF', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  field: { marginBottom: 6 },
  label: { color: '#AAB4CC', fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: '#0F131C', color: '#EAF0FF', borderRadius: 8, borderColor: '#2A3450', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  inputMini: { width: 100, backgroundColor: '#0F131C', color: '#EAF0FF', borderRadius: 8, borderColor: '#2A3450', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  metric: { color: '#C9D3EA', fontSize: 14, marginBottom: 2 },
  strong: { color: '#9EE493', fontWeight: '700' },
  rowLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: { marginTop: 8, marginBottom: 8, backgroundColor: '#273A68', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnText: { color: '#EAF0FF', fontWeight: '700' },
  barTrack: { height: 10, backgroundColor: '#1D2640', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 999 },
});
