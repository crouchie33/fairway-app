import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import logoImg from './logo.png';
import wordmarkImg from './wordmark.png';

// The Odds API configuration
const ODDS_API_KEY = 'f68c6ebed30010a80949e68b3e57c825';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

const MAJORS = [
  { id: 'masters', name: 'The Masters', apiKey: 'golf_masters' },
  { id: 'pga', name: 'PGA Championship', apiKey: 'golf_pga_championship' },
  { id: 'usopen', name: 'US Open', apiKey: 'golf_us_open' },
  { id: 'open', name: 'The Open', apiKey: 'golf_the_open_championship' }
];

const GolfOddsComparison = () => {
  // Affiliate Links - Replace with your actual affiliate IDs when approved
  const affiliateLinks = {
    // UK Bookmakers
    'Bet365': 'https://www.bet365.com/olp/golf?affiliate=YOUR_BET365_ID',
    'William Hill': 'https://www.williamhill.com/golf?AffiliateID=YOUR_WH_ID',
    'Betway': 'https://sports.betway.com/golf?btag=YOUR_BETWAY_ID',
    'Coral': 'https://www.coral.co.uk/sports/golf?cid=YOUR_CORAL_ID',
    'Ladbrokes': 'https://sports.ladbrokes.com/golf?affiliate=YOUR_LADBROKES_ID',
    'Paddy Power': 'https://www.paddypower.com/golf?AFF_ID=YOUR_PP_ID',
    // US Bookmakers
    'DraftKings': 'https://sportsbook.draftkings.com/golf?wpcid=YOUR_DK_ID',
    'FanDuel': 'https://sportsbook.fanduel.com/golf?referral=YOUR_FD_ID',
    'PointsBet': 'https://pointsbet.com/golf?referralCode=YOUR_PB_ID',
    'Caesars': 'https://sportsbook.caesars.com/golf?pid=YOUR_CAESARS_ID',
    'BetMGM': 'https://sports.betmgm.com/golf?wm=YOUR_BETMGM_ID'
  };

  const [odds, setOdds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'avgOdds', direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(MAJORS[0]);
  const [bookmakers, setBookmakers] = useState([]);
  const [useMock, setUseMock] = useState(true);
  const [userRegion, setUserRegion] = useState('uk'); // 'uk' or 'us'
  const [oddsFormat, setOddsFormat] = useState('decimal'); // 'decimal' or 'american'

  useEffect(() => {
    fetchTournamentData();
  }, [selectedTournament]);

  useEffect(() => {
    // Detect user's region based on timezone or IP
    detectUserRegion();
  }, []);

  const detectUserRegion = async () => {
    // Check localStorage first for saved preferences
    const savedRegion = localStorage.getItem('userRegion');
    const savedFormat = localStorage.getItem('oddsFormat');
    
    if (savedRegion && savedFormat) {
      setUserRegion(savedRegion);
      setOddsFormat(savedFormat);
      console.log(`Using saved preferences: ${savedRegion}, ${savedFormat}`);
      return;
    }

    try {
      // Method 1: Use a free geolocation API
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      // US, Canada = 'us' region, UK, Ireland, Europe = 'uk' region
      const usCountries = ['US', 'CA'];
      const detectedRegion = usCountries.includes(data.country_code) ? 'us' : 'uk';
      setUserRegion(detectedRegion);
      
      // Auto-set odds format based on region
      const detectedFormat = detectedRegion === 'us' ? 'american' : 'fractional';
      setOddsFormat(detectedFormat);
      
      // Save to localStorage
      localStorage.setItem('userRegion', detectedRegion);
      localStorage.setItem('oddsFormat', detectedFormat);
      
      console.log(`Detected region: ${detectedRegion} (${data.country_code})`);
    } catch (error) {
      // Fallback: Check timezone as backup
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isUS = timezone.includes('America/') || timezone.includes('US/');
      const fallbackRegion = isUS ? 'us' : 'uk';
      const fallbackFormat = isUS ? 'american' : 'fractional';
      
      setUserRegion(fallbackRegion);
      setOddsFormat(fallbackFormat);
      
      localStorage.setItem('userRegion', fallbackRegion);
      localStorage.setItem('oddsFormat', fallbackFormat);
      
      console.log(`Using timezone fallback: ${timezone}`);
    }
  };

  const fetchTournamentData = async () => {
    // For now using mock data - real API integration would go here
    useMockData();
  };

  const useMockData = () => {
    setUseMock(true);
    const mockPlayers = [
      { name: 'Scottie Scheffler', nationality: 'USA', owgr: 1, recentForm: [1, 2, 1, 3, 1, 2, 1], courseHistory: 'T2-1-T5-4-2-T3-1', tipsterPicks: ['GolfAnalyst', 'BettingExpert', 'ProGolfTips', 'OddsSharks', 'GreenJacket', 'TheMastersGuru', 'BirdiePicksGolf', 'FairwayFinder'] },
      { name: 'Rory McIlroy', nationality: 'NIR', owgr: 2, recentForm: [3, 1, 5, 2, 4, 3, 2], courseHistory: 'T5-T7-2-T8-3-T6-4', tipsterPicks: ['GolfAnalyst', 'ProGolfTips', 'GreenJacket', 'BirdiePicksGolf', 'FairwayFinder', 'SwingTipster'] },
      { name: 'Jon Rahm', nationality: 'ESP', owgr: 3, recentForm: [2, 4, 1, 1, 6, 3, 2], courseHistory: '1-T3-T4-2-1-T5-3', tipsterPicks: ['BettingExpert', 'OddsSharks', 'TheMastersGuru', 'SwingTipster', 'GolfWisdom'] },
      { name: 'Viktor Hovland', nationality: 'NOR', owgr: 4, recentForm: [5, 3, 2, 4, 3, 5, 4], courseHistory: 'T12-T8-T15-T10-T9-T11-T13', tipsterPicks: ['ProGolfTips', 'BirdiePicksGolf', 'GolfWisdom'] },
      { name: 'Brooks Koepka', nationality: 'USA', owgr: 5, recentForm: [4, 6, 3, 5, 2, 4, 3], courseHistory: 'T2-1-T4-3-T2-2-1', tipsterPicks: ['OddsSharks', 'TheMastersGuru', 'FairwayFinder', 'SwingTipster'] },
      { name: 'Xander Schauffele', nationality: 'USA', owgr: 6, recentForm: [6, 2, 4, 3, 5, 6, 4], courseHistory: 'T3-T5-T9-T7-T4-T6-T8', tipsterPicks: ['GolfAnalyst', 'GreenJacket', 'GolfWisdom'] },
      { name: 'Collin Morikawa', nationality: 'USA', owgr: 7, recentForm: [7, 5, 6, 8, 4, 7, 5], courseHistory: 'T18-T12-T20-T15-T11-T14-T16', tipsterPicks: ['BettingExpert', 'BirdiePicksGolf'] },
      { name: 'Patrick Cantlay', nationality: 'USA', owgr: 8, recentForm: [8, 4, 7, 6, 7, 8, 6], courseHistory: 'T9-T14-T11-T10-T12-T13-T11', tipsterPicks: ['ProGolfTips', 'SwingTipster'] },
      { name: 'Tommy Fleetwood', nationality: 'ENG', owgr: 9, recentForm: [10, 8, 9, 7, 9, 10, 8], courseHistory: 'T17-T22-T15-T19-T18-T20-T16', tipsterPicks: ['TheMastersGuru'] },
      { name: 'Jordan Spieth', nationality: 'USA', owgr: 10, recentForm: [9, 11, 8, 10, 8, 9, 10], courseHistory: '1-T2-MC-T8-T10-MC-T15', tipsterPicks: ['OddsSharks', 'FairwayFinder', 'GolfWisdom'] },
      { name: 'Max Homa', nationality: 'USA', owgr: 12, recentForm: [11, 9, 10, 12, 11, 11, 9], courseHistory: 'T24-T19-T28-T22-T25-T21-T23', tipsterPicks: ['BirdiePicksGolf'] },
      { name: 'Cameron Smith', nationality: 'AUS', owgr: 14, recentForm: [12, 13, 11, 9, 13, 12, 11], courseHistory: 'T3-T5-T12-T8-T6-T9-T7', tipsterPicks: ['GreenJacket', 'SwingTipster'] },
      { name: 'Justin Thomas', nationality: 'USA', owgr: 15, recentForm: [14, 10, 12, 14, 10, 13, 12], courseHistory: 'T8-T16-T7-T12-T10-T14-T9', tipsterPicks: ['GolfAnalyst'] },
      { name: 'Hideki Matsuyama', nationality: 'JPN', owgr: 11, recentForm: [13, 14, 13, 11, 15, 14, 13], courseHistory: '1-T11-T18-T15-T12-T16-T14', tipsterPicks: ['BettingExpert', 'TheMastersGuru'] },
      { name: 'Tony Finau', nationality: 'USA', owgr: 16, recentForm: [15, 12, 14, 13, 12, 15, 14], courseHistory: 'T5-T10-T21-T18-T15-T19-T17', tipsterPicks: [] },
      { name: 'Shane Lowry', nationality: 'IRL', owgr: 18, recentForm: [16, 15, 17, 18, 14, 16, 15], courseHistory: 'T12-T25-MC-T20-T22-MC-T18', tipsterPicks: ['ProGolfTips'] },
      { name: 'Tyrrell Hatton', nationality: 'ENG', owgr: 20, recentForm: [18, 17, 15, 16, 19, 18, 17], courseHistory: 'T15-T18-T23-T21-T19-T22-T20', tipsterPicks: [] },
      { name: 'Min Woo Lee', nationality: 'AUS', owgr: 35, recentForm: [19, 20, 18, 17, 16, 19, 18], courseHistory: 'MC-T35-T42-T38-T40-MC-T36', tipsterPicks: [] },
      { name: 'Ludvig Aberg', nationality: 'SWE', owgr: 13, recentForm: [2, 5, 3, 7, 6, 4, 5], courseHistory: 'Debut-T8-T6-T10-T7-T9-T8', tipsterPicks: ['GolfAnalyst', 'BettingExpert', 'OddsSharks', 'GreenJacket', 'BirdiePicksGolf'] },
      { name: 'Sahith Theegala', nationality: 'USA', owgr: 25, recentForm: [20, 16, 19, 20, 18, 20, 19], courseHistory: 'T19-MC-T31-T28-T25-MC-T29', tipsterPicks: [] },
    ];

    const bookmakerList = [
      { name: 'Bet365', eachWay: { places: '5', fraction: '1/5' }, regions: ['uk', 'us'] },
      { name: 'William Hill', eachWay: { places: '5', fraction: '1/5' }, regions: ['uk'] },
      { name: 'Betway', eachWay: { places: '6', fraction: '1/5' }, regions: ['uk'] },
      { name: 'Coral', eachWay: { places: '5', fraction: '1/5' }, regions: ['uk'] },
      { name: 'Ladbrokes', eachWay: { places: '5', fraction: '1/5' }, regions: ['uk'] },
      { name: 'Paddy Power', eachWay: { places: '6', fraction: '1/5' }, regions: ['uk'] },
      { name: 'DraftKings', eachWay: { places: '5', fraction: '1/4' }, regions: ['us'] },
      { name: 'FanDuel', eachWay: { places: '4', fraction: '1/5' }, regions: ['us'] },
      { name: 'BetMGM', eachWay: { places: '5', fraction: '1/5' }, regions: ['us'] },
      { name: 'Caesars', eachWay: { places: '5', fraction: '1/5' }, regions: ['us'] },
      { name: 'PointsBet', eachWay: { places: '4', fraction: '1/4' }, regions: ['us'] },
    ];
    
    // Filter bookmakers based on user's region
    const filteredBookmakers = bookmakerList.filter(book => 
      book.regions.includes(userRegion)
    );
    
    setBookmakers(filteredBookmakers);
    
    const mockOdds = mockPlayers.map(player => {
      const playerOdds = {};
      const baseOdds = 5 + Math.random() * 45;
      
      bookmakerList.forEach(book => {
        const outright = +(baseOdds + (Math.random() - 0.5) * 3).toFixed(1);
        playerOdds[book.name] = {
          outright: outright,
          top5: +(outright * 0.25).toFixed(1),
          top10: +(outright * 0.15).toFixed(1),
          top20: +(outright * 0.08).toFixed(1),
          r1Leader: +(outright * 0.4).toFixed(1),
          top30: +(outright * 0.06).toFixed(1),
          top40: +(outright * 0.05).toFixed(1),
          topNationality: +(outright * 0.35).toFixed(1)
        };
      });

      const outrightOdds = Object.values(playerOdds).map(o => o.outright);
      const avgOdds = outrightOdds.reduce((a, b) => a + b, 0) / outrightOdds.length;

      return {
        ...player,
        bookmakerOdds: playerOdds,
        avgOdds: avgOdds,
      };
    });

    setOdds(mockOdds);
  };

  const sortedAndFilteredOdds = useMemo(() => {
    let filtered = odds.filter(player => {
      const searchTerm = filterText.toLowerCase();
      return player.name.toLowerCase().includes(searchTerm);
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.key === 'name') {
        aValue = a.name.split(' ').slice(-1)[0];
        bValue = b.name.split(' ').slice(-1)[0];
      } else if (sortConfig.key === 'avgOdds') {
        aValue = a.avgOdds;
        bValue = b.avgOdds;
      } else if (sortConfig.key === 'owgr') {
        aValue = a.owgr || 999; // Players without ranking go to bottom
        bValue = b.owgr || 999;
      } else if (sortConfig.key === 'tipsterPicks') {
        aValue = a.tipsterPicks?.length || 0;
        bValue = b.tipsterPicks?.length || 0;
      } else {
        aValue = a[sortConfig.key] || 0;
        bValue = b[sortConfig.key] || 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [odds, sortConfig, filterText]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatOdds = (odds) => {
    if (!odds) return '-';
    
    if (oddsFormat === 'american') {
      // Convert decimal to American odds
      if (odds >= 2.0) {
        const american = Math.round((odds - 1) * 100);
        return `+${american}`;
      } else {
        const american = Math.round(-100 / (odds - 1));
        return american.toString();
      }
    } else if (oddsFormat === 'fractional') {
      // Convert decimal to fractional odds
      const decimalOdds = odds - 1;
      
      // Common fractions lookup for cleaner display
      const commonFractions = {
        0.5: '1/2', 0.33: '1/3', 0.67: '2/3', 0.25: '1/4', 0.75: '3/4',
        0.2: '1/5', 0.4: '2/5', 0.6: '3/5', 0.8: '4/5',
        1: '1/1', 1.5: '3/2', 2: '2/1', 2.5: '5/2', 3: '3/1',
        3.5: '7/2', 4: '4/1', 5: '5/1', 6: '6/1', 7: '7/1',
        8: '8/1', 9: '9/1', 10: '10/1', 11: '11/1', 12: '12/1',
        14: '14/1', 16: '16/1', 20: '20/1', 25: '25/1', 33: '33/1',
        50: '50/1', 66: '66/1', 100: '100/1'
      };
      
      // Check for exact match
      const rounded = Math.round(decimalOdds * 100) / 100;
      if (commonFractions[rounded]) {
        return commonFractions[rounded];
      }
      
      // Calculate fraction
      const tolerance = 0.01;
      let numerator = Math.round(decimalOdds * 100);
      let denominator = 100;
      
      // Simplify fraction
      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(numerator, denominator);
      numerator /= divisor;
      denominator /= divisor;
      
      return `${numerator}/${denominator}`;
    } else {
      // Decimal format
      return odds % 1 === 0 ? odds.toFixed(0) : odds.toFixed(1);
    }
  };

  const getFinishClass = (position) => {
    // Handle MC (missed cut)
    if (position === 'MC' || position === 'WD' || position === 'DQ') {
      return 'finish-mc';
    }
    
    // Extract number from position (handles T5, 5, etc.)
    const posNum = parseInt(position.toString().replace(/\D/g, ''));
    
    if (isNaN(posNum)) return 'finish-other';
    
    if (posNum === 1) return 'finish-1';
    if (posNum >= 2 && posNum <= 5) return 'finish-2-5';
    if (posNum >= 6 && posNum <= 10) return 'finish-6-10';
    if (posNum >= 11 && posNum <= 20) return 'finish-11-20';
    if (posNum >= 21 && posNum <= 30) return 'finish-21-30';
    if (posNum >= 31 && posNum <= 50) return 'finish-31-50';
    
    return 'finish-other';
  };

  const togglePlayerExpand = (playerName) => {
    setExpandedPlayer(expandedPlayer === playerName ? null : playerName);
  };

  const SortableHeader = ({ sortKey, label, className = '' }) => (
    <span 
      onClick={() => handleSort(sortKey)}
      className={`sortable-header ${className}`}
      title={
        sortKey === 'owgr' ? 'Click to sort by World Ranking' : 
        sortKey === 'tipsterPicks' ? 'Click to sort by Tipster Consensus' : 
        sortKey === 'name' ? 'Click to sort by Player Name' :
        sortKey === 'avgOdds' ? 'Click to sort by Best Price (default)' :
        'Click to sort'
      }
    >
      {label}
      {sortConfig.key === sortKey && (
        <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
      )}
    </span>
  );

  return (
    <div className="app-container">
      <style>{`
        /* Version 2.1 - Mobile panes fix */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background: #fafafa;
          color: #1a1a1a;
          overflow-x: hidden;
          max-width: 100vw;
        }

        .app-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0;
          overflow-x: hidden;
        }

        header {
          background: white;
          border-bottom: 1px solid #e5e5e5;
          padding: 20px 30px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .header-content {
          max-width: 1600px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 20px;
        }

        .header-left {
          justify-self: start;
        }

        .header-center {
          justify-self: center;
        }

        .header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;
          gap: 0;
          height: 100%;
        }

        .tagline {
          font-size: 1.7rem;
          color: #666;
          font-weight: 500;
          letter-spacing: 0.3px;
          padding-top: 8px;
        }

        .wordmark {
          width: 100mm;
          height: auto;
        }

        .logo-center {
          height: 90px;
          width: auto;
        }

        .logo-mobile {
          display: none;
        }

        .logo-desktop {
          display: block;
        }

        header h1 {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.5px;
          margin: 0;
        }

        .tournament-tabs {
          display: flex;
          gap: 8px;
        }

        .tournament-tab {
          padding: 8px 16px;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tournament-tab:hover {
          color: #1a1a1a;
          border-color: #1a1a1a;
        }

        .tournament-tab.active {
          background: #1a1a1a;
          color: white;
          border-color: #1a1a1a;
          font-weight: 600;
        }

        .best-odds-header {
          display: none;
        }

        .best-odds-cell-mobile {
          display: none;
        }

        .controls-bar {
          background: white;
          padding: 15px 30px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .region-toggle {
          display: flex;
          gap: 8px;
          background: #f5f5f5;
          padding: 4px;
          border-radius: 8px;
        }

        .region-btn {
          padding: 8px 12px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .region-btn:hover {
          background: #e5e5e5;
          transform: scale(1.1);
        }

        .region-btn.active {
          background: #1a1a1a;
        }

        .search-bar {
          position: relative;
          max-width: 300px;
        }

        .search-bar input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .search-bar input:focus {
          outline: none;
          border-color: #1a1a1a;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }

        .demo-notice {
          background: #fff3cd;
          padding: 12px 30px;
          border-bottom: 1px solid #ffc107;
          font-size: 0.85rem;
          color: #856404;
        }

        .odds-matrix-container {
          background: white;
          margin: 0;
          overflow-x: auto;
          overflow-y: auto;
          max-height: calc(100vh - 140px);
        }

        .odds-matrix {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }

        .odds-matrix thead th {
          background: #f8f8f8;
          padding: 16px 8px;
          text-align: center;
          font-weight: 600;
          font-size: 0.75rem;
          border-right: 1px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
          position: -webkit-sticky;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .odds-matrix thead th:first-child {
          position: -webkit-sticky;
          position: sticky;
          left: 0;
          top: 0;
          z-index: 11;
          background: #f8f8f8;
          text-align: left;
          padding-left: 20px;
          min-width: 130px;
          max-width: 130px;
        }

        .player-header {
          background: #f8f8f8;
          padding: 16px 20px;
          text-align: left;
          font-weight: 600;
          font-size: 0.75rem;
          border-right: 1px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
          position: -webkit-sticky;
          position: sticky;
          left: 0;
          top: 0;
          z-index: 11;
          min-width: 130px;
          max-width: 130px;
        }

        .player-header-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .inline-sort {
          cursor: pointer;
          transition: color 0.2s;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .inline-sort:hover {
          color: #1a1a1a;
        }

        .header-separator {
          color: #ccc;
          font-weight: 400;
        }

        .bookmaker-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .bookmaker-name-rotated {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-weight: 600;
          font-size: 0.8rem;
          color: #1a1a1a;
          white-space: nowrap;
          padding: 8px 0;
        }

        .each-way-terms {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.7rem;
          color: #666;
          margin-top: 4px;
        }

        .ew-places {
          font-weight: 600;
          color: #1a1a1a;
        }

        .ew-fraction {
          font-weight: 400;
        }

        .sortable-header {
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }

        .sortable-header:hover {
          background: #f0f0f0;
        }

        .sort-arrow {
          font-size: 0.8rem;
          opacity: 0.7;
        }

        .odds-matrix tbody tr {
          border-bottom: 1px solid #f0f0f0;
        }

        .odds-matrix tbody tr:hover {
          background: #fafafa;
        }

        .odds-matrix tbody td {
          padding: 14px 8px;
          font-size: 0.9rem;
          text-align: center;
          border-right: 1px solid #f5f5f5;
        }

        .odds-matrix tbody td:first-child {
          position: sticky;
          left: 0;
          background: white;
          z-index: 1;
          text-align: left;
          padding-left: 20px;
          border-right: 1px solid #e5e5e5;
          min-width: 130px;
          max-width: 130px;
        }

        .odds-matrix tbody tr:hover td:first-child {
          background: #fafafa;
        }

        .player-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 500;
          color: #1a1a1a;
        }

        .expand-icon {
          color: #999;
          flex-shrink: 0;
        }

        .player-name {
          white-space: nowrap;
        }
          flex-shrink: 0;
        }

        .desktop-only {
          display: table-cell;
        }

        .mobile-only {
          display: none;
        }

        .tipster-header {
          font-size: 1.4rem;
          cursor: help;
          padding: 12px 6px;
          min-width: 40px;
          max-width: 50px;
          text-align: center;
          vertical-align: middle;
        }

        .owgr-header {
          font-size: 0.7rem;
          padding: 8px 6px;
          min-width: 50px;
          max-width: 55px;
          width: 55px;
          text-align: center;
          line-height: 1.2;
          vertical-align: middle;
        }

        .owgr-header div {
          font-weight: 600;
        }

        .owgr-cell {
          padding: 10px 8px;
          text-align: center;
          font-weight: 600;
          color: #666;
          font-size: 0.9rem;
          max-width: 55px;
          width: 55px;
        }

        .tipster-cell {
          padding: 10px 6px;
          min-width: 45px;
          max-width: 50px;
          width: 50px;
        }

        .tipster-bar-container {
          position: relative;
          width: 100%;
          height: 20px;
          background: #f0f0f0;
          border-radius: 3px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .tipster-bar-container:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .tipster-bar {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, #2d5a2d 0%, #3d7a3d 50%, #4d8a4d 100%);
          transition: width 0.3s ease;
          border-radius: 3px 0 0 3px;
        }

        .tipster-count {
          position: absolute;
          right: 3px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.75rem;
          font-weight: 700;
          color: #1a1a1a;
          z-index: 1;
        }

        .tipster-empty {
          text-align: center;
          color: #ccc;
          font-size: 0.9rem;
        }

        .odds-cell {
          font-weight: 500;
          color: #1a1a1a;
        }

        .odds-link {
          display: block;
          width: 100%;
          height: 100%;
          color: inherit;
          text-decoration: none;
          transition: all 0.2s;
          padding: 2px 4px;
          border-radius: 3px;
        }

        .odds-link:hover {
          background: rgba(0, 0, 0, 0.05);
          transform: scale(1.05);
          font-weight: 700;
        }

        .odds-link:active {
          transform: scale(0.98);
        }

        .best-odds {
          background: #fff8e7;
          font-weight: 700;
          color: #1a1a1a;
        }

        .expanded-row {
          background: #f8f9fa;
        }

        .expanded-row td {
          padding: 0 !important;
        }

        .form-boxes {
          display: flex;
          gap: 0;
          justify-content: center;
        }

        .form-box {
          display: inline-block;
          padding: 6px 8px;
          border: 1px solid #d0d0d0;
          border-right: none;
          font-size: 0.8rem;
          font-weight: 600;
          text-align: center;
          min-width: 38px;
          width: 38px;
        }

        .form-box:first-child {
          border-radius: 3px 0 0 3px;
        }

        .form-box:last-child {
          border-right: 1px solid #d0d0d0;
          border-radius: 0 3px 3px 0;
        }

        .form-box:only-child {
          border-radius: 3px;
          border-right: 1px solid #d0d0d0;
        }

        /* Blue gradient for finishes - darker = better */
        .form-box.finish-1 { background: #1e3a8a; color: white; }
        .form-box.finish-2-5 { background: #3b82f6; color: white; }
        .form-box.finish-6-10 { background: #60a5fa; color: white; }
        .form-box.finish-11-20 { background: #93c5fd; color: #1a1a1a; }
        .form-box.finish-21-30 { background: #bfdbfe; color: #1a1a1a; }
        .form-box.finish-31-50 { background: #dbeafe; color: #1a1a1a; }
        .form-box.finish-mc { background: #f3f4f6; color: #6b7280; }
        .form-box.finish-other { background: #f9fafb; color: #1a1a1a; }

        /* Version 2.4 - Simple approach */
        .desktop-expanded-view {
          display: block;
        }
        
        .mobile-panes-wrapper {
          display: none;
        }
        
        .expanded-content {
          padding: 25px;
        }

        .desktop-cards-grid {
          display: flex;
          gap: 8px;
          width: 100%;
          align-items: stretch;
        }

        .desktop-info-card,
        .desktop-odds-card {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 8px 6px;
          text-align: center;
          flex: 0 0 auto;
          width: 90px;
        }

        .desktop-form-card {
          width: 280px;
        }

        .desktop-card-label {
          font-size: 0.65rem;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          font-weight: 600;
          line-height: 1.1;
        }

        .desktop-card-sublabel {
          font-size: 0.6rem;
          color: #bbb;
          text-transform: uppercase;
          letter-spacing: 0.2px;
          margin-top: 1px;
          margin-bottom: 4px;
        }

        .desktop-card-value {
          font-size: 1rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-top: 6px;
        }

        .desktop-card-odds {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-top: 4px;
        }

        .desktop-form-card .form-boxes {
          margin-top: 10px;
        }

        .mobile-bookmaker-grid {
          display: none;
        }

        .best-odds-header {
          display: none;
        }

        .best-odds-cell-mobile {
          display: none;
        }

        .loading-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
          font-size: 1.1rem;
        }

        .site-footer {
          background: #f8f8f8;
          border-top: 1px solid #e5e5e5;
          padding: 40px 30px 30px;
          margin-top: 60px;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .footer-disclaimer {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .responsible-gambling {
          font-size: 0.95rem;
          color: #1a1a1a;
          line-height: 1.6;
          margin: 0;
        }

        .responsible-gambling strong {
          color: #d32f2f;
          font-weight: 700;
        }

        .responsible-gambling a {
          color: #1a1a1a;
          text-decoration: underline;
          font-weight: 600;
        }

        .responsible-gambling a:hover {
          color: #666;
        }

        .affiliate-notice {
          font-size: 0.85rem;
          color: #666;
          line-height: 1.5;
          margin: 0;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }

        .footer-link {
          color: #1a1a1a;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: #666;
          text-decoration: underline;
        }

        .footer-separator {
          color: #ccc;
          font-size: 0.9rem;
        }

        .footer-logos {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          padding: 20px 0;
          border-top: 1px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
        }

        .footer-logo-link {
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .footer-logo-link:hover {
          opacity: 0.7;
        }

        .gamcare-text {
          font-size: 0.9rem;
          color: #1a1a1a;
          font-weight: 600;
        }

        .footer-copyright {
          text-align: center;
        }

        .footer-copyright p {
          font-size: 0.85rem;
          color: #999;
          margin: 0;
        }

        .footer-odds-format {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 30px;
          padding: 20px 0;
          border-top: 1px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
        }

        .footer-settings-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .footer-odds-format label {
          font-size: 0.9rem;
          color: #666;
          font-weight: 500;
        }

        .region-toggle-footer {
          display: flex;
          gap: 6px;
          background: #f5f5f5;
          padding: 3px;
          border-radius: 6px;
        }

        .region-btn-footer {
          padding: 6px 12px;
          border: none;
          background: transparent;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .region-btn-footer:hover {
          background: #e5e5e5;
          color: #1a1a1a;
        }

        .region-btn-footer.active {
          background: #1a1a1a;
          color: white;
          font-weight: 600;
        }

        .footer-odds-dropdown {
          padding: 6px 12px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #1a1a1a;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .footer-odds-dropdown:hover {
          border-color: #1a1a1a;
        }

        .footer-odds-dropdown:focus {
          outline: none;
          border-color: #1a1a1a;
        }

        @media (max-width: 768px) {
          header {
            padding: 10px 15px !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }

          .header-content {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            grid-template-columns: none !important;
          }

          .tagline {
            display: none !important;
          }

          .header-right {
            order: 2;
          }

          .header-left {
            order: 1;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            gap: 10px !important;
            position: relative !important;
            z-index: 10 !important;
          }

          .header-center {
            display: none !important;
          }

          .wordmark {
            height: 28px !important;
            width: auto !important;
            max-width: 60% !important;
            display: block !important;
            position: relative !important;
            z-index: 11 !important;
          }

          .logo-mobile {
            height: 32px !important;
            width: auto !important;
            max-width: 35% !important;
            display: block !important;
            position: relative !important;
            z-index: 11 !important;
          }

          .logo-desktop {
            display: none !important;
          }

          .tournament-tabs {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            justify-content: flex-start;
            justify-self: center;
            max-width: 100% !important;
            box-sizing: border-box !important;
            gap: 4px;
          }

          .tournament-tab {
            padding: 6px 10px;
            font-size: 0.7rem;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .controls-bar {
            padding: 12px 20px;
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }

          .search-bar {
            max-width: 100%;
          }

          .footer-odds-format {
            flex-direction: column;
            gap: 15px;
            padding: 15px 0;
          }

          .footer-settings-group {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }

          .search-bar {
            max-width: 100%;
          }

          /* Mobile: Hide all bookmaker columns, only show Player + Best Odds */
          .odds-matrix thead th:not(:first-child):not(.best-odds-header) {
            display: none;
          }

          .odds-matrix tbody td:not(:first-child):not(.best-odds-cell-mobile) {
            display: none;
          }

          .desktop-only {
            display: none !important;
          }

          .mobile-only {
            display: table-cell !important;
          }

          /* Mobile: Remove sticky on table headers */
          .odds-matrix thead th {
            position: relative;
            top: 0;
          }

          .odds-matrix thead th:first-child {
            min-width: auto;
            width: 70%;
            position: relative;
            top: 0;
            left: 0;
          }

          .best-odds-header {
            display: table-cell !important;
            width: 30%;
          }

          .best-odds-cell-mobile {
            display: table-cell !important;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
          }

          .best-odds-header {
            display: table-cell !important;
            width: 30%;
            text-align: center;
          }

          .player-cell {
            max-width: none;
            width: 100%;
          }

          .player-name {
            font-size: 0.95rem;
          }

          .odds-matrix {
            font-size: 0.85rem;
            min-width: 100%;
          }

          .best-odds-cell-mobile {
            display: table-cell !important;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
          }

          .expanded-content {
            padding: 0 !important;
            margin: 0;
            width: 100%;
            box-sizing: border-box;
          }

          .info-row {
            display: flex;
            flex-wrap: wrap;
            gap: 30px;
            padding: 20px;
          }

          .expanded-section {
            min-width: 150px;
          }

          .expanded-section h4 {
            font-size: 0.75rem;
            color: #999;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }

          .info-row {
            flex-direction: column;
            gap: 20px;
          }

          .odds-breakdown-grid {
            grid-template-columns: 1fr;
          }

          .site-footer {
            padding: 30px 20px 20px;
            margin-top: 40px;
          }

          .footer-links {
            flex-direction: column;
            gap: 10px;
          }

          .footer-separator {
            display: none;
          }

          .footer-disclaimer {
            text-align: center;
          }

          .responsible-gambling,
          .affiliate-notice {
            font-size: 0.85rem;
          }

          /* Mobile - hide desktop, show mobile panes */
          .desktop-expanded-view {
            display: none;
          }

          .expanded-content {
            padding: 15px;
          }

          .expanded-cell {
            max-width: 100vw !important;
            width: 100vw !important;
            padding: 0 !important;
          }

          .expanded-row {
            display: block !important;
            max-width: 100vw !important;
          }

          .mobile-panes-wrapper {
            display: block;
            width: 100vw;
            max-width: 100vw;
            margin: 0;
            padding: 0;
            overflow: hidden;
            box-sizing: border-box;
          }

          .mobile-tabs-container {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            gap: 0;
            width: 100%;
          }

          .mobile-tabs-container::-webkit-scrollbar {
            display: none;
          }

          .mobile-tab-pane {
            flex: 0 0 100vw;
            width: 100vw;
            max-width: 100vw;
            scroll-snap-align: start;
            padding: 20px;
            box-sizing: border-box;
          }

          .mobile-pane-title {
            font-size: 1rem;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 15px;
            text-align: center;
          }

          .mobile-bookmaker-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .mobile-bookmaker-card {
            background: white;
            border: 2px solid #e5e5e5;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            text-decoration: none;
            color: inherit;
            transition: all 0.2s;
          }

          .mobile-bookmaker-card:active {
            transform: scale(0.98);
            background: #f8f8f8;
          }

          .mobile-bookmaker-card.best {
            background: #fff8e7;
            border-color: #d4af37;
            border-width: 3px;
          }

          .mobile-bookmaker-name {
            font-size: 0.75rem;
            color: #666;
            margin-bottom: 6px;
            font-weight: 600;
          }

          .mobile-bookmaker-odds {
            font-size: 1.4rem;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 4px;
          }

          .mobile-bookmaker-ew {
            font-size: 0.7rem;
            color: #999;
          }

          .mobile-extra-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .mobile-extra-card {
            background: white;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            text-decoration: none;
            color: inherit;
            transition: all 0.2s;
          }

          .mobile-extra-card:active {
            background: #f8f8f8;
            transform: scale(0.98);
          }

          .mobile-extra-label {
            font-size: 0.7rem;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            font-weight: 700;
          }

          .mobile-extra-bookmaker {
            font-size: 0.7rem;
            color: #666;
            margin-bottom: 6px;
          }

          .mobile-extra-odds {
            font-size: 1.3rem;
            font-weight: 700;
            color: #1a1a1a;
          }

          .mobile-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .mobile-stat-card {
            background: white;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }

          .mobile-stat-full-width {
            grid-column: 1 / -1;
          }

          .mobile-stat-label {
            font-size: 0.7rem;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            font-weight: 600;
          }

          .mobile-stat-value {
            font-size: 1rem;
            font-weight: 700;
            color: #1a1a1a;
          }

          .mobile-swipe-indicator {
            text-align: center;
            padding: 12px;
            font-size: 0.75rem;
            color: #999;
            border-top: 1px solid #f0f0f0;
          }
            border-bottom: 1px solid #e5e5e5;
          }

          .extra-odds-link {
            display: block;
            padding: 12px;
            text-align: center;
            text-decoration: none;
            color: inherit;
            transition: all 0.2s;
          }

          .extra-odds-link:active {
            background: #f8f8f8;
            transform: scale(0.98);
          }

          .extra-odds-bookmaker {
            font-size: 0.7rem;
            color: #999;
            margin-bottom: 6px;
            font-weight: 600;
          }

          .extra-odds-value {
            font-size: 1.3rem;
            font-weight: 700;
            color: #1a1a1a;
          }

          .mobile-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .mobile-stat-card {
            background: #f8f8f8;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }

          .mobile-stat-label {
            font-size: 0.7rem;
            color: #999;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .mobile-stat-value {
            font-size: 1rem;
            font-weight: 700;
            color: #1a1a1a;
          }

          .scroll-indicator {
            text-align: center;
            font-size: 0.75rem;
            color: #999;
            padding: 10px 0;
            border-top: 1px solid #f0f0f0;
            margin-top: 15px;
            display: block;
          }

          .mobile-bookmaker-card {
            background: white;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            transition: all 0.2s;
            text-decoration: none;
            color: inherit;
            display: block;
          }

          .mobile-bookmaker-card:active {
            transform: scale(0.98);
            background: #f8f8f8;
          }

          .mobile-bookmaker-card.best {
            border-color: #d4af37;
            background: #fff8e7;
            box-shadow: 0 0 0 2px #d4af3720;
          }

          .mobile-bookmaker-name {
            font-size: 0.75rem;
            color: #666;
            font-weight: 600;
            margin-bottom: 6px;
          }

          .mobile-odds-price {
            font-size: 1.3rem;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 4px;
          }

          .mobile-ew-terms {
            font-size: 0.7rem;
            color: #999;
          }
        }
      `}</style>

      <header>
        <div className="header-content">
          <div className="header-left">
            <img src={wordmarkImg} alt="The Fairway" className="wordmark" />
            <img src={logoImg} alt="The Fairway Logo" className="logo-center logo-mobile" />
          </div>
          <div className="header-center">
            <img src={logoImg} alt="The Fairway Logo" className="logo-center logo-desktop" />
          </div>
          <div className="header-right">
            <div className="tagline">Better Odds. Better Bets.</div>
            <div className="tournament-tabs">
              {MAJORS.map(major => (
                <button
                  key={major.id}
                  className={`tournament-tab ${selectedTournament.id === major.id ? 'active' : ''}`}
                  onClick={() => setSelectedTournament(major)}
                >
                  {major.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {useMock && (
        <div className="demo-notice">
          💡 Demo data - Live odds available during major tournaments
        </div>
      )}

      <div className="controls-bar">
        <div className="search-bar">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search players..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading odds...</div>
      ) : (
        <div className="odds-matrix-container">
          <table className="odds-matrix">
            <thead>
              <tr>
                <th className="player-header">
                  <div className="player-header-content">
                    <SortableHeader sortKey="name" label="Player" className="inline-sort" />
                    <span className="header-separator">|</span>
                    <SortableHeader sortKey="avgOdds" label="Price" className="inline-sort" />
                  </div>
                </th>
                <th className="owgr-header desktop-only" onClick={() => handleSort('owgr')} style={{ cursor: 'pointer' }}>
                  <div>World</div>
                  <div>Ranking</div>
                  {sortConfig.key === 'owgr' && (
                    <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th className="tipster-header desktop-only" onClick={() => handleSort('tipsterPicks')} style={{ cursor: 'pointer' }} title="Click to sort by Tipster Consensus">
                  🎯
                  {sortConfig.key === 'tipsterPicks' && (
                    <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                {bookmakers.map((bookmaker, idx) => (
                  <th key={idx}>
                    <div className="bookmaker-header">
                      <div className="bookmaker-name-rotated">{bookmaker.name}</div>
                      {userRegion === 'uk' && (
                        <div className="each-way-terms">
                          <span className="ew-places">{bookmaker.eachWay.places}</span>
                          <span className="ew-fraction">{bookmaker.eachWay.fraction}</span>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th className="best-odds-header mobile-only">Best</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredOdds.map((player, idx) => {
                const playerOutrightOdds = bookmakers.map(b => player.bookmakerOdds[b.name]?.outright).filter(o => o);
                const bestOdds = Math.max(...playerOutrightOdds);

                return (
                  <React.Fragment key={idx}>
                    <tr>
                      <td>
                        <div 
                          className="player-cell"
                          onClick={() => togglePlayerExpand(player.name)}
                        >
                          {expandedPlayer === player.name ? (
                            <ChevronUp className="expand-icon" size={16} />
                          ) : (
                            <ChevronDown className="expand-icon" size={16} />
                          )}
                          <span className="player-name">{player.name}</span>
                        </div>
                      </td>
                      <td className="owgr-cell desktop-only">
                        {player.owgr || '-'}
                      </td>
                      <td className="tipster-cell desktop-only">
                        {player.tipsterPicks && player.tipsterPicks.length > 0 ? (
                          <div 
                            className="tipster-bar-container"
                            onClick={() => {
                              // Show modal with tipster names
                              alert(`${player.tipsterPicks.length} tipsters selected ${player.name}:\n\n${player.tipsterPicks.join('\n')}`);
                            }}
                            title={`${player.tipsterPicks.length} expert tipsters selected this player`}
                          >
                            <div 
                              className="tipster-bar"
                              style={{
                                width: `${Math.min((player.tipsterPicks.length / 8) * 100, 100)}%`
                              }}
                            />
                            <span className="tipster-count">{player.tipsterPicks.length}</span>
                          </div>
                        ) : (
                          <div className="tipster-empty">-</div>
                        )}
                      </td>
                      {bookmakers.map((bookmaker, bIdx) => {
                        const odds = player.bookmakerOdds[bookmaker.name]?.outright;
                        const isBest = odds === bestOdds;
                        const affiliateUrl = affiliateLinks[bookmaker.name];
                        
                        return (
                          <td key={bIdx} className={`odds-cell ${isBest ? 'best-odds' : ''}`}>
                            <a 
                              href={affiliateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="odds-link"
                              onClick={(e) => {
                                // Track click in Google Analytics
                                if (window.gtag) {
                                  window.gtag('event', 'bookmaker_click', {
                                    bookmaker: bookmaker.name,
                                    player: player.name,
                                    odds: odds,
                                    tournament: selectedTournament.name
                                  });
                                }
                              }}
                            >
                              {formatOdds(odds)}
                            </a>
                          </td>
                        );
                      })}
                      <td 
                        className="odds-cell best-odds-cell-mobile"
                        onClick={() => togglePlayerExpand(player.name)}
                      >
                        {formatOdds(bestOdds)}
                      </td>
                    </tr>
                    {expandedPlayer === player.name && (
                      <tr className="expanded-row">
                        <td colSpan={bookmakers.length + 2} className="expanded-cell">
                          <div className="expanded-content">
                            {/* Desktop only */}
                            <div className="desktop-expanded-view">
                              <div className="desktop-cards-grid">
                                {/* Player Info Cards */}
                                <div className="desktop-info-card">
                                  <div className="desktop-card-label">Nationality</div>
                                  <div className="desktop-card-value">{player.nationality}</div>
                                </div>
                                
                                <div className="desktop-info-card">
                                  <div className="desktop-card-label">World</div>
                                  <div className="desktop-card-label">Ranking</div>
                                  <div className="desktop-card-value">#{player.owgr || 'N/A'}</div>
                                </div>
                                
                                <div className="desktop-info-card desktop-form-card">
                                  <div className="desktop-card-label">Recent Form</div>
                                  <div className="form-boxes">
                                    {player.recentForm?.map((pos, i) => (
                                      <span key={i} className={`form-box ${getFinishClass(pos)}`}>
                                        {typeof pos === 'number' ? pos : pos.replace('T', '')}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="desktop-info-card desktop-form-card">
                                  <div className="desktop-card-label">Course History</div>
                                  <div className="form-boxes">
                                    {player.courseHistory?.split('-').map((pos, i) => (
                                      <span key={i} className={`form-box ${getFinishClass(pos)}`}>
                                        {pos.replace('T', '')}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Extra Odds Cards */}
                                <div className="desktop-odds-card">
                                  <div className="desktop-card-label">Top 5</div>
                                  <div className="desktop-card-sublabel">Best</div>
                                  <div className="desktop-card-odds">
                                    {(() => {
                                      const allTop5 = bookmakers.map(b => player.bookmakerOdds[b.name]?.top5).filter(o => o);
                                      return formatOdds(Math.max(...allTop5));
                                    })()}
                                  </div>
                                </div>
                                
                                <div className="desktop-odds-card">
                                  <div className="desktop-card-label">Top 10</div>
                                  <div className="desktop-card-sublabel">Best</div>
                                  <div className="desktop-card-odds">
                                    {(() => {
                                      const allTop10 = bookmakers.map(b => player.bookmakerOdds[b.name]?.top10).filter(o => o);
                                      return formatOdds(Math.max(...allTop10));
                                    })()}
                                  </div>
                                </div>
                                
                                <div className="desktop-odds-card">
                                  <div className="desktop-card-label">Top 20</div>
                                  <div className="desktop-card-sublabel">Best</div>
                                  <div className="desktop-card-odds">
                                    {(() => {
                                      const allTop20 = bookmakers.map(b => player.bookmakerOdds[b.name]?.top20).filter(o => o);
                                      return formatOdds(Math.max(...allTop20));
                                    })()}
                                  </div>
                                </div>

                                <div className="desktop-odds-card">
                                  <div className="desktop-card-label">Top 30</div>
                                  <div className="desktop-card-sublabel">Best</div>
                                  <div className="desktop-card-odds">
                                    {(() => {
                                      const allTop30 = bookmakers.map(b => player.bookmakerOdds[b.name]?.top30).filter(o => o);
                                      return formatOdds(Math.max(...allTop30));
                                    })()}
                                  </div>
                                </div>

                                <div className="desktop-odds-card">
                                  <div className="desktop-card-label">Top 40</div>
                                  <div className="desktop-card-sublabel">Best</div>
                                  <div className="desktop-card-odds">
                                    {(() => {
                                      const allTop40 = bookmakers.map(b => player.bookmakerOdds[b.name]?.top40).filter(o => o);
                                      return formatOdds(Math.max(...allTop40));
                                    })()}
                                  </div>
                                </div>
                                
                                <div className="desktop-odds-card">
                                  <div className="desktop-card-label">R1 Leader</div>
                                  <div className="desktop-card-sublabel">Best</div>
                                  <div className="desktop-card-odds">
                                    {(() => {
                                      const allR1 = bookmakers.map(b => player.bookmakerOdds[b.name]?.r1Leader).filter(o => o);
                                      return formatOdds(Math.max(...allR1));
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Mobile: Horizontal swipeable panes */}
                            <div className="mobile-panes-wrapper">
                              <div className="mobile-tabs-container">
                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Outright Winner Odds</h3>
                                  <div className="mobile-bookmaker-grid">
                                    {bookmakers.map((bookmaker, i) => {
                                      const odds = player.bookmakerOdds[bookmaker.name]?.outright;
                                      const isBest = odds === bestOdds;
                                      return (
                                        <a
                                          key={i}
                                          href={affiliateLinks[bookmaker.name]}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`mobile-bookmaker-card ${isBest ? 'best' : ''}`}
                                          onClick={() => {
                                            if (window.gtag) {
                                              window.gtag('event', 'bookmaker_click', {
                                                bookmaker: bookmaker.name,
                                                player: player.name,
                                                odds: odds,
                                                source: 'mobile_outright'
                                              });
                                            }
                                          }}
                                        >
                                          <div className="mobile-bookmaker-name">{bookmaker.name}</div>
                                          <div className="mobile-bookmaker-odds">{formatOdds(odds)}</div>
                                          {userRegion === 'uk' && (
                                            <div className="mobile-bookmaker-ew">{bookmaker.eachWay.places} places</div>
                                          )}
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Extra Odds</h3>
                                  <div className="mobile-extra-grid">
                                    {['top5', 'top10', 'top20', 'top30', 'top40', 'makeCut'].map((market, idx) => {
                                      const labels = {
                                        top5: 'Top 5',
                                        top10: 'Top 10',
                                        top20: 'Top 20',
                                        top30: 'Top 30',
                                        top40: 'Top 40',
                                        makeCut: 'Make Cut'
                                      };
                                      
                                      const allOdds = bookmakers.map(b => ({
                                        name: b.name,
                                        odds: player.bookmakerOdds[b.name]?.[market] || (market === 'makeCut' ? 1.2 : null),
                                        url: affiliateLinks[b.name]
                                      })).filter(o => o.odds);
                                      
                                      const best = allOdds.length > 0 
                                        ? allOdds.reduce((max, curr) => curr.odds > max.odds ? curr : max, allOdds[0])
                                        : null;
                                      
                                      return best ? (
                                        <a
                                          key={idx}
                                          href={best.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="mobile-extra-card"
                                          onClick={() => {
                                            if (window.gtag) {
                                              window.gtag('event', 'bookmaker_click', {
                                                bookmaker: best.name,
                                                player: player.name,
                                                market: labels[market],
                                                odds: best.odds,
                                                source: 'mobile_extra'
                                              });
                                            }
                                          }}
                                        >
                                          <div className="mobile-extra-label">{labels[market]}</div>
                                          <div className="mobile-extra-bookmaker">{best.name}</div>
                                          <div className="mobile-extra-odds">{formatOdds(best.odds)}</div>
                                        </a>
                                      ) : null;
                                    })}
                                  </div>
                                </div>

                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Player Stats</h3>
                                  <div className="mobile-stats-grid">
                                    {/* Row 1: Nationality + Ranking side by side */}
                                    <div className="mobile-stat-card">
                                      <div className="mobile-stat-label">Nationality</div>
                                      <div className="mobile-stat-value">{player.nationality}</div>
                                    </div>
                                    <div className="mobile-stat-card">
                                      <div className="mobile-stat-label">World Ranking</div>
                                      <div className="mobile-stat-value">#{player.owgr || 'N/A'}</div>
                                    </div>
                                    
                                    {/* Row 2: Recent Form - full width */}
                                    <div className="mobile-stat-card mobile-stat-full-width">
                                      <div className="mobile-stat-label">Recent Form</div>
                                      <div className="form-boxes">
                                        {player.recentForm?.map((pos, i) => (
                                          <span key={i} className={`form-box ${getFinishClass(pos)}`}>
                                            {typeof pos === 'number' ? pos : pos.replace('T', '')}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {/* Row 3: Course History - full width */}
                                    <div className="mobile-stat-card mobile-stat-full-width">
                                      <div className="mobile-stat-label">Course History</div>
                                      <div className="form-boxes">
                                        {player.courseHistory?.split('-').map((pos, i) => (
                                          <span key={i} className={`form-box ${getFinishClass(pos)}`}>
                                            {pos.replace('T', '')}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mobile-swipe-indicator">← Swipe for more →</div>
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
      )}

      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-disclaimer">
              <p className="responsible-gambling">
                <strong>18+ Only.</strong> Please gamble responsibly. If you need help, visit{' '}
                <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">BeGambleAware.org</a>
                {' '}or call the National Gambling Helpline on 0808 8020 133.
              </p>
              <p className="affiliate-notice">
                The Fairway is an independent odds comparison service. We may earn commission from bookmaker links. 
                All odds are subject to change. Please check bookmaker sites for current terms and conditions.
              </p>
            </div>
          </div>

          <div className="footer-odds-format">
            <div className="footer-settings-group">
              <label htmlFor="region-footer">Region:</label>
              <div className="region-toggle-footer">
                <button 
                  className={`region-btn-footer ${userRegion === 'uk' ? 'active' : ''}`}
                  onClick={() => {
                    setUserRegion('uk');
                    setOddsFormat('fractional');
                    localStorage.setItem('userRegion', 'uk');
                    localStorage.setItem('oddsFormat', 'fractional');
                  }}
                  title="UK Bookmakers"
                >
                  🇬🇧 UK
                </button>
                <button 
                  className={`region-btn-footer ${userRegion === 'us' ? 'active' : ''}`}
                  onClick={() => {
                    setUserRegion('us');
                    setOddsFormat('american');
                    localStorage.setItem('userRegion', 'us');
                    localStorage.setItem('oddsFormat', 'american');
                  }}
                  title="US Bookmakers"
                >
                  🇺🇸 US
                </button>
              </div>
            </div>
            <div className="footer-settings-group">
              <label htmlFor="odds-format-footer">Odds Format:</label>
              <select 
                id="odds-format-footer"
                value={oddsFormat} 
                onChange={(e) => {
                  setOddsFormat(e.target.value);
                  localStorage.setItem('oddsFormat', e.target.value);
                }}
                className="footer-odds-dropdown"
              >
                <option value="decimal">Decimal (6.50)</option>
                <option value="fractional">Fractional (11/2)</option>
                <option value="american">American (+550)</option>
              </select>
            </div>
          </div>
          
          <div className="footer-links">
            <a href="/terms" className="footer-link">Terms & Conditions</a>
            <span className="footer-separator">|</span>
            <a href="/privacy" className="footer-link">Privacy Policy</a>
            <span className="footer-separator">|</span>
            <a href="/responsible-gambling" className="footer-link">Responsible Gambling</a>
            <span className="footer-separator">|</span>
            <a href="/contact" className="footer-link">Contact</a>
          </div>

          <div className="footer-logos">
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="footer-logo-link">
              <span className="gamcare-text">BeGambleAware</span>
            </a>
            <span className="footer-separator">|</span>
            <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="footer-logo-link">
              <span className="gamcare-text">GamCare</span>
            </a>
          </div>

          <div className="footer-copyright">
            <p>© 2025 The Fairway. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GolfOddsComparison;
