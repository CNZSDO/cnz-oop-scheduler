(function(){
  'use strict';
  function $(s,d){return (d||document).querySelector(s);} 
  function $all(s,d){return Array.from((d||document).querySelectorAll(s));}
  // Seeds UI
  function makeSeed(n){ var d=document.createElement('div'); d.className='seed'; d.textContent=n; d.draggable=true;
    d.addEventListener('dragstart', function(e){ d.classList.add('drag'); e.dataTransfer.setData('text/plain', String(n)); });
    d.addEventListener('dragend', function(){ d.classList.remove('drag'); });
    d.addEventListener('dragover', function(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; });
    d.addEventListener('drop', function(e){ e.preventDefault(); var from=+e.dataTransfer.getData('text/plain'); var tiles=$all('#seeds .seed'); var arr=tiles.map(function(x){return +x.textContent;}); var to=+d.textContent; var fromIdx=arr.indexOf(from), toIdx=arr.indexOf(to); arr.splice(toIdx,0,arr.splice(fromIdx,1)[0]); var c=$('#seeds'); c.innerHTML=''; arr.forEach(function(x){ c.appendChild(makeSeed(x)); }); });
    return d; }
  function resetSeeds(){ var n=+$('#n').value; var c=$('#seeds'); c.innerHTML=''; for(var i=1;i<=n;i++){ c.appendChild(makeSeed(i)); } }

  // Round-robin baseline via circle method (guarantees full coverage)
  function circleMethodOrder(seeds){
    var n=seeds.length; var odd=(n%2===1); var arr=seeds.slice();
    if(odd){ arr.push('BYE'); n++; }
    var R=n-1, half=n/2, rounds=[];
    for(var r=0;r<R;r++){
      var rd=[];
      for(var i=0;i<half;i++){
        var a=arr[i], b=arr[n-1-i];
        if(a!=='BYE' && b!=='BYE') rd.push([a,b]);
        else if(a==='BYE' && b!=='BYE') rd.push([b,'BYE']);
        else if(b==='BYE' && a!=='BYE') rd.push([a,'BYE']);
      }
      rounds.push(rd);
      // rotate, keep first fixed
      var fixed=arr[0]; var rest=arr.slice(1); rest.unshift(rest.pop()); arr=[fixed].concat(rest);
    }
    return rounds;
  }
  function ensureLastRound1v2(rounds, seeds){
    var s1=seeds[0], s2=seeds[1];
    var R=rounds.length; var idx=-1;
    for(var r=0;r<R;r++){
      for(var i=0;i<rounds[r].length;i++){
        var p=rounds[r][i]; if((p[0]===s1&&p[1]===s2)||(p[0]===s2&&p[1]===s1)){ idx=r; break; }
      }
      if(idx!==-1) break;
    }
    if(idx!==-1 && idx!==R-1){ var head=rounds.slice(0,idx); var tail=rounds.slice(idx); rounds=tail.concat(head); }
    return rounds;
  }
  function tryPinR1(rounds, seeds){
    var n=seeds.length; var s=seeds.slice(); var want=null;
    if(n===10) want=[[s[0],s[5]],[s[1],s[6]],[s[2],s[7]],[s[3],s[8]],[s[4],s[9]]];
    else if(n===9) want=[[s[0],s[5]],[s[1],s[6]],[s[2],s[7]],[s[3],s[8]]];
    else if(n===8) want=[[s[0],s[4]],[s[1],s[5]],[s[2],s[6]],[s[3],s[7]]];
    else if(n===7) want=[[s[0],s[4]],[s[1],s[5]],[s[2],s[6]]];
    else if(n===6) want=[[s[0],s[3]],[s[1],s[4]],[s[2],s[5]]];
    else if(n===5) want=[[s[0],s[3]],[s[1],s[4]]];
    if(!want) return rounds;
    function eq(a,b){return (a[0]===b[0]&&a[1]===b[1])||(a[0]===b[1]&&a[1]===b[0]);}
    function containsAll(round, w){ for(var i=0;i<w.length;i++){ var ok=false; for(var j=0;j<round.length;j++){ if(eq(round[j],w[i])){ok=true;break;} } if(!ok) return false; } return true; }
    if(containsAll(rounds[0], want)) return rounds;
    for(var r=1;r<rounds.length-1;r++){ if(containsAll(rounds[r], want)){ var tmp=rounds[0]; rounds[0]=rounds[r]; rounds[r]=tmp; break; } }
    return rounds;
  }

  function generate(){
    var n=+$('#n').value; var mode=$('#mode').value; var settling=$('#settling').checked; var avoidTop4=$('#avoidTop4').checked;
    var seeds=$all('#seeds .seed').map(function(x){return +x.textContent}); if(seeds.length!==n){ resetSeeds(); seeds=$all('#seeds .seed').map(function(x){return +x.textContent}); }

    // 1) Baseline RR (full coverage)
    var rounds=circleMethodOrder(seeds);
    // 2) 1 v 2 last
    rounds=ensureLastRound1v2(rounds,seeds);
    // 3) Try pin R1
    rounds=tryPinR1(rounds,seeds);
    // 4) Light settling / avoidTop4 swap (no pair drops)
    if(settling||avoidTop4){
      var s1=seeds[0], s3=seeds[2], s4=seeds[3];
      function has1v34(r){ for(var i=0;i<rounds[r].length;i++){ var p=rounds[r][i]; if((p[0]===s1&&(p[1]===s3||p[1]===s4))||(p[1]===s1&&(p[0]===s3||p[0]===s4))) return i; } return -1; }
      var bad=has1v34(0);
      if(bad!==-1){ for(var r=1;r<Math.max(2,Math.floor(rounds.length/2));r++){
        for(var i=0;i<rounds[r].length;i++){
          var p=rounds[r][i]; var top4=[seeds[0],seeds[1],seeds[2]||-1,seeds[3]||-1];
          var isT4=top4.indexOf(p[0])!==-1 || top4.indexOf(p[1])!==-1; if(!isT4){ var tmp=rounds[0][bad]; rounds[0][bad]=rounds[r][i]; rounds[r][i]=tmp; r=1e9; break; }
        }
      } }
    }

    // Render schedule
    var tbl=$('#schedule'); var thead=tbl.tHead||tbl.createTHead(); thead.innerHTML=''; var tbody=tbl.tBodies[0]||tbl.createTBody(); tbody.innerHTML='';
    var hr=thead.insertRow(); ['Round','Pairings'].forEach(function(h){ var th=document.createElement('th'); th.textContent=h; hr.appendChild(th); });
    var R=rounds.length;
    for(var rr=0; rr<R; rr++){
      var row=tbody.insertRow(); row.insertCell().textContent=(rr+1);
      var pairs=rounds[rr].slice();
      if(seeds.length%2===1){ // append BYE to show who rests
        var used={}; for(var i=0;i<pairs.length;i++){ used[pairs[i][0]]=1; used[pairs[i][1]]=1; }
        for(var k=0;k<seeds.length;k++){ var s=seeds[k]; if(!used[s]){ pairs.push([s,'BYE']); break; } }
      }
      row.insertCell().textContent = pairs.map(function(p){ return p[0]+'–'+p[1]; }).join('   ');
    }

    // Exports (use ' v ' joiner)
    var csv='Round,Pairings\n'; var tsv='Round\tPairings\n';
    for(var rr=0; rr<R; rr++){
      var pairs=rounds[rr].slice();
      if(seeds.length%2===1){ var used={}; for(var i=0;i<pairs.length;i++){ used[pairs[i][0]]=1; used[pairs[i][1]]=1; }
        for(var k=0;k<seeds.length;k++){ var s=seeds[k]; if(!used[s]){ pairs.push([s,'BYE']); break; } }
      }
      var joined=pairs.map(function(p){ return p[0]+' v '+p[1]; }).join('   ');
      csv += (rr+1)+',"'+joined+'"\n';
      tsv += (rr+1)+'\t'+joined+'\n';
    }
    $('#csvbox').value=csv; $('#tsvbox').value=tsv; $('#exportPanel').style.display='block';
  }

  function printPdf(){ window.print(); }
  function downloadCsv(){ var csv=$('#csvbox').value; var a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='CNZ_OoP_schedule.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){document.body.removeChild(a);},0); }
  function downloadTsv(){ var tsv=$('#tsvbox').value; var a=document.createElement('a'); a.href='data:text/tab-separated-values;charset=utf-8,'+encodeURIComponent(tsv); a.download='CNZ_OoP_schedule.tsv'; document.body.appendChild(a); a.click(); setTimeout(function(){document.body.removeChild(a);},0); }

  function init(){ resetSeeds(); $('#resetBtn').addEventListener('click', resetSeeds); $('#genBtn').addEventListener('click', generate); $('#printBtn').addEventListener('click', printPdf); $('#downloadCsv').addEventListener('click', function(e){ e.preventDefault(); downloadCsv(); }); $('#downloadTsv').addEventListener('click', function(e){ e.preventDefault(); downloadTsv(); }); }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
