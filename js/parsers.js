/* =========================================================
   parsers.js — turns messy real-world school workbooks into
   clean JS records. Everything here runs in the browser only.
   ========================================================= */
const Parsers = (() => {

  function readFileAsWorkbook(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try{
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: "array", cellDates: true });
          resolve(wb);
        }catch(err){ reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function sheetRows(ws){
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  }

  function norm(s){
    return String(s ?? "").replace(/\s+/g," ").trim();
  }
  function slug(s){
    return norm(s).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  }

  // find the row index whose cells satisfy every matcher (regex tested against normalized text of the row)
  function findHeaderRowIndex(rows, mustMatch, scanLimit = 12){
    const limit = Math.min(rows.length, scanLimit);
    for(let i=0;i<limit;i++){
      const row = rows[i] || [];
      const text = row.map(norm).join(" | ").toLowerCase();
      if(mustMatch.every(re => re.test(text))) return i;
    }
    return -1;
  }

  function findCol(headerRow, patterns){
    for(let j=0;j<headerRow.length;j++){
      const h = norm(headerRow[j]).toLowerCase();
      if(!h) continue;
      for(const re of patterns){ if(re.test(h)) return j; }
    }
    return -1;
  }

  function toNum(v){
    if(v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /* ---------------- Student Registry ---------------- */
  function parseStudentRegistry(workbook, fileName){
    const out = [];
    workbook.SheetNames.forEach(sheetName => {
      const rows = sheetRows(workbook.Sheets[sheetName]);
      const headerIdx = findHeaderRowIndex(rows, [/s\/n/, /class/, /gender|sex/]);
      if(headerIdx === -1) return;
      const header = rows[headerIdx];
      const cSurname = findCol(header, [/surname/, /last\s*name/]);
      const cFirst   = findCol(header, [/first\s*name/]);
      const cOther   = findCol(header, [/other\s*name/, /middle\s*name/]);
      const cFullName= findCol(header, [/^name$/, /full\s*name/, /student\s*name/, /learner\s*name/]);
      const cClass   = findCol(header, [/class/, /grade/]);
      const cGender  = findCol(header, [/gender|sex/]);
      const cComment = findCol(header, [/comment|remark/]);

      if(cSurname === -1 && cFullName === -1) return; // not a real registry sheet

      for(let i=headerIdx+1;i<rows.length;i++){
        const r = rows[i] || [];
        const surname = cSurname>-1 ? norm(r[cSurname]) : "";
        const first = cFirst>-1 ? norm(r[cFirst]) : "";
        const other = cOther>-1 ? norm(r[cOther]) : "";
        const full = cFullName>-1 ? norm(r[cFullName]) : "";
        const name = full || [surname, first, other].filter(Boolean).join(" ");
        if(!name) continue;
        out.push({
          surname: surname || null,
          firstname: first || null,
          othername: other || null,
          name,
          class: cClass>-1 ? norm(r[cClass]) : norm(sheetName),
          gender: cGender>-1 ? norm(r[cGender]).toUpperCase() : null,
          comment: cComment>-1 ? norm(r[cComment]) : null,
          source: `${fileName} — ${sheetName}`
        });
      }
    });
    return out;
  }

  /* ---------------- Marking Sheet ---------------- */
  function parseMarkingSheet(workbook, fileName){
    const out = [];
    workbook.SheetNames.forEach(sheetName => {
      const rows = sheetRows(workbook.Sheets[sheetName]);
      const headerIdx = findHeaderRowIndex(rows, [/name/, /gender|sex/, /class/]);
      if(headerIdx === -1) return;
      const header = rows[headerIdx];
      const cName = findCol(header, [/name/]);
      const cGender = findCol(header, [/gender|sex/]);
      const cClass = findCol(header, [/class/]);
      const cAttendance = findCol(header, [/attendance/]);
      const cNotebook = findCol(header, [/notebook/]);
      const cOpenday = findCol(header, [/open\s*day/]);
      const cTextbook = findCol(header, [/textbook/]);
      const cSchoolBase = findCol(header, [/school\s*base/]);
      const cTeacherBase = findCol(header, [/teacher\s*base/]);
      const cCaTotal = findCol(header, [/ca\s*total/]);
      const cCaHalf = findCol(header, [/ca\s*\/?\s*2/]);
      const cExam = findCol(header, [/exam/]);
      const cTotal = findCol(header, [/total\s*score/, /grand\s*total/]);
      if(cName === -1) return;

      const termGuess = (sheetName.match(/\d\w*\s*TERM/i) || [null])[0];
      const classGuess = norm(sheetName.replace(termGuess || "", ""));

      for(let i=headerIdx+1;i<rows.length;i++){
        const r = rows[i] || [];
        const name = norm(r[cName]);
        if(!name) continue;
        out.push({
          sheet: sheetName,
          file: fileName,
          term: termGuess ? norm(termGuess) : null,
          class: cClass>-1 ? norm(r[cClass]) : classGuess,
          name,
          gender: cGender>-1 ? norm(r[cGender]).toUpperCase() : null,
          attendance: toNum(r[cAttendance]),
          notebook: toNum(r[cNotebook]),
          openday: toNum(r[cOpenday]),
          textbook: toNum(r[cTextbook]),
          schoolBase: toNum(r[cSchoolBase]),
          teacherBase: toNum(r[cTeacherBase]),
          caTotal: toNum(r[cCaTotal]),
          caHalf: toNum(r[cCaHalf]),
          exam: toNum(r[cExam]),
          totalScore: toNum(r[cTotal])
        });
      }
    });
    return out;
  }

  /* ---------------- E-Result (per-class workbook, "... Db" sheets) ---------------- */
  function parseEResult(workbook, fileName){
    const out = [];
    const dbSheets = workbook.SheetNames.filter(n => /db\s*$/i.test(n));
    dbSheets.forEach(sheetName => {
      const rows = sheetRows(workbook.Sheets[sheetName]);
      const fieldIdx = findHeaderRowIndex(rows, [/s\/n/, /name/], 6);
      if(fieldIdx === -1 || fieldIdx === 0) return;
      const fieldHeader = rows[fieldIdx];
      const groupHeader = rows[fieldIdx-1] || [];
      const term = norm(sheetName).replace(/db\s*$/i, "").trim();
      const termOrdinal = (term.match(/^\d\w*/) || [""])[0].toLowerCase(); // e.g. "3rd"

      // base fields
      const cSn = findCol(fieldHeader, [/s\/n/]);
      const cName = findCol(fieldHeader, [/^name$/, /name/]);
      const cAdm = findCol(fieldHeader, [/admission/]);
      const cGender = findCol(fieldHeader, [/gender|sex/]);
      const cClass = findCol(fieldHeader, [/^class$/]);
      const cInClass = findCol(fieldHeader, [/no\s*of\s*students/]);
      const cOpened = findCol(fieldHeader, [/times\s*school\s*opened/]);
      const cPresent = findCol(fieldHeader, [/times\s*present/]);
      const cAbsent = findCol(fieldHeader, [/times\s*absent/]);

      // find subject blocks: a column j where groupHeader[j] is a small integer
      // and groupHeader[j+1] is a non-empty string (the subject name)
      const blockStarts = [];
      for(let j=0;j<groupHeader.length;j++){
        const num = groupHeader[j];
        const label = groupHeader[j+1];
        if(typeof num === "number" && Number.isInteger(num) && norm(label)){
          blockStarts.push({ col: j, subject: norm(label) });
        }
      }
      if(blockStarts.length === 0) return;

      for(let bi=0; bi<blockStarts.length; bi++){
        blockStarts[bi].end = bi+1 < blockStarts.length ? blockStarts[bi+1].col : fieldHeader.length;
      }

      const dataStart = fieldIdx + 1;
      for(let i=dataStart; i<rows.length; i++){
        const r = rows[i] || [];
        const name = cName>-1 ? norm(r[cName]) : "";
        if(!name) continue;

        const subjects = blockStarts.map(b => {
          const labels = fieldHeader.slice(b.col, b.end);
          let ca=null, exam=null, total=null, average=null;
          labels.forEach((lab, k) => {
            const l = norm(lab).toLowerCase();
            const val = toNum(r[b.col+k]);
            if(l.includes("c.a") || /\bca\b/.test(l)) ca = val;
            else if(l.includes("exam")) exam = val;
            else if(l.includes("average")) average = val;
            else if(l.includes("total")){
              if(termOrdinal && l.startsWith(termOrdinal)) total = val;
              else if(total === null && k === labels.findIndex(x=>norm(x).toLowerCase().includes("total"))) total = val;
            }
          });
          return { subject: b.subject, ca, exam, total, average };
        });

        out.push({
          file: fileName,
          sheet: sheetName,
          term: term || null,
          sn: cSn>-1 ? r[cSn] : null,
          name,
          admissionNo: cAdm>-1 ? norm(r[cAdm]) : null,
          gender: cGender>-1 ? norm(r[cGender]).toUpperCase() : null,
          class: cClass>-1 ? norm(r[cClass]) : fileName.replace(/\.[^.]+$/,""),
          studentsInClass: cInClass>-1 ? toNum(r[cInClass]) : null,
          timesOpened: cOpened>-1 ? toNum(r[cOpened]) : null,
          timesPresent: cPresent>-1 ? toNum(r[cPresent]) : null,
          timesAbsent: cAbsent>-1 ? toNum(r[cAbsent]) : null,
          subjects
        });
      }
    });
    return out;
  }

  /* ---------------- Staff Nominal Roll ---------------- */
  function parseStaffSheet(rows){
    const headerIdx = findHeaderRowIndex(rows, [/s\/n/, /name/], 10);
    if(headerIdx === -1) return [];
    const header = rows[headerIdx];
    const keys = header.map(h => slug(h));
    const out = [];
    for(let i=headerIdx+1;i<rows.length;i++){
      const r = rows[i] || [];
      const rec = {};
      let hasName = false;
      header.forEach((h, j) => {
        const key = keys[j] || `col_${j}`;
        let val = r[j];
        if(val instanceof Date) val = val.toISOString().slice(0,10);
        rec[key] = (val === undefined ? null : val);
        if(/name/.test(slug(h)) && norm(val)) hasName = true;
      });
      if(hasName) out.push(rec);
    }
    return out;
  }

  function parseStaffRoll(workbook, fileName){
    const result = { teaching: [], nonTeaching: [], corps: [] };
    workbook.SheetNames.forEach(sheetName => {
      const s = sheetName.toLowerCase();
      const rows = sheetRows(workbook.Sheets[sheetName]);
      if(s.includes("non-teaching") || s.includes("non teaching")){
        result.nonTeaching.push(...parseStaffSheet(rows).map(r=>({...r,_source:fileName})));
      }else if(s.includes("corp")){
        result.corps.push(...parseStaffSheet(rows).map(r=>({...r,_source:fileName})));
      }else if(s.includes("teaching")){
        result.teaching.push(...parseStaffSheet(rows).map(r=>({...r,_source:fileName})));
      }
    });
    return result;
  }

  /* ---------------- Auto-classify a workbook for bundle import ---------------- */
  function classifyWorkbook(workbook){
    const sheetNames = workbook.SheetNames.map(n => n.toLowerCase());

    if(sheetNames.some(n => n.includes("teaching staff") || n.includes("non-teaching") || n.includes("corp member"))){
      return "staff";
    }
    if(sheetNames.some(n => /db\s*$/.test(n))){
      return "results";
    }

    // Inspect the first sheet that has a recognisable header row
    for(const name of workbook.SheetNames){
      const rows = sheetRows(workbook.Sheets[name]);
      const headerIdx = findHeaderRowIndex(rows, [/name/, /gender|sex/], 10);
      if(headerIdx === -1) continue;
      const headerText = rows[headerIdx].map(norm).join(" | ").toLowerCase();
      if(/notebook|textbook|open\s*day|ca\s*total/.test(headerText)) return "marking";
      if(/surname|first\s*name|s\/n/.test(headerText)) return "students";
    }
    return "unknown";
  }

  return {
    readFileAsWorkbook, sheetRows, norm, slug, findHeaderRowIndex, findCol, toNum,
    parseStudentRegistry, parseMarkingSheet, parseEResult, parseStaffRoll, classifyWorkbook
  };
})();

if(typeof module !== "undefined" && module.exports){ module.exports = Parsers; }
