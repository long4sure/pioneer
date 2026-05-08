<?php
// =============================================================
// api/data.php  –  KPI Data save / load
// =============================================================
// All requests require X-Token header (viewer+ for GET, admin+ for POST).
//
// GET  ?module=finance&year=2026&month=4
// GET  ?module=all&year=2026&month=4       ← loads every module at once
// POST { "module":"finance","year":2026,"month":4, ...fields }
//
// Modules: finance | planning | procurement |
//          prod_util | prod_waste | prod_sched | warehouse
// =============================================================

require_once __DIR__ . '/config.php';
cors();

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET')       handleLoad();
elseif ($method === 'POST')  handleSave();
else fail('Method not allowed', 405);

// =============================================================
// LOAD
// =============================================================
function handleLoad(): never {
    $sess   = requireAuth('viewer');
    $module = $_GET['module'] ?? '';
    $year   = (int)($_GET['year']  ?? 0);
    $month  = (int)($_GET['month'] ?? 0);
    if ($year < 2020 || $year > 2040) fail('Invalid year');
    if ($month < 1   || $month > 12)  fail('Invalid month');

    $pid = getPeriodId($year, $month);

    $data = match($module) {
        'finance'     => loadFinance($pid),
        'planning'    => loadPlanning($pid),
        'procurement' => loadProcurement($pid),
        'prod_util'   => loadProdUtil($pid),
        'prod_waste'  => loadProdWaste($pid),
        'prod_sched'  => loadProdSched($pid),
        'warehouse'   => loadWarehouse($pid),
        'all'         => [
            'finance'     => loadFinance($pid),
            'planning'    => loadPlanning($pid),
            'procurement' => loadProcurement($pid),
            'prod_util'   => loadProdUtil($pid),
            'prod_waste'  => loadProdWaste($pid),
            'prod_sched'  => loadProdSched($pid),
            'warehouse'   => loadWarehouse($pid),
        ],
        default => null,
    };
    if ($data === null) fail("Unknown module: $module");
    ok(['year' => $year, 'month' => $month, 'data' => $data]);
}

// =============================================================
// SAVE
// =============================================================
function handleSave(): never {
    $sess   = requireAuth('admin');
    $b      = body();
    $module = $b['module'] ?? '';
    $year   = (int)($b['year']  ?? 0);
    $month  = (int)($b['month'] ?? 0);
    if ($year < 2020 || $year > 2040) fail('Invalid year');
    if ($month < 1   || $month > 12)  fail('Invalid month');

    $pid = getOrCreatePeriod($year, $month);
    $uid = (int)$sess['user_id'];

    match($module) {
        'finance'     => saveFinance($pid, $uid, $b),
        'planning'    => savePlanning($pid, $uid, $b),
        'procurement' => saveProcurement($pid, $uid, $b),
        'prod_util'   => saveProdUtil($pid, $uid, $b),
        'prod_waste'  => saveProdWaste($pid, $uid, $b),
        'prod_sched'  => saveProdSched($pid, $uid, $b),
        'warehouse'   => saveWarehouse($pid, $uid, $b),
        default       => fail("Unknown module: $module"),
    };
    audit($sess, 'save', $module, $pid);
    ok(null, 'Saved');
}

// =============================================================
// Helpers
// =============================================================
function n(mixed $v): ?float { return ($v !== null && $v !== '') ? (float)$v : null; }
function ni(mixed $v): ?int  { return ($v !== null && $v !== '') ? (int)$v   : null; }

function upsert(string $table, array $data): void {
    // Backtick every column name so MySQL reserved words (force, testing,
    // shutdown, transfer, days, etc.) never cause a syntax error.
    $cols    = implode(',', array_map(fn($k) => "`$k`", array_keys($data)));
    $phs     = implode(',', array_fill(0, count($data), '?'));
    $updates = implode(',', array_map(fn($k) => "`$k`=VALUES(`$k`)", array_keys($data)));
    db()->prepare("INSERT INTO $table ($cols) VALUES ($phs) ON DUPLICATE KEY UPDATE $updates")
       ->execute(array_values($data));
}

function nullRow(string $table, int $pid): array {
    // Returns all-null array for empty periods
    return [];
}

// =============================================================
// Finance
// =============================================================
function loadFinance(?int $pid): array {
    if (!$pid) return emptyFinance();
    $r = db()->prepare('SELECT * FROM sc_finance WHERE period_id=?');
    $r->execute([$pid]); $d = $r->fetch();
    if (!$d) return emptyFinance();
    return [
        'prod'  => ['actual'=>$d['prod_actual'],  'target'=>$d['prod_target']],
        'op'    => ['actual'=>$d['op_actual'],    'budget'=>$d['op_budget']],
        'cap'   => ['actual'=>$d['cap_actual'],   'budget'=>$d['cap_budget']],
        'other' => ['actual'=>$d['other_actual'], 'budget'=>$d['other_budget']],
        'labor' => ['dl'=>['reg'=>$d['dl_reg'],'ot'=>$d['dl_ot']], 'il'=>['reg'=>$d['il_reg'],'ot'=>$d['il_ot']]],
    ];
}
function emptyFinance(): array {
    return ['prod'=>['actual'=>'','target'=>''],'op'=>['actual'=>'','budget'=>''],'cap'=>['actual'=>'','budget'=>''],'other'=>['actual'=>'','budget'=>''],'labor'=>['dl'=>['reg'=>'','ot'=>''],'il'=>['reg'=>'','ot'=>'']]];
}
function saveFinance(int $pid, int $uid, array $b): void {
    upsert('sc_finance', ['period_id'=>$pid,'prod_actual'=>n($b['prod']['actual']??null),'prod_target'=>n($b['prod']['target']??null),'op_actual'=>n($b['op']['actual']??null),'op_budget'=>n($b['op']['budget']??null),'cap_actual'=>n($b['cap']['actual']??null),'cap_budget'=>n($b['cap']['budget']??null),'other_actual'=>n($b['other']['actual']??null),'other_budget'=>n($b['other']['budget']??null),'dl_reg'=>n($b['labor']['dl']['reg']??null),'dl_ot'=>n($b['labor']['dl']['ot']??null),'il_reg'=>n($b['labor']['il']['reg']??null),'il_ot'=>n($b['labor']['il']['ot']??null),'saved_by'=>$uid]);
}

// =============================================================
// SC Planning
// =============================================================
function loadPlanning(?int $pid): array {
    if (!$pid) return [];
    $r = db()->prepare('SELECT * FROM sc_planning WHERE period_id=?');
    $r->execute([$pid]); $d = $r->fetch(); if (!$d) return [];
    // Map DB columns → JS field keys
    $m = ['fgA'=>'fg_core','fgB'=>'fg_m7','fgC'=>'fg_others','fgAllIn'=>'fg_all_in','rmA'=>'rm_core','rmB'=>'rm_m7','rmC'=>'rm_others','pmCore'=>'pm_core','pmM7'=>'pm_m7','pmOthers'=>'pm_others','fgKgsFG'=>'fg_kgs_core','fgKgsFN'=>'fg_kgs_m7','fgKgsSL'=>'fg_kgs_others','fgKgsEX'=>'fg_kgs_exp','fgKgsDays'=>'fg_kgs_days','fgPhpFG'=>'fg_php_core','fgPhpFN'=>'fg_php_m7','fgPhpSL'=>'fg_php_others','fgPhpEX'=>'fg_php_exp','rmKgsFG'=>'rm_kgs_core','rmKgsFN'=>'rm_kgs_m7','rmKgsSL'=>'rm_kgs_others','rmKgsEX'=>'rm_kgs_exp','rmKgsDays'=>'rm_kgs_days','rmPhpFG'=>'rm_php_core','rmPhpFN'=>'rm_php_m7','rmPhpSL'=>'rm_php_others','rmPhpEX'=>'rm_php_exp','fgCnt'=>'fg_cnt','fgMiss'=>'fg_miss','rmCnt'=>'rm_cnt','rmMiss'=>'rm_miss','fcGma'=>'fc_gma','fcNorth'=>'fc_north','fcSouth'=>'fc_south','fcVis'=>'fc_vis','fcMind'=>'fc_mind','fcMT'=>'fc_mt','fcPsbsi'=>'fc_psbsi','fcIndo'=>'fc_indo','fcIndia'=>'fc_india','fcDirect'=>'fc_direct','pEpoxy'=>'p_epoxy','pElasto'=>'p_elasto','pMighty'=>'p_mighty','pProEpoxy'=>'p_pro_epoxy','pBuilders'=>'p_builders','pCoating'=>'p_coating','pTransport'=>'p_transport','pOther'=>'p_other','pSealant'=>'p_sealant','pWaterproof'=>'p_waterproof','pPainting'=>'p_painting','pAdhesives'=>'p_adhesives','pMining'=>'p_mining','pOthers'=>'p_others'];
    $out = [];
    foreach ($m as $js => $col) $out[$js] = $d[$col] !== null ? (string)$d[$col] : '';
    return $out;
}
function savePlanning(int $pid, int $uid, array $b): void {
    $f = $b['fields'] ?? $b;
    upsert('sc_planning',['period_id'=>$pid,'fg_core'=>n($f['fgA']??null),'fg_m7'=>n($f['fgB']??null),'fg_others'=>n($f['fgC']??null),'fg_all_in'=>n($f['fgAllIn']??null),'rm_core'=>n($f['rmA']??null),'rm_m7'=>n($f['rmB']??null),'rm_others'=>n($f['rmC']??null),'pm_core'=>n($f['pmCore']??null),'pm_m7'=>n($f['pmM7']??null),'pm_others'=>n($f['pmOthers']??null),'fg_kgs_core'=>n($f['fgKgsFG']??null),'fg_kgs_m7'=>n($f['fgKgsFN']??null),'fg_kgs_others'=>n($f['fgKgsSL']??null),'fg_kgs_exp'=>n($f['fgKgsEX']??null),'fg_kgs_days'=>n($f['fgKgsDays']??null),'fg_php_core'=>n($f['fgPhpFG']??null),'fg_php_m7'=>n($f['fgPhpFN']??null),'fg_php_others'=>n($f['fgPhpSL']??null),'fg_php_exp'=>n($f['fgPhpEX']??null),'rm_kgs_core'=>n($f['rmKgsFG']??null),'rm_kgs_m7'=>n($f['rmKgsFN']??null),'rm_kgs_others'=>n($f['rmKgsSL']??null),'rm_kgs_exp'=>n($f['rmKgsEX']??null),'rm_kgs_days'=>n($f['rmKgsDays']??null),'rm_php_core'=>n($f['rmPhpFG']??null),'rm_php_m7'=>n($f['rmPhpFN']??null),'rm_php_others'=>n($f['rmPhpSL']??null),'rm_php_exp'=>n($f['rmPhpEX']??null),'fg_cnt'=>ni($f['fgCnt']??null),'fg_miss'=>ni($f['fgMiss']??null),'rm_cnt'=>ni($f['rmCnt']??null),'rm_miss'=>ni($f['rmMiss']??null),'fc_gma'=>n($f['fcGma']??null),'fc_north'=>n($f['fcNorth']??null),'fc_south'=>n($f['fcSouth']??null),'fc_vis'=>n($f['fcVis']??null),'fc_mind'=>n($f['fcMind']??null),'fc_mt'=>n($f['fcMT']??null),'fc_psbsi'=>n($f['fcPsbsi']??null),'fc_indo'=>n($f['fcIndo']??null),'fc_india'=>n($f['fcIndia']??null),'fc_direct'=>n($f['fcDirect']??null),'p_epoxy'=>n($f['pEpoxy']??null),'p_elasto'=>n($f['pElasto']??null),'p_mighty'=>n($f['pMighty']??null),'p_pro_epoxy'=>n($f['pProEpoxy']??null),'p_builders'=>n($f['pBuilders']??null),'p_coating'=>n($f['pCoating']??null),'p_transport'=>n($f['pTransport']??null),'p_other'=>n($f['pOther']??null),'p_sealant'=>n($f['pSealant']??null),'p_waterproof'=>n($f['pWaterproof']??null),'p_painting'=>n($f['pPainting']??null),'p_adhesives'=>n($f['pAdhesives']??null),'p_mining'=>n($f['pMining']??null),'p_others'=>n($f['pOthers']??null),'saved_by'=>$uid]);
}

// =============================================================
// Procurement
// =============================================================
function loadProcurement(?int $pid): array {
    if (!$pid) return ['actual'=>'','target'=>''];
    $r = db()->prepare('SELECT actual,target FROM sc_procurement WHERE period_id=?');
    $r->execute([$pid]); $d=$r->fetch();
    return $d ? ['actual'=>(string)($d['actual']??''),'target'=>(string)($d['target']??'')] : ['actual'=>'','target'=>''];
}
function saveProcurement(int $pid, int $uid, array $b): void {
    upsert('sc_procurement',['period_id'=>$pid,'actual'=>n($b['actual']??null),'target'=>n($b['target']??null),'saved_by'=>$uid]);
}

// =============================================================
// Production – Utilization
// =============================================================
function loadProdUtil(?int $pid): array {
    if (!$pid) return [];
    $rows = db()->prepare('SELECT * FROM sc_prod_util WHERE period_id=?');
    $rows->execute([$pid]); $out=[];
    foreach ($rows->fetchAll() as $r) {
        $out[$r['line_key']] = ['productive'=>$r['productive']??'','noPlan'=>$r['no_plan']??'','noHc'=>$r['no_hc']??'','changeOver'=>$r['change_over']??'','meeting'=>$r['meeting']??'','sanitation'=>$r['sanitation']??'','startup'=>$r['startup']??'','shutdown'=>$r['shutdown']??'','testing'=>$r['testing']??'','breaktime'=>$r['breaktime']??'','pm'=>$r['pm']??'','force'=>$r['force']??'','elec'=>$r['elec']??'','mech'=>$r['mech']??'','material'=>$r['material']??'','sorting'=>$r['sorting']??'','tech'=>$r['tech']??'','noManpower'=>$r['no_manpower']??'','udt'=>$r['udt']??'','noOt'=>$r['no_ot']??'','noBulk'=>$r['no_bulk']??'','transfer'=>$r['transfer']??'','idle'=>$r['idle']??'','mAvail'=>$r['m_avail']??'','mUsed'=>$r['m_used']??'','days'=>$r['days']??''];
    }
    return $out;
}
function saveProdUtil(int $pid, int $uid, array $b): void {
    $line=$b['line']??''; if(!$line) fail('Line key required');
    upsert('sc_prod_util',['period_id'=>$pid,'line_key'=>$line,'productive'=>n($b['productive']??null),'no_plan'=>n($b['noPlan']??null),'no_hc'=>n($b['noHc']??null),'change_over'=>n($b['changeOver']??null),'meeting'=>n($b['meeting']??null),'sanitation'=>n($b['sanitation']??null),'startup'=>n($b['startup']??null),'shutdown'=>n($b['shutdown']??null),'testing'=>n($b['testing']??null),'breaktime'=>n($b['breaktime']??null),'pm'=>n($b['pm']??null),'force'=>n($b['force']??null),'elec'=>n($b['elec']??null),'mech'=>n($b['mech']??null),'material'=>n($b['material']??null),'sorting'=>n($b['sorting']??null),'tech'=>n($b['tech']??null),'no_manpower'=>n($b['noManpower']??null),'udt'=>n($b['udt']??null),'no_ot'=>n($b['noOt']??null),'no_bulk'=>n($b['noBulk']??null),'transfer'=>n($b['transfer']??null),'idle'=>n($b['idle']??null),'m_avail'=>ni($b['mAvail']??null),'m_used'=>ni($b['mUsed']??null),'days'=>n($b['days']??null),'saved_by'=>$uid]);
}

// =============================================================
// Production – Waste
// =============================================================
function loadProdWaste(?int $pid): array {
    if (!$pid) return [];
    $rows=db()->prepare('SELECT * FROM sc_prod_waste WHERE period_id=?'); $rows->execute([$pid]); $out=[];
    foreach($rows->fetchAll() as $r) $out[$r['line_key']]=(['fg'=>$r['fg']??'','rep'=>$r['rep']??'','rej'=>$r['rej']??'','waste'=>$r['waste']??'']);
    return $out;
}
function saveProdWaste(int $pid, int $uid, array $b): void {
    $line=$b['line']??''; if(!$line) fail('Line required');
    upsert('sc_prod_waste',['period_id'=>$pid,'line_key'=>$line,'fg'=>n($b['fg']??null),'rep'=>n($b['rep']??null),'rej'=>n($b['rej']??null),'waste'=>n($b['waste']??null),'saved_by'=>$uid]);
}

// =============================================================
// Production – Scheduling
// =============================================================
function loadProdSched(?int $pid): array {
    if (!$pid) return [];
    $rows=db()->prepare('SELECT * FROM sc_prod_sched WHERE period_id=?'); $rows->execute([$pid]); $out=[];
    foreach($rows->fetchAll() as $r) $out[$r['line_key']]=['actual'=>$r['actual']??'','planned'=>$r['planned']??''];
    return $out;
}
function saveProdSched(int $pid, int $uid, array $b): void {
    $line=$b['line']??''; if(!$line) fail('Line required');
    upsert('sc_prod_sched',['period_id'=>$pid,'line_key'=>$line,'actual'=>n($b['actual']??null),'planned'=>n($b['planned']??null),'saved_by'=>$uid]);
}

// =============================================================
// Warehouse
// =============================================================
function loadWarehouse(?int $pid): array {
    $empty=['otif'=>['served'=>'','total'=>''],'vol'=>['del'=>'','ord'=>''],'fr'=>['sc'=>['del'=>'','ord'=>''],'corp'=>['del'=>'','ord'=>''],'core'=>['del'=>'','ord'=>''],'m7'=>['del'=>'','ord'=>'']],'wh'=>['rmTot'=>'','rmUsed'=>'','fgTot'=>'','fgUsed'=>'','extTot'=>'','extUsed'=>''],'otdl'=>['gma'=>'','north'=>'','central'=>'','south'=>'','vis'=>'','mind'=>'','mt'=>'','pai'=>''],'trucks'=>['t10'=>'','auv'=>'','t6'=>'','t4'=>'','c20'=>''],'mp'=>['reg'=>'','agy'=>'','res'=>'','regH'=>'','agyH'=>'','otH'=>'','abs'=>'','days'=>''],'nonOtif'=>[],'soVal'=>[],'soWt'=>[]];
    if (!$pid) return $empty;
    $r=db()->prepare('SELECT * FROM sc_warehouse WHERE period_id=?'); $r->execute([$pid]); $d=$r->fetch();
    // nonOtif
    $no=db()->prepare('SELECT issue_idx,cnt FROM sc_wh_non_otif WHERE period_id=?'); $no->execute([$pid]); $nonOtif=[];
    foreach($no->fetchAll() as $x) $nonOtif['no'.$x['issue_idx']]=(string)$x['cnt'];
    // stockout
    $so=db()->prepare('SELECT issue_idx,val_php,val_kgs FROM sc_wh_stockout WHERE period_id=?'); $so->execute([$pid]); $soVal=[]; $soWt=[];
    foreach($so->fetchAll() as $x) { $soVal['sv'.$x['issue_idx']]=(string)$x['val_php']; $soWt['sw'.$x['issue_idx']]=(string)$x['val_kgs']; }
    if (!$d) return array_merge($empty,['nonOtif'=>$nonOtif,'soVal'=>$soVal,'soWt'=>$soWt]);
    return ['otif'=>['served'=>$d['otif_served']??'','total'=>$d['otif_total']??''],'vol'=>['del'=>$d['vol_del']??'','ord'=>$d['vol_ord']??''],'fr'=>['sc'=>['del'=>$d['fr_sc_del']??'','ord'=>$d['fr_sc_ord']??''],'corp'=>['del'=>$d['fr_corp_del']??'','ord'=>$d['fr_corp_ord']??''],'core'=>['del'=>$d['fr_core_del']??'','ord'=>$d['fr_core_ord']??''],'m7'=>['del'=>$d['fr_m7_del']??'','ord'=>$d['fr_m7_ord']??'']],'wh'=>['rmTot'=>$d['wh_rm_tot']??'','rmUsed'=>$d['wh_rm_used']??'','fgTot'=>$d['wh_fg_tot']??'','fgUsed'=>$d['wh_fg_used']??'','extTot'=>$d['wh_ext_tot']??'','extUsed'=>$d['wh_ext_used']??''],'otdl'=>['gma'=>$d['otdl_gma']??'','north'=>$d['otdl_north']??'','central'=>$d['otdl_central']??'','south'=>$d['otdl_south']??'','vis'=>$d['otdl_vis']??'','mind'=>$d['otdl_mind']??'','mt'=>$d['otdl_mt']??'','pai'=>$d['otdl_pai']??''],'trucks'=>['t10'=>$d['truck_t10']??'','auv'=>$d['truck_auv']??'','t6'=>$d['truck_t6']??'','t4'=>$d['truck_t4']??'','c20'=>$d['truck_c20']??''],'mp'=>['reg'=>$d['mp_reg']??'','agy'=>$d['mp_agy']??'','res'=>$d['mp_res']??'','regH'=>$d['mp_reg_h']??'','agyH'=>$d['mp_agy_h']??'','otH'=>$d['mp_ot_h']??'','abs'=>$d['mp_abs']??'','days'=>$d['mp_days']??''],'nonOtif'=>$nonOtif,'soVal'=>$soVal,'soWt'=>$soWt];
}
function saveWarehouse(int $pid, int $uid, array $b): void {
    upsert('sc_warehouse',['period_id'=>$pid,'otif_served'=>ni($b['otif']['served']??null),'otif_total'=>ni($b['otif']['total']??null),'vol_del'=>n($b['vol']['del']??null),'vol_ord'=>n($b['vol']['ord']??null),'fr_sc_del'=>n($b['fr']['sc']['del']??null),'fr_sc_ord'=>n($b['fr']['sc']['ord']??null),'fr_corp_del'=>n($b['fr']['corp']['del']??null),'fr_corp_ord'=>n($b['fr']['corp']['ord']??null),'fr_core_del'=>n($b['fr']['core']['del']??null),'fr_core_ord'=>n($b['fr']['core']['ord']??null),'fr_m7_del'=>n($b['fr']['m7']['del']??null),'fr_m7_ord'=>n($b['fr']['m7']['ord']??null),'wh_rm_tot'=>ni($b['wh']['rmTot']??null),'wh_rm_used'=>ni($b['wh']['rmUsed']??null),'wh_fg_tot'=>ni($b['wh']['fgTot']??null),'wh_fg_used'=>ni($b['wh']['fgUsed']??null),'wh_ext_tot'=>ni($b['wh']['extTot']??null),'wh_ext_used'=>ni($b['wh']['extUsed']??null),'otdl_gma'=>n($b['otdl']['gma']??null),'otdl_north'=>n($b['otdl']['north']??null),'otdl_central'=>n($b['otdl']['central']??null),'otdl_south'=>n($b['otdl']['south']??null),'otdl_vis'=>n($b['otdl']['vis']??null),'otdl_mind'=>n($b['otdl']['mind']??null),'otdl_mt'=>n($b['otdl']['mt']??null),'otdl_pai'=>n($b['otdl']['pai']??null),'truck_t10'=>n($b['trucks']['t10']??null),'truck_auv'=>n($b['trucks']['auv']??null),'truck_t6'=>n($b['trucks']['t6']??null),'truck_t4'=>n($b['trucks']['t4']??null),'truck_c20'=>n($b['trucks']['c20']??null),'mp_reg'=>ni($b['mp']['reg']??null),'mp_agy'=>ni($b['mp']['agy']??null),'mp_res'=>ni($b['mp']['res']??null),'mp_reg_h'=>n($b['mp']['regH']??null),'mp_agy_h'=>n($b['mp']['agyH']??null),'mp_ot_h'=>n($b['mp']['otH']??null),'mp_abs'=>ni($b['mp']['abs']??null),'mp_days'=>n($b['mp']['days']??null),'saved_by'=>$uid]);
    if (isset($b['nonOtif'])) { foreach($b['nonOtif'] as $k=>$v) { $i=(int)substr($k,2); $c=(int)$v; if($c>0) db()->prepare('INSERT INTO sc_wh_non_otif(period_id,issue_idx,cnt)VALUES(?,?,?) ON DUPLICATE KEY UPDATE cnt=?')->execute([$pid,$i,$c,$c]); else db()->prepare('DELETE FROM sc_wh_non_otif WHERE period_id=? AND issue_idx=?')->execute([$pid,$i]); } }
    if (isset($b['soVal'])) { foreach($b['soVal'] as $k=>$v) { $i=(int)substr($k,2); $vp=(float)$v; $vk=(float)($b['soWt']['sw'.$i]??0); if($vp>0||$vk>0) db()->prepare('INSERT INTO sc_wh_stockout(period_id,issue_idx,val_php,val_kgs)VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE val_php=?,val_kgs=?')->execute([$pid,$i,$vp,$vk,$vp,$vk]); else db()->prepare('DELETE FROM sc_wh_stockout WHERE period_id=? AND issue_idx=?')->execute([$pid,$i]); } }
}
