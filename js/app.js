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

  if (CONFIG.sheet.enabled && CONFIG.sheet.urls.detalles) {
    await loadDetalles()
    mergeDetallesIntoMatchdays(matchdays)
  }

  return matchdays
}

function render(matchdays) {
  const standings = computeStandings(matchdays)
  const cumulative = computeCumulativePoints(matchdays)
  const playerStats = computePlayerStats(matchdays)
  const dates = matchdays.map((m) => m.date)

  renderPlayerCards(standings, playerStats)
  renderMatchdayCards(matchdays)
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

function renderPlayerCards(standings, playerStats) {
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

    const st = playerStats[s.id] || null
    let statsHtml = ''
    if (st) {
      const dif = st.totalGF - st.totalGC
      const difSign = dif >= 0 ? '+' : ''
      const difClass = dif >= 0 ? 'pos' : 'neg'
      const mostUsed = getMostUsedTeam(st.equipos)
      const equipoHtml = mostUsed
        ? `<span class="stat stat-equipo">🔄 ${mostUsed.team} (${mostUsed.count})</span>`
        : ''

      statsHtml = `
        <div class="player-stats-row">
          <span class="stat stat-gf">⚽ ${st.totalGF}</span>
          <span class="stat stat-gc">🛡️ ${st.totalGC}</span>
          <span class="stat stat-dif ${difClass}">± ${difSign}${dif}</span>
        </div>
        <div class="player-stats-row">
          <span class="stat stat-goleador">🏆 ${st.goleadorCount}gol</span>
          ${equipoHtml}
        </div>
      `
    }

    card.innerHTML = `
      <button class="edit-avatar-btn" data-player="${s.id}" title="Cambiar foto">✏️</button>
      ${avatarHtml}
      <div class="player-name">${playerCfg.name}</div>
      <div class="player-aporte">${playerCfg.aporte}</div>
      <div class="player-points-wrap">
        <span class="player-points" data-target="${s.pts}">0</span>
        <span class="player-points-label">pts</span>
      </div>
      ${statsHtml}
    `

    container.appendChild(card)

    card.querySelector('.edit-avatar-btn').addEventListener('click', () => {
      openAvatarEditor(s.id, () => renderPlayerCards(standings, playerStats))
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
//  Matchday Cards
// ─────────────────────────────────────────────

function renderMatchdayCards(matchdays) {
  const container = document.getElementById('matchdayCards')
  container.innerHTML = ''

  const reversed = [...matchdays].reverse()
  const medals = ['🥇', '🥈', '🥉']

  reversed.forEach((md) => {
    const hasRanking = md.ranking && md.ranking.length > 0
    const hasDetalles = md.detalles && md.detalles.length > 0

    const card = document.createElement('div')
    card.className = 'matchday-card'
    if (!hasRanking) card.classList.add('future-date')

    let html = `<div class="mdc-header">
      <span class="mdc-date">${md.date}</span>`

    if (hasRanking) {
      html += `<span class="mdc-podium">`
      md.ranking.forEach((pid, i) => {
        const p = CONFIG.players.find((pl) => pl.id === pid)
        if (p) html += `${medals[i]} ${p.name} `
      })
      html += `</span>`
    }
    html += `</div>`

    if (hasDetalles) {
      html += `<div class="mdc-body">`
      html += `<div class="mdc-row mdc-header-row">
        <span class="mdc-group mdc-group-left">
          <span class="mdc-player">Jugador</span>
          <span class="mdc-team">Equipo</span>
          <span class="mdc-pts">Pts</span>
        </span>
        <span class="mdc-group mdc-group-center">
          <span class="mdc-gf">GF</span>
          <span class="mdc-gc">GC</span>
          <span class="mdc-dg">DG</span>
        </span>
        <span class="mdc-group mdc-group-right">
          <span class="mdc-goleador">Goleador</span>
        </span>
      </div>`
      md.detalles.forEach((d) => {
        const p = CONFIG.players.find((pl) => pl.id === d.player)
        if (!p) return

        const pos = hasRanking ? md.ranking.indexOf(d.player) : -1
        const pts = pos >= 0 ? getPointsForPosition(pos) : 0
        const goalBonus = CONFIG.points.goalBonusEnabled && md.goleador === d.player
          ? CONFIG.points.goalBonus : 0
        const totalPts = pts + goalBonus
        const medal = pos >= 0 ? medals[pos] : ''
        const dg = d.gf - d.gc
        const dgSign = dg >= 0 ? '+' : ''
        const dgClass = dg > 0 ? 'dg-pos' : dg < 0 ? 'dg-neg' : ''

        html += `<div class="mdc-row">`
        html += `<span class="mdc-group mdc-group-left">
          <span class="mdc-player">${p.emoji} ${p.name}</span>
          <span class="mdc-team">${d.equipo}</span>
          <span class="mdc-pts">${medal}${totalPts > 0 ? '+' + totalPts : ''}</span>
        </span>`
        html += `<span class="mdc-group mdc-group-center">
          <span class="mdc-gf">${d.gf}</span>
          <span class="mdc-gc">${d.gc}</span>
          <span class="mdc-dg ${dgClass}">${dgSign}${dg}</span>
        </span>`
        html += `<span class="mdc-group mdc-group-right">
          ${d.goleador ? `<span class="mdc-goleador">⭐${d.goleador} ${d.g}</span>` : ''}
        </span>`
        html += `</div>`
      })
      html += `</div>`
    }

    card.innerHTML = html
    container.appendChild(card)
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
