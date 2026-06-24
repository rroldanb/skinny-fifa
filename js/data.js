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

// ─────────────────────────────────────────────
//  Avatars
// ─────────────────────────────────────────────

let avatarsData = null

function parseCSVtoAvatars(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return {}
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const result = {}
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map((v) => v.trim())
    const row = Object.fromEntries(headers.map((h, idx) => [h, vals[idx] || '']))
    if (row.jugador) result[row.jugador] = row.url || ''
  }
  return result
}

async function loadAvatars() {
  if (!CONFIG.sheet.enabled || !CONFIG.sheet.urls.avatares) return
  try {
    const csv = await fetchCSV(CONFIG.sheet.urls.avatares)
    avatarsData = parseCSVtoAvatars(csv)
  } catch {
    console.warn('No se pudieron cargar los avatares.')
  }
}

function getAvatarUrl(id) {
  return (avatarsData && avatarsData[id]) || null
}

// ─────────────────────────────────────────────
//  Sheet loader
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  Detalles (per-player match data)
// ─────────────────────────────────────────────

function parseCSVtoDetalles(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const colMap = { gg: 'g' }
  const mapped = headers.map((h) => colMap[h] || h)

  const byDate = {}

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map((v) => v.trim())
    const row = Object.fromEntries(mapped.map((h, idx) => [h, vals[idx] || '']))
    if (!row.fecha) continue
    if (!byDate[row.fecha]) byDate[row.fecha] = { date: row.fecha, detalles: [] }

    byDate[row.fecha].detalles.push({
      player: row.jugador.trim().toLowerCase(),
      equipo: row.equipo || '',
      gf: parseInt(row.gf, 10) || 0,
      gc: parseInt(row.gc, 10) || 0,
      goleador: row.goleador || null,
      g: row.goleador ? parseInt(row.g, 10) || null : null,
    })
  }

  return Object.values(byDate)
}

let detallesData = null

async function loadDetalles() {
  if (!CONFIG.sheet.enabled || !CONFIG.sheet.urls.detalles) return
  try {
    const csv = await fetchCSV(CONFIG.sheet.urls.detalles)
    detallesData = parseCSVtoDetalles(csv)
  } catch {
    console.warn('No se pudieron cargar los detalles.')
  }
}

function mergeDetallesIntoMatchdays(matchdays) {
  if (!detallesData) return
  const map = Object.fromEntries(detallesData.map((d) => [d.date, d.detalles]))
  for (const md of matchdays) {
    if (map[md.date]) {
      md.detalles = map[md.date]
    }
  }
}

// ─────────────────────────────────────────────
//  Player Stats (accumulated)
// ─────────────────────────────────────────────

function computePlayerStats(matchdays) {
  const ids = getPlayerIds()
  const stats = Object.fromEntries(ids.map((id) => [id, { totalGF: 0, totalGC: 0, goleadorCount: 0, equipos: {} }]))

  for (const md of matchdays) {
    if (!md.detalles) continue
    for (const d of md.detalles) {
      if (!stats[d.player]) continue
      stats[d.player].totalGF += d.gf
      stats[d.player].totalGC += d.gc
      if (d.equipo) {
        stats[d.player].equipos[d.equipo] = (stats[d.player].equipos[d.equipo] || 0) + 1
      }
      if (d.goleador) {
        stats[d.player].goleadorCount++
      }
    }
  }

  return stats
}

function getMostUsedTeam(equipos) {
  const entries = Object.entries(equipos)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  return { team: entries[0][0], count: entries[0][1] }
}
