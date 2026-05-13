(function () {

  function $(s) { return document.querySelector(s); }
  function $all(s) { return Array.from(document.querySelectorAll(s)); }

  /* ---------- Drag state ---------- */
  let draggedSeed = null;

  /* ---------- Seeds UI ---------- */

  function makeSeed(n) {
    const d = document.createElement('div');
    d.className = 'seed';
    d.textContent = n;
    d.draggable = true;

    d.addEventListener('dragstart', () => {
      draggedSeed = d;
      d.style.opacity = '0.5';
    });

    d.addEventListener('dragend', () => {
      draggedSeed = null;
      d.style.opacity = '1';
    });

    d.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    d.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedSeed || draggedSeed === d) return;

      const container = $('#seeds');
      const nodes = Array.from(container.children);
      const from = nodes.indexOf(draggedSeed);
      const to = nodes.indexOf(d);

      if (from > -1 && to > -1) {
        container.insertBefore(
          draggedSeed,
          from < to ? d.nextSibling : d
        );
      }
    });

    return d;
  }

  function resetSeeds() {
    const n = +$('#n').value;
    const c = $('#seeds');
    c.innerHTML = '';
    for (let i = 1; i <= n; i++) c.appendChild(makeSeed(i));
  }

  /* ---------- Round-robin core (correct circle method) ---------- */

  function circleMethod(seeds) {
    let arr = [...seeds];
    if (arr.length % 2) arr.push('BYE');

    const n = arr.length;
    const rounds = [];

    for (let r = 0; r < n - 1; r++) {
      const pairs = [];

      for (let i = 0; i < n / 2; i++) {
        const a = arr[i];
        const b = arr[n - 1 - i];
        // ✅ include BYE explicitly
        pairs.push([a, b]);
      }

      rounds.push(pairs);

      // keep first fixed, rotate rest clockwise
      const fixed = arr[0];
      const rest = arr.slice(1);
      rest.unshift(rest.pop());
      arr = [fixed, ...rest];
    }

    return rounds;
  }

  /* ---------- Baseline reordering (Yearbook-aligned) ---------- */

  function findOpponent(round, seed) {
    for (const [a, b] of round) {
      if (a === seed) return b;
      if (b === seed) return a;
    }
    return null;
  }

  function bucketize(rounds, seeds) {
    const s1 = seeds[0];
    const n = seeds.length;
    const buckets = { easy: [], mid: [], hard: [], final: [] };

    for (const r of rounds) {
      const opp = findOpponent(r, s1);
      if (opp === seeds[1]) {
        buckets.final.push(r);
        continue;
      }
      if (opp === 'BYE') {
        buckets.easy.push(r);
        continue;
      }
      const idx = seeds.indexOf(opp);
      if (idx >= Math.floor(2 * n / 3)) buckets.easy.push(r);
      else if (idx <= Math.floor(n / 4)) buckets.hard.push(r);
      else buckets.mid.push(r);
    }

    return buckets;
  }

  function reorderBaseline(rounds, seeds) {
    const templates = {
      5:  ['mid','easy','mid','hard','final'],
      6:  ['mid','easy','mid','hard','final'],
      7:  ['mid','easy','mid','mid','hard','final'],
      8:  ['mid','mid','easy','mid','hard','mid','final'],
      9:  ['mid','easy','mid','mid','easy','hard','mid','final'],
      10: ['mid','easy','mid','mid','easy','hard','hard','mid','final']
    };

    const plan = templates[seeds.length];
    const buckets = bucketize(rounds, seeds);

    const b = {
      easy: [...buckets.easy],
      mid: [...buckets.mid],
      hard: [...buckets.hard],
      final: [...buckets.final]
    };

    const ordered = [];
    const take = k => b[k].length ? b[k].shift() : null;

    for (const key of plan) {
      let r = take(key) || take('mid') || take('easy') || take('hard');
      if (r) ordered.push(r);
    }

    Object.values(b).forEach(arr => arr.forEach(r => ordered.push(r)));

    // force 1 v 2 final
    const idx = ordered.findIndex(
      r => findOpponent(r, seeds[0]) === seeds[1]
    );
    if (idx > -1) ordered.push(ordered.splice(idx, 1)[0]);

    return ordered;
  }

  /* ---------- Generate & render ---------- */

  function generate() {
    const seeds = $all('#seeds .seed').map(x => +x.textContent);

    let rounds = circleMethod(seeds);
    rounds = reorderBaseline(rounds, seeds);

    const thead = $('#schedule thead');
    const tbody = $('#schedule tbody');

    thead.innerHTML = '<tr><th>Round</th><th>Pairings</th></tr>';
    tbody.innerHTML = '';

    rounds.forEach((r, i) => {
      const tr = document.createElement('tr');
      const text = r.map(p => `${p[0]} v ${p[1]}`).join('   ');
      tr.innerHTML = `<td>${i + 1}</td><td>${text}</td>`;
      tbody.appendChild(tr);
    });
  }

  function downloadScheduleCSV() {
  const rows = [];
  const table = document.getElementById('schedule');
  const trs = table.querySelectorAll('tr');

  trs.forEach((tr, idx) => {
    const cells = Array.from(tr.querySelectorAll('th,td'))
      .map(td => `"${td.innerText.replace(/"/g, '""')}"`);
    rows.push(cells.join(','));
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'Order_of_Play_Schedule.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

  /* ---------- Init ---------- */

  function init() {
    resetSeeds();
    $('#resetBtn').onclick = resetSeeds;
    $('#genBtn').onclick = generate;
    $('#downloadBtn').onclick = downloadScheduleCSV;
    $('#n').onchange = resetSeeds;
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();

})();