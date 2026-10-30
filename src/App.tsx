
import { useEffect, useMemo, useState } from 'react'
import {
  Compass, Map, Sparkles, Trophy, Search, LockKeyhole,
  Trees, Footprints, CircleHelp, ChevronRight, RotateCcw, ShieldCheck,
  Menu, X, Clock3, Flame, Gem, Leaf, Mountain, TreePine
} from 'lucide-react'
import { supabase } from './lib/supabase'
import WalletConnect from './components/WalletConnect'
import JungleGame from './game3d/JungleGame'

type Tile = {
  id: number
  kind: 'forest' | 'path' | 'water' | 'ruins' | 'cave' | 'shrine' | 'clearing'
  discovered: boolean
  searched: boolean
}

type Hunt = {
  id: string
  round_id: number
  status: string
  prize_wei: string | number | null
  map_version: string | null
  starts_at: string | null
  ends_at: string | null
}

type DbClue = {
  clue_order: number
  public_text: string
  unlock_at?: string | null
}

type DbStatus = 'checking' | 'connected' | 'missing' | 'error'

const initialKinds: Tile['kind'][] = [
  'forest','forest','path','forest','forest','forest','clearing','forest',
  'forest','path','path','forest','water','water','forest','forest',
  'forest','forest','ruins','path','path','forest','forest','forest',
  'path','path','forest','forest','cave','forest','path','forest',
  'forest','water','water','path','forest','forest','path','clearing',
  'forest','forest','path','path','ruins','forest','forest','forest',
  'forest','path','forest','forest','path','path','shrine','forest',
  'forest','forest','clearing','path','forest','forest','forest','forest'
]

const tileInfo: Record<Tile['kind'], { label: string; icon: string; detail: string }> = {
  forest: { label: 'Dense forest', icon: '🌲', detail: 'Thick vines and ancient trees block the way.' },
  path: { label: 'Overgrown path', icon: '🪵', detail: 'A narrow trail leads deeper into the jungle.' },
  water: { label: 'River', icon: '🌊', detail: 'Cold water rushes between moss-covered stones.' },
  ruins: { label: 'Ancient ruins', icon: '🗿', detail: 'Old markings are carved into the stone.' },
  cave: { label: 'Hidden cave', icon: '🕳️', detail: 'A dark opening disappears beneath the roots.' },
  shrine: { label: 'Forgotten shrine', icon: '💎', detail: 'A strange green glow leaks from the ground.' },
  clearing: { label: 'Forest clearing', icon: '🌿', detail: 'Moonlight falls across a patch of soft moss.' },
}

const initialTiles: Tile[] = initialKinds.map((kind, id) => ({
  id,
  kind,
  discovered: [0, 1, 8, 9, 10, 16, 17, 18, 24, 25, 32, 40].includes(id),
  searched: false,
}))

function formatPrize(wei: string | number | null | undefined): string {
  if (wei === null || wei === undefined || wei === '') return '—'

  try {
    const value = BigInt(String(wei))
    const whole = value / 1000000000000000000n
    const fraction = value % 1000000000000000000n
    const fractionText = fraction.toString().padStart(18, '0').replace(/0+$/, '')
    return fractionText ? `${whole}.${fractionText}` : whole.toString()
  } catch {
    return '—'
  }
}

export default function App() {
  const [dbStatus, setDbStatus] = useState<DbStatus>('checking')
  const [dbMessage, setDbMessage] = useState('Checking Supabase connection...')
  const [hunt, setHunt] = useState<Hunt | null>(null)
  const [dbClues, setDbClues] = useState<DbClue[]>([])
  const [dataMessage, setDataMessage] = useState('Loading hunt data...')
  const [reloadKey, setReloadKey] = useState(0)

  const [tiles, setTiles] = useState(initialTiles)
  const [selected, setSelected] = useState(18)
  const [activeTab, setActiveTab] = useState<'map' | 'clues' | 'winners'>('map')
  const [searchedCount, setSearchedCount] = useState(0)
  const [notice, setNotice] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [clueUnlocked, setClueUnlocked] = useState(1)

  useEffect(() => {
    let active = true

    async function loadHuntData() {
      if (!supabase) {
        setDbStatus('missing')
        setDbMessage('Supabase configuration is missing')
        setDataMessage('Cannot load hunt data until Supabase is configured.')
        return
      }

      setDbStatus('checking')
      setDbMessage('Connecting to database...')
      setDataMessage('Loading active hunt...')

      try {
        const { data: huntData, error: huntError } = await supabase
          .from('hunts')
          .select('id, round_id, status, prize_wei, map_version, starts_at, ends_at')
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!active) return

        if (huntError) {
          console.error('Hunt query failed:', huntError.message)
          setDbStatus('error')
          setDbMessage('Database query failed')
          setDataMessage('Could not load the hunt. Check database permissions.')
          return
        }

        setDbStatus('connected')
        setDbMessage('Connected to Supabase')

        if (!huntData) {
          setHunt(null)
          setDbClues([])
          setDataMessage('No live hunt is available right now.')
          return
        }

        const currentHunt = huntData as Hunt
        setHunt(currentHunt)

        const { data: clueData, error: clueError } = await supabase
          .from('clues')
          .select('clue_order, public_text, unlock_at')
          .eq('hunt_id', currentHunt.id)
          .order('clue_order', { ascending: true })

        if (!active) return

        if (clueError) {
          console.error('Clue query failed:', clueError.message)
          setDbClues([])
          setDataMessage('Hunt loaded, but clues could not be loaded.')
          return
        }

        const now = Date.now()
        const availableClues = ((clueData ?? []) as DbClue[]).filter(
          clue => !clue.unlock_at || new Date(clue.unlock_at).getTime() <= now
        )

        setDbClues(availableClues)
        setDataMessage(
          `Round ${currentHunt.round_id} loaded · ${availableClues.length} available clues`
        )
      } catch (error) {
        if (!active) return
        console.error('Supabase request failed:', error)
        setDbStatus('error')
        setDbMessage('Unable to reach Supabase')
        setDataMessage('A connection error occurred. Please refresh the page.')
      }
    }

    loadHuntData()

    return () => {
      active = false
    }
  }, [reloadKey])

  const discoveredCount = useMemo(
    () => tiles.filter(tile => tile.discovered).length,
    [tiles]
  )

  const current = tiles.find(tile => tile.id === selected) ?? tiles[0]
  const info = tileInfo[current.kind]

  function explore() {
    if (current.searched) {
      setNotice('You already searched this tile. Try another part of the jungle.')
      return
    }

    setTiles(prev =>
      prev.map(tile =>
        tile.id === selected
          ? { ...tile, searched: true, discovered: true }
          : tile
      )
    )

    setSearchedCount(count => count + 1)

    if (current.kind === 'ruins' || current.kind === 'cave') {
      setClueUnlocked(count => Math.min(dbClues.length || 1, count + 1))
      setNotice('Ancient markings discovered! This is a local map demo.')
    } else if (current.kind === 'shrine') {
      setNotice('A mysterious green glow... No real ETH is awarded by this demo.')
    } else {
      setNotice('Nothing here yet. The jungle keeps its secrets. Keep exploring!')
    }
  }

  function resetDemo() {
    setTiles(initialTiles)
    setSelected(18)
    setSearchedCount(0)
    setClueUnlocked(1)
    setNotice('Demo reset. A new expedition begins!')
  }

  const prize = formatPrize(hunt?.prize_wei)
  const isLive = hunt?.status === 'live'

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#" aria-label="ETH Jungle home">
          <span className="brand-mark"><Trees size={23} strokeWidth={2.4} /></span>
          <span className="brand-name">
            ETH<span>JUNGLE</span>
            <small>THE DAILY TREASURE HUNT</small>
          </span>
        </a>

        <nav className="desktop-nav">
          <button className={activeTab === 'map' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('map')}>
            <Map size={16} /> Explore
          </button>
          <button className={activeTab === 'clues' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('clues')}>
            <Sparkles size={16} /> Clues
          </button>
          <button className={activeTab === 'winners' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('winners')}>
            <Trophy size={16} /> Hall of Hunters
          </button>
        </nav>

        <div className="top-actions">
          <span className="network-pill">
            <span className="status-dot" /> RH TESTNET
          </span>

          <WalletConnect />

          <button
            className="mobile-menu-btn"
            onClick={() => setShowMobileMenu(v => !v)}
            aria-label="Toggle menu"
          >
            {showMobileMenu ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {showMobileMenu && (
        <div className="mobile-nav">
          <button onClick={() => { setActiveTab('map'); setShowMobileMenu(false) }}><Map size={16} /> Explore</button>
          <button onClick={() => { setActiveTab('clues'); setShowMobileMenu(false) }}><Sparkles size={16} /> Clues</button>
          <button onClick={() => { setActiveTab('winners'); setShowMobileMenu(false) }}><Trophy size={16} /> Hall of Hunters</button>
        </div>
      )}

      <div className={`db-status db-status-${dbStatus}`} role="status" aria-live="polite">
        <span className="db-status-dot" />
        <span>DATABASE: {dbMessage}</span>
        <button className="icon-button" onClick={() => setReloadKey(key => key + 1)} title="Reload database data">
          <RotateCcw size={14} />
        </button>
      </div>

      <main>
        <section className="hero-row">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> THE WILD IS CALLING</div>
            <h1>FIND THE<br /><span>HIDDEN ETH.</span></h1>
            <p>Explore the forgotten jungle. Follow ancient clues. Be the first hunter to uncover the daily treasure.</p>
            <div className="hero-buttons">
              <button className="primary-button" onClick={() => {
                setActiveTab('map')
                document.getElementById('game')?.scrollIntoView({ behavior: 'smooth' })
              }}>
                <Compass size={17} /> ENTER THE JUNGLE <ChevronRight size={17} />
              </button>
              <span className="hero-note"><span className="pulse-dot" /> {isLive ? 'LIVE HUNT IN DATABASE' : 'NO LIVE HUNT'}</span>
            </div>
          </div>

          <div className="prize-card">
            <div className="prize-top">
              <span className="live-indicator"><span /> {isLive ? 'DATABASE HUNT' : 'NO LIVE HUNT'}</span>
              <span className="prize-label">TODAY'S TREASURE</span>
            </div>
            <div className="eth-emblem">
              <div className="eth-diamond"><span /><i /></div>
              <div className="orbit orbit-a" />
              <div className="orbit orbit-b" />
            </div>
            <div className="prize-amount">{hunt ? prize : '—'} <span>ETH</span></div>
            <div className="prize-caption">
              DATABASE PRIZE <span className="prize-separator" />
              <LockKeyhole size={13} /> DEMO — NO PAYOUT ENABLED
            </div>
            <div className="prize-bottom">
              <div><span className="stat-label">ROUND</span><strong>{hunt ? hunt.round_id : '—'}</strong></div>
              <div><span className="stat-label">MAP VERSION</span><strong>{hunt?.map_version || '—'}</strong></div>
              <div><span className="stat-label">STATUS</span><strong>{hunt?.status?.toUpperCase() || 'NONE'}</strong></div>
            </div>
          </div>
        </section>

        <section className="status-strip">
          <div className="strip-item">
            <span className="strip-icon"><Clock3 size={17} /></span>
            <div><small>ROUND STATUS</small><strong>{hunt ? hunt.status.toUpperCase() : 'NO LIVE HUNT'}</strong></div>
          </div>
          <div className="strip-item">
            <span className="strip-icon"><Footprints size={17} /></span>
            <div><small>YOUR EXPEDITION</small><strong>{searchedCount} TILES SEARCHED</strong></div>
          </div>
          <div className="strip-item">
            <span className="strip-icon"><ShieldCheck size={17} /></span>
            <div><small>PRIZE SECURITY</small><strong>CONTRACT NOT VERIFIED</strong></div>
          </div>
          <div className="strip-item">
            <span className="strip-icon"><Flame size={17} /></span>
            <div><small>JUNGLE DIFFICULTY</small><strong>UNPREDICTABLE</strong></div>
          </div>
        </section>

        <section className="game-section" id="game">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR EXPEDITION</div>
              <h2>THE JUNGLE <span>MAP</span></h2>
            </div>
            <div className="map-controls">
              <span className="legend"><i className="legend-dot discovered" /> DISCOVERED</span>
              <span className="legend"><i className="legend-dot hidden" /> UNEXPLORED</span>
              <button className="icon-button" onClick={resetDemo} title="Reset demo"><RotateCcw size={16} /></button>
            </div>
          </div>

          <JungleGame />

          <div className="game-layout">
            <div className="map-panel">
              <div className="map-topline">
                <span><span className="map-live-dot" /> SECTOR 07 — THE EMERALD WILD</span>
                <span>MAP / DEMO</span>
              </div>

              <div className="jungle-map" role="grid" aria-label="Interactive jungle map">
                {tiles.map(tile => {
                  const seen = tile.discovered || tile.searched
                  return (
                    <button
                      key={tile.id}
                      role="gridcell"
                      aria-label={seen ? `${tileInfo[tile.kind].label}, tile ${tile.id + 1}` : `Unexplored tile ${tile.id + 1}`}
                      className={`map-tile kind-${tile.kind} ${seen ? 'seen' : 'fog'} ${tile.searched ? 'searched' : ''} ${selected === tile.id ? 'selected' : ''}`}
                      onClick={() => { setSelected(tile.id); setNotice('') }}
                    >
                      <span className="tile-texture">
                        {tile.kind === 'forest' ? '♣'
                          : tile.kind === 'path' ? '·'
                          : tile.kind === 'water' ? '≈'
                          : tile.kind === 'ruins' ? '▥'
                          : tile.kind === 'cave' ? '◉'
                          : tile.kind === 'shrine' ? '◆'
                          : '✦'}
                      </span>
                      {tile.searched && <span className="searched-mark">✓</span>}
                      {selected === tile.id && <span className="player-marker">▲</span>}
                    </button>
                  )
                })}
                <div className="map-coord coord-nw">N / 07</div>
                <div className="map-coord coord-se">E / 24</div>
                <div className="map-compass">N<span>↑</span></div>
              </div>

              <div className="map-footer">
                <span><span className="footer-square" /> PIXEL GRID: 8 × 8</span>
                <span>SELECT A TILE TO INVESTIGATE</span>
              </div>
            </div>

            <aside className="side-panel">
              {activeTab === 'map' && (
                <>
                  <div className="panel-heading">
                    <span className="panel-icon"><Search size={17} /></span>
                    <div><small>SCOUT REPORT</small><h3>Investigate Area</h3></div>
                  </div>
                  <div className="selected-art">
                    {current.discovered
                      ? <span className="big-terrain">{tileInfo[current.kind].icon}</span>
                      : <span className="unknown-terrain">?</span>}
                    <span className="terrain-tag">
                      {current.discovered ? info.label.toUpperCase() : 'UNDISCOVERED AREA'}
                    </span>
                  </div>
                  <p className="area-description">
                    {current.discovered ? info.detail : 'Dense mist covers this area. Select INVESTIGATE to reveal what may be hidden here.'}
                  </p>
                  <div className="area-meta">
                    <span>GRID COORDINATE</span>
                    <strong>{String(Math.floor(selected / 8) + 1).padStart(2, '0')} : {String(selected % 8 + 1).padStart(2, '0')}</strong>
                  </div>
                  <button className="primary-button full-button" onClick={explore} disabled={current.searched}>
                    <Search size={16} /> {current.searched ? 'ALREADY SEARCHED' : 'INVESTIGATE TILE'} <ChevronRight size={16} />
                  </button>
                  {notice && <div className="notice"><Sparkles size={15} /><span>{notice}</span></div>}
                  <div className="side-hint"><CircleHelp size={15} /><span>Map exploration is currently a local demo.</span></div>
                </>
              )}

              {activeTab === 'clues' && (
                <>
                  <div className="panel-heading">
                    <span className="panel-icon"><Sparkles size={17} /></span>
                    <div><small>FIELD NOTES</small><h3>Clue Journal</h3></div>
                  </div>
                  <p className="area-description">
                    {hunt ? `Round ${hunt.round_id} · Clues loaded from the database.` : 'No live hunt is available.'}
                  </p>

                  {dbClues.length === 0 ? (
                    <div className="empty-winners">
                      <div className="empty-trophy"><LockKeyhole size={25} /></div>
                      <strong>No clues available</strong>
                      <p>{dataMessage}</p>
                    </div>
                  ) : (
                    <div className="clue-list">
                      {dbClues.map(clue => (
                        <div className="clue-card unlocked" key={clue.clue_order}>
                          <div className="clue-number">{String(clue.clue_order).padStart(2, '0')}</div>
                          <div>
                            <strong>Jungle clue {clue.clue_order}</strong>
                            <p>{clue.public_text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="secondary-button full-button" onClick={() => setActiveTab('map')}>
                    <Map size={16} /> RETURN TO MAP
                  </button>
                </>
              )}

              {activeTab === 'winners' && (
                <>
                  <div className="panel-heading">
                    <span className="panel-icon"><Trophy size={17} /></span>
                    <div><small>JUNGLE LEGENDS</small><h3>Hall of Hunters</h3></div>
                  </div>
                  <div className="empty-winners">
                    <div className="empty-trophy"><Trophy size={28} /></div>
                    <strong>No verified winners yet</strong>
                    <p>Winner and payout details will appear only after the production verification system is implemented.</p>
                  </div>
                  <div className="winner-note">
                    <ShieldCheck size={16} />
                    <span>No on-chain payout has been verified by this demo.</span>
                  </div>
                  <button className="secondary-button full-button" onClick={() => setActiveTab('map')}>
                    <Compass size={16} /> START EXPLORING
                  </button>
                </>
              )}

              <div className="panel-bottom">
                <span><span className="mini-dot" /> {dbStatus === 'connected' ? 'DATABASE CONNECTED' : 'DEMO ENVIRONMENT'}</span>
                <span>BUILD 0.2.0</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="how-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> THE HUNT</div>
              <h2>THREE STEPS. <span>ONE TREASURE.</span></h2>
            </div>
          </div>
          <div className="steps-grid">
            <article className="step-card">
              <div className="step-number">01</div><div className="step-icon"><Compass size={22} /></div>
              <h3>EXPLORE</h3><p>Move through the pixel jungle. Investigate clearings, caves and forgotten ruins.</p>
              <span className="step-decoration">↗</span>
            </article>
            <article className="step-card">
              <div className="step-number">02</div><div className="step-icon"><Search size={22} /></div>
              <h3>DECODE</h3><p>Read the clues and connect the signs. The map is currently a demo.</p>
              <span className="step-decoration">⌁</span>
            </article>
            <article className="step-card">
              <div className="step-number">03</div><div className="step-icon"><Gem size={22} /></div>
              <h3>CLAIM</h3><p>Real rewards are not available until secure on-chain claiming is implemented.</p>
              <span className="step-decoration">✦</span>
            </article>
          </div>
        </section>

        <section className="bottom-cta">
          <div className="cta-art"><TreePine size={72} /><Mountain size={48} /><Leaf size={27} /></div>
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> YOUR LEGEND STARTS HERE</div>
            <h2>THE JUNGLE REMEMBERS<br /><span>EVERY HUNTER.</span></h2>
            <p>Every trail hides a story. Will you be the one to find the treasure?</p>
          </div>
          <button className="primary-button" onClick={() => {
            setActiveTab('map')
            document.getElementById('game')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            BEGIN EXPLORATION <ChevronRight size={17} />
          </button>
        </section>
      </main>

      <footer>
        <a className="footer-brand" href="#"><Trees size={17} /> ETH JUNGLE</a>
        <span>AN EXPERIMENTAL TREASURE HUNT · DEMO ONLY</span>
        <span>© 2026 ETH JUNGLE</span>
      </footer>

      <div className="demo-disclaimer">
        <ShieldCheck size={15} />
        <span>
          <strong>EXPERIMENTAL:</strong> Wallet connection enabled.
          Blockchain transactions, winner verification, and ETH payouts are not enabled yet.
        </span>
      </div>
    </div>
  )
}
