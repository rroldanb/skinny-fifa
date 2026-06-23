const DATA = {
  matchdays: [
    { date: '14-abr', ranking: ['jorge', 'jc', 'gonza'], goleador: null, goles: null },
    { date: '21-abr', ranking: ['gonza', 'jorge', 'jc'], goleador: null, goles: null },
    { date: '12-may', ranking: ['gonza', 'jc', 'jorge'], goleador: null, goles: null },
    { date: '19-may', ranking: ['jc', 'gonza', 'jorge'], goleador: null, goles: null },
    { date: '26-may', ranking: ['jorge', 'gonza', 'jc'], goleador: null, goles: null },
    { date: '02-jun', ranking: ['gonza', 'jorge', 'jc'], goleador: null, goles: null },
    { date: '16-jun', ranking: ['jc', 'gonza', 'jorge'], goleador: null, goles: null },
    { date: '23-jun', ranking: [], goleador: null, goles: null },
  ],

  aportes: [
    { date: '14-abr', player: 'gonza' },
    { date: '21-abr', player: 'jorge' },
    { date: '12-may', player: 'jc' },
    { date: '19-may', player: 'gonza' },
    { date: '26-may', player: 'jorge' },
    { date: '02-jun', player: 'jc' },
    { date: '16-jun', player: 'gonza' },
    { date: '23-jun', player: 'jorge' },
  ],
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function getPlayerIds() {
  return CONFIG.players.map((p) => p.id)
}

function getPointsForPosition(pos) {
  const p = CONFIG.points
  if (pos === 0) return p.first
  if (pos === 1) return p.second
  if (pos === 2) return p.third
  return 0
}

function computeStandings(matchdays) {
  const ids = getPlayerIds()
  const totals = Object.fromEntries(ids.map((id) => [id, 0]))

  for (const md of matchdays) {
    if (!md.ranking || md.ranking.length === 0) continue
    md.ranking.forEach((playerId, pos) => {
      let pts = getPointsForPosition(pos)
      if (
        CONFIG.points.goalBonusEnabled &&
        md.goleador &&
        md.goleador === playerId
      ) {
        pts += CONFIG.points.goalBonus
      }
      totals[playerId] += pts
    })
  }

  return Object.entries(totals)
    .map(([id, pts]) => ({ id, pts }))
    .sort((a, b) => b.pts - a.pts)
}

function computeCumulativePoints(matchdays) {
  const ids = getPlayerIds()
  const series = Object.fromEntries(ids.map((id) => [id, []]))
  const running = Object.fromEntries(ids.map((id) => [id, 0]))

  for (const md of matchdays) {
    if (!md.ranking || md.ranking.length === 0) {
      ids.forEach((id) => series[id].push(running[id]))
      continue
    }
    md.ranking.forEach((playerId, pos) => {
      let pts = getPointsForPosition(pos)
      if (
        CONFIG.points.goalBonusEnabled &&
        md.goleador &&
        md.goleador === playerId
      ) {
        pts += CONFIG.points.goalBonus
      }
      running[playerId] += pts
    })
    ids.forEach((id) => series[id].push(running[id]))
  }

  return series
}

function getNextAporte() {
  const rot = CONFIG.aporteRotation
  if (DATA.aportes.length === 0) return rot[0]

  const last = DATA.aportes[DATA.aportes.length - 1]
  const player = CONFIG.players.find((p) => p.id === last.player)
  if (!player) return rot[0]

  const idx = rot.indexOf(player.aporte)
  return rot[(idx + 1) % rot.length]
}

// ─────────────────────────────────────────────
//  Google Sheets loader (CSV)
// ─────────────────────────────────────────────

async function fetchCSV(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function parseCSVtoMatchdays(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const result = []

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map((v) => v.trim())
    const row = Object.fromEntries(headers.map((h, idx) => [h, vals[idx] || '']))
    if (!row.fecha) continue

    const normalize = (name) => name.toLowerCase()

    result.push({
      date: row.fecha,
      ranking: row['1°']
        ? [row['1°'], row['2°'], row['3°']].filter(Boolean).map(normalize)
        : [],
      goleador: row.goleador ? normalize(row.goleador) : null,
      goles: parseInt(row.goles, 10) || null,
    })
  }
  return result
}

async function loadFromSheet() {
  if (!CONFIG.sheet.enabled || !CONFIG.sheet.urls.fechas) return null
  try {
    const csv = await fetchCSV(CONFIG.sheet.urls.fechas)
    return parseCSVtoMatchdays(csv)
  } catch {
    console.warn('No se pudo cargar desde Google Sheets, usando datos locales.')
    return null
  }
}
