<?php
// ============================================================
// api/data.php — KPI Data Save/Load API
// All endpoints require X-Auth-Token header.
//
// GET  ?module=finance&year=2026&month=4       → load
// GET  ?module=planning&year=2026&month=4      → load
// GET  ?module=procurement&year=2026&month=4   → load
// GET  ?module=production_util&year=2026&month=4&line=L06_FILLING
// GET  ?module=production_waste&year=2026&month=4
// GET  ?module=production_sched&year=2026&month=4
// GET  ?module=warehouse&year=2026&month=4     → load
// GET  ?module=all&year=2026&month=4           → load all modules at once
//
// POST { module, year, month, ...fields }      → save (admin+)
// ============================================================

require_once __DIR__ . '/config.php';
setHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleLoad();
} elseif ($method === 'POST') {
    handleSave();
} else {
    fail('Method not allowed', 405);
}

// ── LOAD ─────────────────────────────────────────────────────
function handleLoad(): void {
    $session = requireAuth('viewer');
    $module  = $_GET['module'] ?? '';
    $year    = (int)($_GET['year']  ?? 0);
    $month   = (int)($_GET['month'] ?? 0);

    if ($year < 2020 || $year > 2030) fail('Invalid year');
    if ($month < 1   || $month > 12)  fail('Invalid month');

    $pid = getPeriodId($year, $month);

    $result = match($module) {
        'finance'          => loadFinance($pid),
        'planning'         => loadPlanning($pid),
        'procurement'      => loadProcurement($pid),
        'production_util'  => loadProductionUtil($pid),
        'production_waste' => loadProductionWaste($pid),
        'production_sched' => loadProductionSched($pid),
        'warehouse'        => loadWarehouse($pid),
        'all'              => [
            'finance'          => loadFinance($pid),
            'planning'         => loadPlanning($pid),
            'procurement'      => loadProcurement($pid),
            'production_util'  => loadProductionUtil($pid),
            'production_waste' => loadProductionWaste($pid),
            'production_sched' => loadProductionSched($pid),
            'warehouse'        => loadWarehouse($pid),
        ],
        default => null
    };

    if ($result === null) fail('Unknown module');
    ok(['period' => ['year' => $year, 'month' => $month], 'data' => $result]);
}

// ── SAVE ─────────────────────────────────────────────────────
function handleSave(): void {
    $session = requireAuth('admin');
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $module  = $body['module'] ?? '';
    $year    = (int)($body['year']  ?? 0);
    $month   = (int)($body['month'] ?? 0);

    if ($year < 2020 || $year > 2030) fail('Invalid year');
    if ($month < 1   || $month > 12)  fail('Invalid month');

    $pid = getOrCreatePeriod($year, $month);
    $uid = $session['user_id'];

    match($module) {
        'finance'          => saveFinance($pid, $uid, $body),
        'planning'         => savePlanning($pid, $uid, $body),
        'procurement'      => saveProcurement($pid, $uid, $body),
        'production_util'  => saveProductionUtil($pid, $uid, $body),
        'production_waste' => saveProductionWaste($pid, $uid, $body),
        'production_sched' => saveProductionSched($pid, $uid, $body),
        'warehouse'        => saveWarehouse($pid, $uid, $body),
        default            => fail('Unknown module')
    };

    auditLog($session, 'save', $module, $pid);
    ok(null, 'Saved');
}

// ── Period helpers ────────────────────────────────────────────
function getPeriodId(int $year, int $month): ?int {
    $stmt = db()->prepare('SELECT id FROM periods WHERE year = ? AND month = ?');
    $stmt->execute([$year, $month]);
    $row = $stmt->fetch();
    return $row ? (int)$row['id'] : null;
}
function n(?string $v): ?float { return ($v !== null && $v !== '') ? (float)$v : null; }
function ni(?string $v): ?int  { return ($v !== null && $v !== '') ? (int)$v   : null; }

// ── UPSERT helper (INSERT … ON DUPLICATE KEY UPDATE) ─────────
function upsert(string $table, array $data): void {
    $cols   = implode(', ', array_keys($data));
    $phs    = implode(', ', array_fill(0, count($data), '?'));
    $updates = implode(', ', array_map(fn($k) => "$k = VALUES($k)", array_keys($data)));
    $sql    = "INSERT INTO $table ($cols) VALUES ($phs) ON DUPLICATE KEY UPDATE $updates";
    db()->prepare($sql)->execute(array_values($data));
}

// ============================================================
// FINANCE
// ============================================================
function loadFinance(?int $pid): array {
    if (!$pid) return emptyFinance();
    $row = db()->prepare('SELECT * FROM finance WHERE period_id = ?');
    $row->execute([$pid]);
    $d = $row->fetch();
    if (!$d) return emptyFinance();
    return [
        'prod'  => ['actual' => $d['prod_actual'],  'target' => $d['prod_target']],
        'op'    => ['actual' => $d['op_actual'],    'budget' => $d['op_budget']],
        'cap'   => ['actual' => $d['cap_actual'],   'budget' => $d['cap_budget']],
        'other' => ['actual' => $d['other_actual'], 'budget' => $d['other_budget']],
        'labor' => [
            'dl' => ['reg' => $d['labor_dl_reg'], 'ot' => $d['labor_dl_ot']],
            'il' => ['reg' => $d['labor_il_reg'], 'ot' => $d['labor_il_ot']],
        ],
    ];
}
function emptyFinance(): array {
    return ['prod'=>['actual'=>'','target'=>''],'op'=>['actual'=>'','budget'=>''],'cap'=>['actual'=>'','budget'=>''],'other'=>['actual'=>'','budget'=>''],'labor'=>['dl'=>['reg'=>'','ot'=>''],'il'=>['reg'=>'','ot'=>'']]];
}
function saveFinance(int $pid, int $uid, array $b): void {
    upsert('finance', [
        'period_id'    => $pid,
        'prod_actual'  => n($b['prod']['actual']  ?? null),
        'prod_target'  => n($b['prod']['target']  ?? null),
        'op_actual'    => n($b['op']['actual']    ?? null),
        'op_budget'    => n($b['op']['budget']    ?? null),
        'cap_actual'   => n($b['cap']['actual']   ?? null),
        'cap_budget'   => n($b['cap']['budget']   ?? null),
        'other_actual' => n($b['other']['actual'] ?? null),
        'other_budget' => n($b['other']['budget'] ?? null),
        'labor_dl_reg' => n($b['labor']['dl']['reg'] ?? null),
        'labor_dl_ot'  => n($b['labor']['dl']['ot']  ?? null),
        'labor_il_reg' => n($b['labor']['il']['reg'] ?? null),
        'labor_il_ot'  => n($b['labor']['il']['ot']  ?? null),
        'updated_by'   => $uid,
    ]);
}

// ============================================================
// SC PLANNING
// ============================================================
function loadPlanning(?int $pid): array {
    if (!$pid) return [];
    $stmt = db()->prepare('SELECT * FROM planning WHERE period_id = ?');
    $stmt->execute([$pid]);
    $d = $stmt->fetch();
    if (!$d) return [];
    // Map DB columns back to JS field keys
    $map = [
        'fgA'=>'fg_core','fgB'=>'fg_m7','fgC'=>'fg_others','fgAllIn'=>'fg_all_in',
        'rmA'=>'rm_core','rmB'=>'rm_m7','rmC'=>'rm_others',
        'pmCore'=>'pm_core','pmM7'=>'pm_m7','pmOthers'=>'pm_others',
        'fgKgsFG'=>'fg_kgs_core','fgKgsFN'=>'fg_kgs_m7','fgKgsSL'=>'fg_kgs_others',
        'fgKgsEX'=>'fg_kgs_exp','fgKgsDays'=>'fg_kgs_days',
        'fgPhpFG'=>'fg_php_core','fgPhpFN'=>'fg_php_m7','fgPhpSL'=>'fg_php_others','fgPhpEX'=>'fg_php_exp',
        'rmKgsFG'=>'rm_kgs_core','rmKgsFN'=>'rm_kgs_m7','rmKgsSL'=>'rm_kgs_others',
        'rmKgsEX'=>'rm_kgs_exp','rmKgsDays'=>'rm_kgs_days',
        'rmPhpFG'=>'rm_php_core','rmPhpFN'=>'rm_php_m7','rmPhpSL'=>'rm_php_others','rmPhpEX'=>'rm_php_exp',
        'fgCnt'=>'fg_cnt','fgMiss'=>'fg_miss','rmCnt'=>'rm_cnt','rmMiss'=>'rm_miss',
        'fcGma'=>'fc_gma','fcNorth'=>'fc_north','fcSouth'=>'fc_south','fcVis'=>'fc_vis',
        'fcMind'=>'fc_mind','fcMT'=>'fc_mt','fcPsbsi'=>'fc_psbsi',
        'fcIndo'=>'fc_indo','fcIndia'=>'fc_india','fcDirect'=>'fc_direct',
        'pEpoxy'=>'p_epoxy','pElasto'=>'p_elasto','pMighty'=>'p_mighty','pProEpoxy'=>'p_pro_epoxy',
        'pBuilders'=>'p_builders','pCoating'=>'p_coating','pTransport'=>'p_transport','pOther'=>'p_other',
        'pSealant'=>'p_sealant','pWaterproof'=>'p_waterproof','pPainting'=>'p_painting',
        'pAdhesives'=>'p_adhesives','pMining'=>'p_mining','pOthers'=>'p_others',
    ];
    $out = [];
    foreach ($map as $jsKey => $dbCol) {
        $out[$jsKey] = $d[$dbCol] !== null ? (string)$d[$dbCol] : '';
    }
    return $out;
}
function savePlanning(int $pid, int $uid, array $b): void {
    $f = $b['fields'] ?? $b; // accept either wrapped or flat
    upsert('planning', [
        'period_id'    => $pid,
        'fg_core'      => n($f['fgA']       ?? null), 'fg_m7'        => n($f['fgB']       ?? null),
        'fg_others'    => n($f['fgC']       ?? null), 'fg_all_in'    => n($f['fgAllIn']   ?? null),
        'rm_core'      => n($f['rmA']       ?? null), 'rm_m7'        => n($f['rmB']       ?? null),
        'rm_others'    => n($f['rmC']       ?? null),
        'pm_core'      => n($f['pmCore']    ?? null), 'pm_m7'        => n($f['pmM7']      ?? null),
        'pm_others'    => n($f['pmOthers']  ?? null),
        'fg_kgs_core'  => n($f['fgKgsFG']  ?? null), 'fg_kgs_m7'    => n($f['fgKgsFN']  ?? null),
        'fg_kgs_others'=> n($f['fgKgsSL']  ?? null),
        'fg_kgs_exp'   => n($f['fgKgsEX']  ?? null), 'fg_kgs_days'  => n($f['fgKgsDays']?? null),
        'fg_php_core'  => n($f['fgPhpFG']  ?? null), 'fg_php_m7'    => n($f['fgPhpFN']  ?? null),
        'fg_php_others'=> n($f['fgPhpSL']  ?? null), 'fg_php_exp'   => n($f['fgPhpEX']  ?? null),
        'rm_kgs_core'  => n($f['rmKgsFG']  ?? null), 'rm_kgs_m7'    => n($f['rmKgsFN']  ?? null),
        'rm_kgs_others'=> n($f['rmKgsSL']  ?? null),
        'rm_kgs_exp'   => n($f['rmKgsEX']  ?? null), 'rm_kgs_days'  => n($f['rmKgsDays']?? null),
        'rm_php_core'  => n($f['rmPhpFG']  ?? null), 'rm_php_m7'    => n($f['rmPhpFN']  ?? null),
        'rm_php_others'=> n($f['rmPhpSL']  ?? null), 'rm_php_exp'   => n($f['rmPhpEX']  ?? null),
        'fg_cnt'       => ni($f['fgCnt']   ?? null), 'fg_miss'      => ni($f['fgMiss']  ?? null),
        'rm_cnt'       => ni($f['rmCnt']   ?? null), 'rm_miss'      => ni($f['rmMiss']  ?? null),
        'fc_gma'       => n($f['fcGma']    ?? null), 'fc_north'     => n($f['fcNorth']  ?? null),
        'fc_south'     => n($f['fcSouth']  ?? null), 'fc_vis'       => n($f['fcVis']    ?? null),
        'fc_mind'      => n($f['fcMind']   ?? null), 'fc_mt'        => n($f['fcMT']     ?? null),
        'fc_psbsi'     => n($f['fcPsbsi']  ?? null),
        'fc_indo'      => n($f['fcIndo']   ?? null), 'fc_india'     => n($f['fcIndia']  ?? null),
        'fc_direct'    => n($f['fcDirect'] ?? null),
        'p_epoxy'      => n($f['pEpoxy']   ?? null), 'p_elasto'     => n($f['pElasto']  ?? null),
        'p_mighty'     => n($f['pMighty']  ?? null), 'p_pro_epoxy'  => n($f['pProEpoxy']?? null),
        'p_builders'   => n($f['pBuilders']?? null), 'p_coating'    => n($f['pCoating'] ?? null),
        'p_transport'  => n($f['pTransport']??null), 'p_other'      => n($f['pOther']   ?? null),
        'p_sealant'    => n($f['pSealant'] ?? null), 'p_waterproof' => n($f['pWaterproof']??null),
        'p_painting'   => n($f['pPainting']?? null), 'p_adhesives'  => n($f['pAdhesives']??null),
        'p_mining'     => n($f['pMining']  ?? null), 'p_others'     => n($f['pOthers']  ?? null),
        'updated_by'   => $uid,
    ]);
}

// ============================================================
// PROCUREMENT
// ============================================================
function loadProcurement(?int $pid): array {
    if (!$pid) return ['actual'=>'','target'=>''];
    $stmt = db()->prepare('SELECT actual, target FROM procurement WHERE period_id = ?');
    $stmt->execute([$pid]);
    $d = $stmt->fetch();
    return $d ? ['actual' => (string)($d['actual']??''), 'target' => (string)($d['target']??'')] : ['actual'=>'','target'=>''];
}
function saveProcurement(int $pid, int $uid, array $b): void {
    upsert('procurement', ['period_id'=>$pid, 'actual'=>n($b['actual']??null), 'target'=>n($b['target']??null), 'updated_by'=>$uid]);
}

// ============================================================
// PRODUCTION — UTILIZATION
// ============================================================
function loadProductionUtil(?int $pid): array {
    if (!$pid) return [];
    $stmt = db()->prepare('SELECT * FROM production_util WHERE period_id = ?');
    $stmt->execute([$pid]);
    $rows = $stmt->fetchAll();
    $out  = [];
    foreach ($rows as $r) {
        $out[$r['line_key']] = [
            'productive'=>$r['productive']??'','noPlan'=>$r['no_plan']??'','noHc'=>$r['no_hc']??'',
            'changeOver'=>$r['change_over']??'','meeting'=>$r['meeting']??'','sanitation'=>$r['sanitation']??'',
            'startup'=>$r['startup']??'','shutdown'=>$r['shutdown']??'','testing'=>$r['testing']??'',
            'breaktime'=>$r['breaktime']??'','pm'=>$r['pm']??'','force'=>$r['force']??'',
            'elec'=>$r['elec']??'','mech'=>$r['mech']??'','material'=>$r['material']??'',
            'sorting'=>$r['sorting']??'','tech'=>$r['tech']??'','noManpower'=>$r['no_manpower']??'',
            'udt'=>$r['udt']??'','noOt'=>$r['no_ot']??'','noBulk'=>$r['no_bulk']??'',
            'transfer'=>$r['transfer']??'','idle'=>$r['idle']??'',
            'mAvail'=>$r['m_avail']??'','mUsed'=>$r['m_used']??'','days'=>$r['days']??'',
        ];
    }
    return $out;
}
function saveProductionUtil(int $pid, int $uid, array $b): void {
    $line = $b['line'] ?? ''; if (!$line) fail('Line key required');
    upsert('production_util', [
        'period_id'=>$pid,'line_key'=>$line,
        'productive'=>n($b['productive']??null),'no_plan'=>n($b['noPlan']??null),'no_hc'=>n($b['noHc']??null),
        'change_over'=>n($b['changeOver']??null),'meeting'=>n($b['meeting']??null),'sanitation'=>n($b['sanitation']??null),
        'startup'=>n($b['startup']??null),'shutdown'=>n($b['shutdown']??null),'testing'=>n($b['testing']??null),
        'breaktime'=>n($b['breaktime']??null),'pm'=>n($b['pm']??null),'force'=>n($b['force']??null),
        'elec'=>n($b['elec']??null),'mech'=>n($b['mech']??null),'material'=>n($b['material']??null),
        'sorting'=>n($b['sorting']??null),'tech'=>n($b['tech']??null),'no_manpower'=>n($b['noManpower']??null),
        'udt'=>n($b['udt']??null),'no_ot'=>n($b['noOt']??null),'no_bulk'=>n($b['noBulk']??null),
        'transfer'=>n($b['transfer']??null),'idle'=>n($b['idle']??null),
        'm_avail'=>ni($b['mAvail']??null),'m_used'=>ni($b['mUsed']??null),'days'=>n($b['days']??null),
        'updated_by'=>$uid,
    ]);
}

// ============================================================
// PRODUCTION — WASTE
// ============================================================
function loadProductionWaste(?int $pid): array {
    if (!$pid) return [];
    $stmt = db()->prepare('SELECT * FROM production_waste WHERE period_id = ?');
    $stmt->execute([$pid]);
    $out = [];
    foreach ($stmt->fetchAll() as $r) {
        $out[$r['line_key']] = ['fg'=>$r['fg']??'','rep'=>$r['rep']??'','rej'=>$r['rej']??'','waste'=>$r['waste']??''];
    }
    return $out;
}
function saveProductionWaste(int $pid, int $uid, array $b): void {
    $line = $b['line'] ?? ''; if (!$line) fail('Line key required');
    upsert('production_waste', ['period_id'=>$pid,'line_key'=>$line,'fg'=>n($b['fg']??null),'rep'=>n($b['rep']??null),'rej'=>n($b['rej']??null),'waste'=>n($b['waste']??null),'updated_by'=>$uid]);
}

// ============================================================
// PRODUCTION — SCHEDULING
// ============================================================
function loadProductionSched(?int $pid): array {
    if (!$pid) return [];
    $stmt = db()->prepare('SELECT * FROM production_sched WHERE period_id = ?');
    $stmt->execute([$pid]);
    $out = [];
    foreach ($stmt->fetchAll() as $r) {
        $out[$r['line_key']] = ['actual'=>$r['actual']??'','planned'=>$r['planned']??''];
    }
    return $out;
}
function saveProductionSched(int $pid, int $uid, array $b): void {
    $line = $b['line'] ?? ''; if (!$line) fail('Line key required');
    upsert('production_sched', ['period_id'=>$pid,'line_key'=>$line,'actual'=>n($b['actual']??null),'planned'=>n($b['planned']??null),'updated_by'=>$uid]);
}

// ============================================================
// WAREHOUSE
// ============================================================
function loadWarehouse(?int $pid): array {
    if (!$pid) return emptyWarehouse();
    $stmt = db()->prepare('SELECT * FROM warehouse WHERE period_id = ?');
    $stmt->execute([$pid]);
    $d = $stmt->fetch();

    // Non-OTIF
    $noStmt = db()->prepare('SELECT issue_idx, count FROM wh_non_otif WHERE period_id = ?');
    $noStmt->execute([$pid]);
    $nonOtif = [];
    foreach ($noStmt->fetchAll() as $r) $nonOtif['no'.$r['issue_idx']] = (string)$r['count'];

    // Stock-out
    $soStmt = db()->prepare('SELECT issue_idx, val_php, val_kgs FROM wh_stockout WHERE period_id = ?');
    $soStmt->execute([$pid]);
    $soVal = []; $soWt = [];
    foreach ($soStmt->fetchAll() as $r) {
        $soVal['sv'.$r['issue_idx']] = (string)$r['val_php'];
        $soWt['sw'.$r['issue_idx']]  = (string)$r['val_kgs'];
    }

    if (!$d) return emptyWarehouse($nonOtif, $soVal, $soWt);
    return [
        'otif'    => ['served'=>$d['otif_served']??'','total'=>$d['otif_total']??''],
        'vol'     => ['del'=>$d['vol_del']??'','ord'=>$d['vol_ord']??''],
        'fr'      => [
            'sc'   =>['del'=>$d['fr_sc_del']??'',  'ord'=>$d['fr_sc_ord']??''],
            'corp' =>['del'=>$d['fr_corp_del']??'','ord'=>$d['fr_corp_ord']??''],
            'core' =>['del'=>$d['fr_core_del']??'','ord'=>$d['fr_core_ord']??''],
            'm7'   =>['del'=>$d['fr_m7_del']??'',  'ord'=>$d['fr_m7_ord']??''],
        ],
        'wh'      => ['rmTot'=>$d['wh_rm_tot']??'','rmUsed'=>$d['wh_rm_used']??'','fgTot'=>$d['wh_fg_tot']??'','fgUsed'=>$d['wh_fg_used']??'','extTot'=>$d['wh_ext_tot']??'','extUsed'=>$d['wh_ext_used']??''],
        'otdl'    => ['gma'=>$d['otdl_gma']??'','north'=>$d['otdl_north']??'','central'=>$d['otdl_central']??'','south'=>$d['otdl_south']??'','vis'=>$d['otdl_vis']??'','mind'=>$d['otdl_mind']??'','mt'=>$d['otdl_mt']??'','pai'=>$d['otdl_pai']??''],
        'trucks'  => ['t10'=>$d['truck_t10']??'','auv'=>$d['truck_auv']??'','t6'=>$d['truck_t6']??'','t4'=>$d['truck_t4']??'','c20'=>$d['truck_c20']??''],
        'mp'      => ['reg'=>$d['mp_reg']??'','agy'=>$d['mp_agy']??'','res'=>$d['mp_res']??'','regH'=>$d['mp_reg_h']??'','agyH'=>$d['mp_agy_h']??'','otH'=>$d['mp_ot_h']??'','abs'=>$d['mp_abs']??'','days'=>$d['mp_days']??''],
        'nonOtif' => $nonOtif,
        'soVal'   => $soVal,
        'soWt'    => $soWt,
    ];
}
function emptyWarehouse(array $no=[], array $sv=[], array $sw=[]): array {
    return ['otif'=>['served'=>'','total'=>''],'vol'=>['del'=>'','ord'=>''],'fr'=>['sc'=>['del'=>'','ord'=>''],'corp'=>['del'=>'','ord'=>''],'core'=>['del'=>'','ord'=>''],'m7'=>['del'=>'','ord'=>'']],'wh'=>['rmTot'=>'','rmUsed'=>'','fgTot'=>'','fgUsed'=>'','extTot'=>'','extUsed'=>''],'otdl'=>['gma'=>'','north'=>'','central'=>'','south'=>'','vis'=>'','mind'=>'','mt'=>'','pai'=>''],'trucks'=>['t10'=>'','auv'=>'','t6'=>'','t4'=>'','c20'=>''],'mp'=>['reg'=>'','agy'=>'','res'=>'','regH'=>'','agyH'=>'','otH'=>'','abs'=>'','days'=>''],'nonOtif'=>$no,'soVal'=>$sv,'soWt'=>$sw];
}
function saveWarehouse(int $pid, int $uid, array $b): void {
    upsert('warehouse', [
        'period_id'   =>$pid,
        'otif_served' =>ni($b['otif']['served']??null), 'otif_total'  =>ni($b['otif']['total']??null),
        'vol_del'     =>n($b['vol']['del']??null),      'vol_ord'     =>n($b['vol']['ord']??null),
        'fr_sc_del'   =>n($b['fr']['sc']['del']??null), 'fr_sc_ord'   =>n($b['fr']['sc']['ord']??null),
        'fr_corp_del' =>n($b['fr']['corp']['del']??null),'fr_corp_ord' =>n($b['fr']['corp']['ord']??null),
        'fr_core_del' =>n($b['fr']['core']['del']??null),'fr_core_ord' =>n($b['fr']['core']['ord']??null),
        'fr_m7_del'   =>n($b['fr']['m7']['del']??null), 'fr_m7_ord'   =>n($b['fr']['m7']['ord']??null),
        'wh_rm_tot'   =>ni($b['wh']['rmTot']??null),   'wh_rm_used'  =>ni($b['wh']['rmUsed']??null),
        'wh_fg_tot'   =>ni($b['wh']['fgTot']??null),   'wh_fg_used'  =>ni($b['wh']['fgUsed']??null),
        'wh_ext_tot'  =>ni($b['wh']['extTot']??null),  'wh_ext_used' =>ni($b['wh']['extUsed']??null),
        'otdl_gma'    =>n($b['otdl']['gma']??null),    'otdl_north'  =>n($b['otdl']['north']??null),
        'otdl_central'=>n($b['otdl']['central']??null), 'otdl_south'  =>n($b['otdl']['south']??null),
        'otdl_vis'    =>n($b['otdl']['vis']??null),    'otdl_mind'   =>n($b['otdl']['mind']??null),
        'otdl_mt'     =>n($b['otdl']['mt']??null),     'otdl_pai'    =>n($b['otdl']['pai']??null),
        'truck_t10'   =>n($b['trucks']['t10']??null),  'truck_auv'   =>n($b['trucks']['auv']??null),
        'truck_t6'    =>n($b['trucks']['t6']??null),   'truck_t4'    =>n($b['trucks']['t4']??null),
        'truck_c20'   =>n($b['trucks']['c20']??null),
        'mp_reg'      =>ni($b['mp']['reg']??null),     'mp_agy'      =>ni($b['mp']['agy']??null),
        'mp_res'      =>ni($b['mp']['res']??null),     'mp_reg_h'    =>n($b['mp']['regH']??null),
        'mp_agy_h'    =>n($b['mp']['agyH']??null),     'mp_ot_h'     =>n($b['mp']['otH']??null),
        'mp_abs'      =>ni($b['mp']['abs']??null),     'mp_days'     =>n($b['mp']['days']??null),
        'updated_by'  =>$uid,
    ]);
    // Non-OTIF issues
    if (isset($b['nonOtif'])) {
        foreach ($b['nonOtif'] as $key => $val) {
            $idx = (int)substr($key, 2);
            $cnt = (int)$val;
            if ($cnt > 0) {
                db()->prepare('INSERT INTO wh_non_otif (period_id,issue_idx,count) VALUES (?,?,?) ON DUPLICATE KEY UPDATE count=?')
                    ->execute([$pid,$idx,$cnt,$cnt]);
            } else {
                db()->prepare('DELETE FROM wh_non_otif WHERE period_id=? AND issue_idx=?')->execute([$pid,$idx]);
            }
        }
    }
    // Stock-outs
    if (isset($b['soVal'])) {
        foreach ($b['soVal'] as $key => $val) {
            $idx  = (int)substr($key, 2);
            $vPhp = (float)$val;
            $vKgs = (float)($b['soWt']['sw'.$idx] ?? 0);
            if ($vPhp > 0 || $vKgs > 0) {
                db()->prepare('INSERT INTO wh_stockout (period_id,issue_idx,val_php,val_kgs) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE val_php=?,val_kgs=?')
                    ->execute([$pid,$idx,$vPhp,$vKgs,$vPhp,$vKgs]);
            } else {
                db()->prepare('DELETE FROM wh_stockout WHERE period_id=? AND issue_idx=?')->execute([$pid,$idx]);
            }
        }
    }
}
