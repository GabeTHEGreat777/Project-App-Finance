import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

export default function App() {
  const [form, setForm] = useState({
    netWorth: '50000',
    income: '100000',
    saveRate: '25',
    raisePct: '5',
    raiseInvestPct: '70',
    returnPct: '7',
    inflationPct: '2.5',
    horizon: '10',
    wr: '4',
    currentAge: '30',
    fiBandStart: '40',
    fiBandEnd: '50',
    sims: '120',
    volatility: '12',
    taxDrag: '1',
  });

  const [mc, setMc] = useState({ p10: '--', p50: '--', p90: '--' });

  const base = useMemo(
    () => ({
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
    }),
    [form]
  );

  const output = useMemo(() => {
    const { d, l } = project(base);
    const annualSave = base.income * (base.saveRate / 100);
    const fiTarget = annualSave / ((base.wr || 4) / 100);
    const fiYear = d.findIndex((v) => v >= fiTarget);
    const fiAge = fiYear === -1 ? `${base.currentAge + base.years}+` : `${base.currentAge + fiYear}`;
    const fiAgeNum = fiYear === -1 ? null : base.currentAge + fiYear;

    return {
      d,
      l,
      fiTarget,
      driftCost: d[d.length - 1] - l[l.length - 1],
      delta10: d[Math.min(10, d.length - 1)] - l[Math.min(10, l.length - 1)],
      fiYear,
      fiAge,
      fiAgeNum,
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
    setMc({
      p10: currency(percentile(finals, 0.1)),
      p50: currency(percentile(finals, 0.5)),
      p90: currency(percentile(finals, 0.9)),
    });
  };

  const scenarioRows = [
    { name: 'A', value: output.sA },
    { name: 'B', value: output.sB },
    { name: 'C', value: output.sC },
  ];

  const ranked = [...scenarioRows].sort((a, b) => b.value - a.value);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>WealthArc (Expo Go)</Text>
      <Text style={styles.sub}>Phase 2 mobile: FIRE + scenarios + Monte Carlo preview.</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>Inputs</Text>
        {[
          ['Current Net Worth', 'netWorth'],
          ['Annual Income', 'income'],
          ['Savings Rate %', 'saveRate'],
          ['Raise %', 'raisePct'],
          ['Raise Invested %', 'raiseInvestPct'],
          ['Return %', 'returnPct'],
          ['Inflation %', 'inflationPct'],
          ['Horizon (years)', 'horizon'],
          ['Withdrawal Rate %', 'wr'],
          ['Current Age', 'currentAge'],
          ['FI Band Start Age', 'fiBandStart'],
          ['FI Band End Age', 'fiBandEnd'],
        ].map(([label, key]) => (
          <View style={styles.field} key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput keyboardType="numeric" value={form[key]} onChangeText={(t) => onChange(key, t)} style={styles.input} />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>FIRE Outputs</Text>
        <Text style={styles.metric}>FI Target: <Text style={styles.strong}>{currency(output.fiTarget)}</Text></Text>
        <Text style={styles.metric}>Projected Final (Disciplined): <Text style={styles.strong}>{currency(output.d[output.d.length - 1])}</Text></Text>
        <Text style={styles.metric}>Projected Final (Drift): <Text style={styles.strong}>{currency(output.l[output.l.length - 1])}</Text></Text>
        <Text style={styles.metric}>Current Drift Cost: <Text style={styles.strong}>{currency(output.driftCost)}</Text></Text>
        <Text style={styles.metric}>10Y Delta: <Text style={styles.strong}>{currency(output.delta10)}</Text></Text>
        <Text style={styles.metric}>Estimated FI Age: <Text style={styles.strong}>{output.fiAge}</Text></Text>
        <Text style={styles.metric}>FI Countdown: <Text style={styles.strong}>{output.fiYear === -1 ? 'Beyond horizon' : `${output.fiYear}y`}</Text></Text>
        <Text style={styles.metric}>FI Band Status: <Text style={styles.strong}>{fiBandStatus}</Text></Text>
        <Text style={styles.metric}>Raise Split (invest/spend): <Text style={styles.strong}>{base.raiseInvestPct}% / {Math.max(0, 100 - base.raiseInvestPct)}%</Text></Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Scenario Ranking</Text>
        {ranked.map((row, idx) => (
          <Text key={row.name} style={styles.metric}>#{idx + 1} Scenario {row.name}: <Text style={styles.strong}>{currency(row.value)}</Text></Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Scenario Diff Table (vs B)</Text>
        {scenarioRows.map((row) => (
          <View key={row.name} style={styles.rowLine}>
            <Text style={styles.metric}>Scenario {row.name}</Text>
            <Text style={styles.metric}>{currency(row.value - output.sB)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Monte Carlo Preview</Text>
        <View style={styles.rowLine}><Text style={styles.label}>Simulations</Text><TextInput keyboardType="numeric" value={form.sims} onChangeText={(t) => onChange('sims', t)} style={styles.inputMini} /></View>
        <View style={styles.rowLine}><Text style={styles.label}>Volatility %</Text><TextInput keyboardType="numeric" value={form.volatility} onChangeText={(t) => onChange('volatility', t)} style={styles.inputMini} /></View>
        <View style={styles.rowLine}><Text style={styles.label}>Tax Drag %</Text><TextInput keyboardType="numeric" value={form.taxDrag} onChangeText={(t) => onChange('taxDrag', t)} style={styles.inputMini} /></View>
        <Pressable style={styles.btn} onPress={runMonteCarlo}><Text style={styles.btnText}>Run Monte Carlo</Text></Pressable>
        <Text style={styles.metric}>P10: <Text style={styles.strong}>{mc.p10}</Text></Text>
        <Text style={styles.metric}>P50: <Text style={styles.strong}>{mc.p50}</Text></Text>
        <Text style={styles.metric}>P90: <Text style={styles.strong}>{mc.p90}</Text></Text>
      </View>

      <StatusBar style="light" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D12' },
  wrap: { padding: 14, gap: 12 },
  title: { color: '#EAF0FF', fontSize: 28, fontWeight: '700' },
  sub: { color: '#AAB4CC', marginBottom: 6 },
  card: { backgroundColor: '#131722', borderColor: '#232B3D', borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
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
});
