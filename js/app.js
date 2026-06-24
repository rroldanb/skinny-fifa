// ─────────────────────────────────────────────
//  Main Dashboard Logic
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const matchdays = await initData()
  render(matchdays)
})

async function initData() {
  let matchdays

  if (CONFIG.sheet.enabled && CONFIG.sheet.urls.fechas) {
    const loaded = await loadFromSheet()
    matchdays = loaded || DATA.matchdays
  } else {
    matchdays = DATA.matchdays
  }

  if (CONFIG.sheet.enabled && CONFIG.sheet.urls.avatares) {
    await loadAvatars()
  }

  return matchdays
}

function render(matchdays) {
  const standings = computeStandings(matchdays)
  const cumulative = computeCumulativePoints(matchdays)
  const dates = matchdays.map((m) => m.date)

  renderPlayerCards(standings, matchdays)
  renderResultsTable(matchdays, standings)
  renderAportes(matchdays)

  requestAnimationFrame(() => {
    initChart(cumulative, dates)
  })
}

// ─────────────────────────────────────────────
//  Avatar helpers
// ─────────────────────────────────────────────

function getPlayerAvatar(id) {
  const fromSheet = getAvatarUrl(id)
  if (fromSheet) return fromSheet
  const cfg = CONFIG.players.find((p) => p.id === id)
  return (cfg && cfg.image) || null
}

function makeGoogleDriveDirect(url) {
  const match = url.match(/\/d\/([^/]+)/)
  if (match) return 'https://drive.google.com/uc?export=view&id=' + match[1]
  return url
}

// ─────────────────────────────────────────────
//  Avatar modal
// ─────────────────────────────────────────────

let onAvatarSaved = null

function openAvatarEditor(playerId, onSave) {
  onAvatarSaved = onSave
  const current = getPlayerAvatar(playerId)
  const playerCfg = CONFIG.players.find((p) => p.id === playerId)

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'

  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" aria-label="Cerrar">&times;</button>
      <h3 class="modal-title">Foto de ${playerCfg.name}</h3>

      <div class="modal-preview" id="modalPreview">
        ${current
          ? `<img src="${current}" alt="${playerCfg.name}" onerror="this.parentElement.innerHTML='<span class=\\'modal-preview-fallback\\'>${playerCfg.emoji}</span>'">`
          : `<span class="modal-preview-fallback">${playerCfg.emoji}</span>`
        }
      </div>

      <label class="modal-label">URL de la imagen</label>
      <input class="modal-input" id="avatarInput" type="text"
        placeholder="https://...jpg"
        value="${current || ''}">
      <p class="modal-hint">📎 Google Drive: pegá el link y lo convertimos solo</p>

      <div class="modal-info" id="modalInfo" style="display:none">
        <p>✅ URL copiada al portapapeles.<br>Abrí la pestaña <strong>Avatares</strong> del sheet y pegala en la celda de <strong>${playerCfg.name}</strong>.</p>
      </div>

      <div class="modal-actions">
        <button class="modal-btn modal-btn-primary" id="avatarSave">Copiar URL y guardar en Sheet</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))

  const input = overlay.querySelector('#avatarInput')
  const preview = overlay.querySelector('#modalPreview')
  const info = overlay.querySelector('#modalInfo')

  input.addEventListener('input', () => {
    const url = makeGoogleDriveDirect(input.value.trim())
    if (url) {
      preview.innerHTML = `<img src="${url}" alt="preview" onerror="this.outerHTML='<span class=\\'modal-preview-fallback\\'>❌</span>'">`
    } else {
      preview.innerHTML = `<span class="modal-preview-fallback">${playerCfg.emoji}</span>`
    }
  })

  overlay.querySelector('#avatarSave').addEventListener('click', async () => {
    const url = makeGoogleDriveDirect(input.value.trim())
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback: select the input so user can copy manually
      input.select()
    }
    info.style.display = 'block'
    overlay.querySelector('.modal-actions').style.display = 'none'
    if (onAvatarSaved) onAvatarSaved()
  })

  overlay.querySelector('.modal-close').addEventListener('click', () => {
    document.body.removeChild(overlay)
  })

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay)
  })
}

// ─────────────────────────────────────────────
//  Player Cards
// ─────────────────────────────────────────────

function renderPlayerCards(standings, matchdays) {
  const container = document.getElementById('playerCards')
  container.innerHTML = ''

  standings.forEach((s, idx) => {
    const playerCfg = CONFIG.players.find((p) => p.id === s.id)
    if (!playerCfg) return

    const isLeader = idx === 0 && s.pts > 0
    const card = document.createElement('div')
    card.className = 'player-card' + (isLeader ? ' leader' : '')
    card.style.setProperty('--player-color', playerCfg.colorRgb)

    const avatarUrl = getPlayerAvatar(s.id)

    const avatarHtml = avatarUrl
      ? `<div class="player-avatar"><img src="${avatarUrl}" alt="${playerCfg.name}" onerror="this.outerHTML='<span class=\\'player-emoji\\'>${playerCfg.emoji}</span>'"></div>`
      : `<span class="player-emoji">${playerCfg.emoji}</span>`

    card.innerHTML = `
      <button class="edit-avatar-btn" data-player="${s.id}" title="Cambiar foto">✏️</button>
      ${avatarHtml}
      <div class="player-name">${playerCfg.name}</div>
      <div class="player-aporte">${playerCfg.aporte}</div>
      <div class="player-points-wrap">
        <span class="player-points" data-target="${s.pts}">0</span>
        <span class="player-points-label">pts</span>
      </div>
    `

    container.appendChild(card)

    card.querySelector('.edit-avatar-btn').addEventListener('click', () => {
      openAvatarEditor(s.id, () => renderPlayerCards(standings, matchdays))
    })

    requestAnimationFrame(() => {
      card.classList.add('visible')
    })

    const ptsEl = card.querySelector('.player-points')
    animateCounter(ptsEl, s.pts, 800)

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mouse-x', e.clientX - rect.left + 'px')
      card.style.setProperty('--mouse-y', e.clientY - rect.top + 'px')
    })
  })
}

function animateCounter(el, target, duration) {
  const start = performance.now()
  const initial = 0

  function update(now) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)

    const eased = 1 - Math.pow(1 - progress, 3)
    const current = Math.round(initial + (target - initial) * eased)

    el.textContent = current

    if (progress < 1) {
      requestAnimationFrame(update)
    } else {
      el.textContent = target
      el.classList.add('points-animate')
    }
  }

  requestAnimationFrame(update)
}

// ─────────────────────────────────────────────
//  Results Table
// ─────────────────────────────────────────────

function renderResultsTable(matchdays, standings) {
  const table = document.getElementById('resultsTable')
  const thead = table.querySelector('thead')
  const tbody = table.querySelector('tbody')

  const playerIds = getPlayerIds()

  // Build header
  const headerCells = ['Fecha', '🥇', '🥈', '🥉', 'Goleador']
  playerIds.forEach((id) => {
    const p = CONFIG.players.find((pl) => pl.id === id)
    headerCells.push(p ? p.name : id)
  })

  thead.innerHTML = ''
  const headRow = document.createElement('tr')
  headerCells.forEach((h) => {
    const th = document.createElement('th')
    th.textContent = h
    headRow.appendChild(th)
  })
  thead.appendChild(headRow)

  // Build body (most recent first)
  tbody.innerHTML = ''
  const reversed = [...matchdays].reverse()

  reversed.forEach((md) => {
    const tr = document.createElement('tr')
    if (!md.ranking || md.ranking.length === 0) {
      tr.classList.add('future-date')
    }

    // Date cell
    const dateCell = document.createElement('td')
    dateCell.textContent = md.date
    tr.appendChild(dateCell)

    // Podium cells
    for (let i = 0; i < 3; i++) {
      const cell = document.createElement('td')
      const playerId = md.ranking && md.ranking[i] ? md.ranking[i] : null
      if (playerId) {
        const p = CONFIG.players.find((pl) => pl.id === playerId)
        const podiumClass = `podium-${i + 1}`
        cell.className = podiumClass + ' player-name-cell'
        cell.textContent = p ? p.name : playerId
      } else {
        cell.textContent = '–'
      }
      tr.appendChild(cell)
    }

    // Goleador cell
    const goleadorCell = document.createElement('td')
    if (md.goleador) {
      const p = CONFIG.players.find((pl) => pl.id === md.goleador)
      goleadorCell.textContent = (p ? p.name : md.goleador) + ' ⚽'
    } else {
      goleadorCell.textContent = '–'
    }
    tr.appendChild(goleadorCell)

    // Points per player
    playerIds.forEach((id) => {
      const cell = document.createElement('td')
      cell.className = `pts-${id}`
      if (md.ranking && md.ranking.length > 0) {
        const pos = md.ranking.indexOf(id)
        let pts = 0
        if (pos >= 0) {
          pts = getPointsForPosition(pos)
          if (
            CONFIG.points.goalBonusEnabled &&
            md.goleador === id
          ) {
            pts += CONFIG.points.goalBonus
          }
        }
        cell.textContent = pts
      } else {
        cell.textContent = '–'
      }
      tr.appendChild(cell)
    })

    tbody.appendChild(tr)
  })
}

// ─────────────────────────────────────────────
//  Aportes
// ─────────────────────────────────────────────

function renderAportes(matchdays) {
  const container = document.getElementById('aportesContainer')
  const rot = CONFIG.aporteRotation
  const nPlayers = CONFIG.players.length

  const aporteEnFecha = (fechaIdx, playerIdx) => {
    const offset = CONFIG.rotationOffset || 0
    const idx = ((fechaIdx - playerIdx + offset) % nPlayers + nPlayers) % nPlayers
    return rot[idx]
  }

  let html = `
    <div class="table-wrapper aportes-table-wrap">
      <table class="chalk-table aportes-table">
        <thead>
          <tr>
            <th>Fecha</th>
            ${CONFIG.players.map(p => `<th>${p.emoji} ${p.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `

  // Próxima fecha (arriba de todo, destacada)
  const nextIdx = matchdays.length
  html += `<tr class="aporte-next">
    <td>Próxima</td>
    ${CONFIG.players.map((p, pi) => `<td class="aporte-tipo">${aporteEnFecha(nextIdx, pi)}</td>`).join('')}
  </tr>`

  // Fechas jugadas (más reciente primero)
  const reversed = [...matchdays].reverse()
  reversed.forEach((md) => {
    const origIdx = matchdays.indexOf(md)
    const jugada = md.ranking && md.ranking.length > 0
    html += `<tr class="${jugada ? '' : 'future-date'}">
      <td>${md.date}</td>
      ${CONFIG.players.map((p, pi) => {
        const tipo = aporteEnFecha(origIdx, pi)
        return `<td class="aporte-tipo">${tipo}</td>`
      }).join('')}
    </tr>`
  })

  html += `</tbody></table></div>`

  container.innerHTML = html
}
