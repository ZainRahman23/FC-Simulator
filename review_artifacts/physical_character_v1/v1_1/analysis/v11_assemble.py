# assemble ANATOMY_V1_1_REPORT.md/.html from the prose source + generated tables + final JSON values
import json, os, re, sys, markdown
SP, OUT = sys.argv[1], sys.argv[2]; F = os.path.join(OUT, "json/final")
src = open(os.path.join(SP, "v11_report_src.md")).read(); tab = open(os.path.join(SP, "v11_tables.md")).read()
secs = {}; cur = None
for line in tab.split("\n"):
    if line.startswith("### "): cur = line[4:]; secs[cur] = [line]
    elif line.startswith("**Determinism:**"): secs["__det"] = [line]; cur = None
    elif cur: secs[cur].append(line)
def table(prefix):
    k = [k for k in secs if k.startswith(prefix)]; assert k, prefix; return "\n".join(secs[k[0]]).strip()
src = re.sub(r"\{\{TABLE:([^}]+)\}\}", lambda m: table(m.group(1)), src)
J = lambda f: json.load(open(os.path.join(F, f)))
d11 = {r['test']: r for r in J('gatec2_V1.1_recal_diag.json')['results']}; dv1 = {r['test']: r for r in J('gatec2_V1.json')['results']}
sl = [q for q in d11['B_hold_R']['requests'] if q['type'] != 'shift'][0]['singleLeg']
A11 = {r['drop']: r for r in J('gatea_V1.1.json')['results']}
def status(r): qs = [q for q in r['requests'] if q['type'] != 'shift']; return all(q['status'] == 'DONE' for q in qs) and not r['fell']
same = [t for t in dv1 if t != 'A_shift' and status(d11[t]) and (status(dv1[t]) or t == 'J_repeat')]
notok = [t for t in d11 if not status(d11[t]) and t != 'I_block']
d1s = f"{len(same)} of the 13 placement/lift tests complete (J_repeat 6/6, V1 5/6); I_block is blocked and held as in V1; {', '.join(notok) or 'none'} lose balance in acceptance"
xrt = [l for l in open(os.path.join(OUT, "crossruntime.txt")) if l.startswith("cross-runtime")][0].strip().replace("cross-runtime: ", "")
vals = {"SL_V11_MEAN": sl['hipAbductionNm']['mean'], "SL_V11_PCT": sl['hipAbductionPctOfLimit'], "A_EGAIN": A11['A']['energyGain']['maxJ'], "A_ELBOW": A11['A']['maxSoftStopOvershootDeg'],
        "D1_SUMMARY": d1s, "XRT": f"**{xrt}**", "DET": secs["__det"][0]}
for k, v in vals.items(): src = src.replace("{{" + k + "}}", str(v))
assert "{{" not in src, re.findall(r"\{\{[^}]+\}\}", src)
open(os.path.join(OUT, "ANATOMY_V1_1_REPORT.md"), "w").write(src)
head = open(os.path.join(OUT, "../gate_c2/GATE_C2_REPORT.html")).read().split("<body")[0].replace("<title>Gate C2 Report</title>", "<title>Anatomy V1.1 Report</title>")
body = markdown.markdown(src, extensions=["tables", "fenced_code"])
open(os.path.join(OUT, "ANATOMY_V1_1_REPORT.html"), "w").write(head + "<body><main>" + body + "</main></body></html>")
print("ok", len(src), vals["D1_SUMMARY"], vals["XRT"])
