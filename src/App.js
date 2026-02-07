import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

const MAJORS = [
  { id: 'masters', name: 'The Masters' },
  { id: 'pga', name: 'PGA Championship' },
  { id: 'usopen', name: 'US Open' },
  { id: 'open', name: 'The Open' }
];

const App = () => {
  const [odds, setOdds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'avgOdds', direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(MAJORS[0]);
  const [bookmakers, setBookmakers] = useState([]);
  const [userRegion, setUserRegion] = useState('uk');
  const [oddsFormat, setOddsFormat] = useState('decimal');

  useEffect(() => {
    detectUserRegion();
  }, []);

  useEffect(() => {
    loadMockData();
  }, [userRegion]);

  const detectUserRegion = async () => {
    const saved = localStorage.getItem('userRegion');
    if (saved) {
      setUserRegion(saved);
      setOddsFormat(saved === 'us' ? 'american' : 'decimal');
      return;
    }

    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const region = ['US', 'CA'].includes(data.country_code) ? 'us' : 'uk';
      setUserRegion(region);
      setOddsFormat(region === 'us' ? 'american' : 'decimal');
      localStorage.setItem('userRegion', region);
    } catch {
      setUserRegion('uk');
      setOddsFormat('decimal');
    }
  };

  const loadMockData = () => {
    const players = [
      { name: 'Scottie Scheffler', nationality: 'USA', owgr: 1, form: 'T1-T2-1', history: 'T2-1-T5' },
      { name: 'Rory McIlroy', nationality: 'NIR', owgr: 2, form: 'T3-1-T5', history: 'T5-T7-2' },
      { name: 'Jon Rahm', nationality: 'ESP', owgr: 3, form: '2-T4-3', history: '1-T3-4' },
      { name: 'Viktor Hovland', nationality: 'NOR', owgr: 4, form: 'T5-3-T6', history: 'T12-T8-T15' },
      { name: 'Brooks Koepka', nationality: 'USA', owgr: 5, form: 'T8-T5-2', history: 'T7-4-2' },
    ];

    const bookmakerList = [
      { name: 'Bet365', ew: '5 places', regions: ['uk', 'us'] },
      { name: 'William Hill', ew: '5 places', regions: ['uk'] },
      { name: 'Betway', ew: '6 places', regions: ['uk'] },
      { name: 'Coral', ew: '5 places', regions: ['uk'] },
      { name: 'Ladbrokes', ew: '5 places', regions: ['uk'] },
      { name: 'Paddy Power', ew: '6 places', regions: ['uk'] },
      { name: 'DraftKings', ew: '5 places', regions: ['us'] },
      { name: 'FanDuel', ew: '4 places', regions: ['us'] },
      { name: 'BetMGM', ew: '5 places', regions: ['us'] },
      { name: 'Caesars', ew: '5 places', regions: ['us'] },
      { name: 'PointsBet', ew: '4 places', regions: ['us'] },
    ];

    const filtered = bookmakerList.filter(b => b.regions.includes(userRegion));
    setBookmakers(filtered);

    const data = players.map(player => {
      const bookmakerOdds = {};
      const base = 6 + Math.random() * 20;
      
      filtered.forEach(book => {
        bookmakerOdds[book.name] = +(base + (Math.random() - 0.5) * 2).toFixed(1);
      });

      const oddsValues = Object.values(bookmakerOdds);
      const avgOdds = oddsValues.reduce((a, b) => a + b) / oddsValues.length;

      return { ...player, bookmakerOdds, avgOdds };
    });

    setOdds(data);
  };

  const formatOdds = (odds) => {
    if (!odds) return '-';
    if (oddsFormat === 'american') {
      return odds >= 2.0 ? `+${Math.round((odds - 1) * 100)}` : Math.round(-100 / (odds - 1));
    }
    return odds.toFixed(1);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedOdds = [...odds]
    .filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'name') {
        aVal = a.name.split(' ').slice(-1)[0];
        bVal = b.name.split(' ').slice(-1)[0];
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1600px', margin: '0 auto', padding: '20px' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafafa; }
        .header { background: white; padding: 20px; marginBottom: 20px; borderBottom: '2px solid #1a1a1a' }
        .logo-text { fontSize: '24px', fontWeight: 'bold' }
        .tagline { color: #666; fontSize: '14px'; marginTop: '5px' }
        .tabs { display: flex; gap: 10px; marginTop: 15px; }
        .tab { padding: 10px 20px; border: 1px solid #ddd; borderRadius: 6px; cursor: pointer; background: white; }
        .tab.active { background: #1a1a1a; color: white; }
        .search { width: 100%; padding: 12px; border: 1px solid #ddd; borderRadius: 6px; fontSize: 14px; marginBottom: 20px; }
        .table-container { background: white; overflow: auto; }
        table { width: 100%; borderCollapse: collapse; }
        th, td { padding: 12px; textAlign: center; borderBottom: 1px solid #e5e5e5; }
        th { background: #f8f8f8; fontWeight: 600; fontSize: 12px; position: sticky; top: 0; }
        th:first-child, td:first-child { textAlign: left; position: sticky; left: 0; background: white; zIndex: 2; }
        th:first-child { background: #f8f8f8; zIndex: 3; }
        .player-cell { display: flex; alignItems: center; gap: 8px; cursor: pointer; }
        .expanded { background: #f8f9fa; padding: 20px; }
        .expanded-grid { display: grid; gridTemplateColumns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; }
        .stat-label { fontSize: 11px; color: #999; textTransform: uppercase; marginBottom: 5px; }
        .stat-value { fontSize: 16px; fontWeight: 600; }
        .best { background: #fff8e7; fontWeight: 700; }
        .footer { marginTop: 40px; padding: 20px; background: white; textAlign: center; fontSize: 12px; color: #666; }
      `}</style>

      <div className="header">
        <div className="logo-text">the Fairway</div>
        <div className="tagline">Better Odds. Better Bets.</div>
        <div className="tabs">
          {MAJORS.map(t => (
            <div
              key={t.id}
              className={`tab ${selectedTournament.id === t.id ? 'active' : ''}`}
              onClick={() => setSelectedTournament(t)}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff3cd', padding: '15px', marginBottom: '20px', borderRadius: '6px' }}>
        ðŸ’¡ Demo data - Live odds available during major tournaments
      </div>

      <input
        type="text"
        className="search"
        placeholder="Search players..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Player {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? 'â†‘' : 'â†“')}
              </th>
              <th onClick={() => handleSort('owgr')} style={{ cursor: 'pointer' }}>
                Ranking {sortConfig.key === 'owgr' && (sortConfig.direction === 'asc' ? 'â†‘' : 'â†“')}
              </th>
              {bookmakers.map((b, i) => (
                <th key={i}>
                  <div>{b.name}</div>
                  <div style={{ fontSize: '10px', color: '#999' }}>{b.ew}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedOdds.map((player, idx) => {
              const oddsValues = bookmakers.map(b => player.bookmakerOdds[b.name]);
              const bestOdds = Math.max(...oddsValues);

              return (
                <React.Fragment key={idx}>
                  <tr>
                    <td>
                      <div className="player-cell" onClick={() => setExpandedPlayer(expandedPlayer === player.name ? null : player.name)}>
                        {expandedPlayer === player.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        <span>{player.name}</span>
                      </div>
                    </td>
                    <td>#{player.owgr}</td>
                    {bookmakers.map((book, i) => {
                      const odds = player.bookmakerOdds[book.name];
                      return (
                        <td key={i} className={odds === bestOdds ? 'best' : ''}>
                          {formatOdds(odds)}
                        </td>
                      );
                    })}
                  </tr>
                  {expandedPlayer === player.name && (
                    <tr>
                      <td colSpan={bookmakers.length + 2}>
                        <div className="expanded">
                          <div className="expanded-grid">
                            <div>
                              <div className="stat-label">Nationality</div>
                              <div className="stat-value">{player.nationality}</div>
                            </div>
                            <div>
                              <div className="stat-label">Recent Form</div>
                              <div className="stat-value">{player.form}</div>
                            </div>
                            <div>
                              <div className="stat-label">Course History</div>
                              <div className="stat-value">{player.history}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="footer">
        <div style={{ marginBottom: '10px' }}>
          <button onClick={() => { setUserRegion('uk'); setOddsFormat('decimal'); localStorage.setItem('userRegion', 'uk'); loadMockData(); }} style={{ padding: '5px 15px', marginRight: '10px', border: userRegion === 'uk' ? '2px solid black' : '1px solid #ddd' }}>ðŸ‡¬ðŸ‡§ UK</button>
          <button onClick={() => { setUserRegion('us'); setOddsFormat('american'); localStorage.setItem('userRegion', 'us'); loadMockData(); }} style={{ padding: '5px 15px', border: userRegion === 'us' ? '2px solid black' : '1px solid #ddd' }}>ðŸ‡ºðŸ‡¸ US</button>
        </div>
        <div>Â© 2025 The Fairway â€¢ <a href="#">Terms</a> â€¢ <a href="#">Privacy</a> â€¢ <a href="#">Responsible Gambling</a></div>
        <div style={{ marginTop: '10px', fontSize: '11px' }}>18+ Only â€¢ BeGambleAware.org â€¢ When the fun stops, stop.</div>
      </div>
    </div>
  );
};

export default App;
