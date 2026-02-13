import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import logoImg from './logo.png';
import wordmarkImg from './wordmark.png';

// ===== API CONFIGURATION (single declaration) =====
const ODDS_API_KEY = 'f68c6ebed30010a80949e68b3e57c825';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const USE_LIVE_API = false;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// ===== WORLD RANKINGS — Google Sheets =====
const RANKINGS_SHEET_URL = 'https://script.google.com/macros/s/AKfycbz0AV6lo8WSGm1qFLfKVKW8zbg2NrLaYGd82e20vPvrPFmQqsMUK6sIA0sc5fApVUUx/exec';
const RANKINGS_CACHE_KEY = 'fairway_owgr';
const RANKINGS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getISOWeekKey() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan4.getDay()) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getCachedRankings() {
  try {
    const raw = localStorage.getItem(RANKINGS_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp, weekKey } = JSON.parse(raw);
    if ((Date.now() - timestamp) > RANKINGS_TTL_MS || weekKey !== getISOWeekKey()) return null;
    return data;
  } catch { return null; }
}

function setCachedRankings(data) {
  try {
    localStorage.setItem(RANKINGS_CACHE_KEY, JSON.stringify({
      data, timestamp: Date.now(), weekKey: getISOWeekKey()
    }));
  } catch { }
}

async function fetchWorldRankings() {
  const cached = getCachedRankings();
  if (cached) return cached;
  try {
    const res = await fetch(RANKINGS_SHEET_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rankings = json.rankings || {};
    if (Object.keys(rankings).length === 0) throw new Error('Empty response');
    setCachedRankings(rankings);
    console.log(`OWGR loaded: ${Object.keys(rankings).length} players`);
    return rankings;
  } catch (err) {
    console.warn('OWGR unavailable, using fallback:', err.message);
    return null;
  }
}

function getWorldRank(rankings, playerName) {
  if (!rankings || !playerName) return null;
  if (rankings[playerName] !== undefined) return rankings[playerName];
  const lower = playerName.toLowerCase();
  const ci = Object.keys(rankings).find(k => k.toLowerCase() === lower);
  if (ci) return rankings[ci];
  const last = playerName.split(' ').slice(-1)[0].toLowerCase();
  const fallback = Object.keys(rankings).find(k => k.toLowerCase().endsWith(last));
  return fallback ? rankings[fallback] : null;
}

const MAJORS = [
  { id: 'masters', name: 'The Masters', apiKey: 'golf_masters_tournament_winner' },
  { id: 'pga', name: 'PGA Championship', apiKey: 'golf_pga_championship_winner' },
  { id: 'usopen', name: 'US Open', apiKey: 'golf_us_open_winner' },
  { id: 'open', name: 'The Open', apiKey: 'golf_the_open_championship_winner' }
];

const SPORT_KEYS = {
  'masters': 'golf_masters_tournament_winner',
  'pga': 'golf_pga_championship_winner',
  'usopen': 'golf_us_open_winner',
  'open': 'golf_the_open_championship_winner'
};

// Map bookmaker names to logo filenames in /public/logos/
const BOOKMAKER_LOGOS = {
  'Bet365': 'bet365.png',
  'William Hill': 'williamhill.png',
  'Betway': 'betway.png',
  'Coral': 'coral.png',
  'Ladbrokes': 'ladbrokes.png',
  'Paddy Power': 'paddypower.png',
  'Sky Bet': 'skybet.png',
  'Betfair Sportsbook': 'betfair.png',
  'BoyleSports': 'boylesports.png',
  '888sport': '888sport.png'
};

// ===== WORLD RANKINGS HELPERS =====

const GolfOddsComparison = () => {
  const affiliateLinks = {
    'Bet365': 'https://www.bet365.com/olp/golf?affiliate=YOUR_BET365_ID',
    'William Hill': 'https://www.williamhill.com/golf?AffiliateID=YOUR_WH_ID',
    'Betway': 'https://sports.betway.com/golf?btag=YOUR_BETWAY_ID',
    'Coral': 'https://www.coral.co.uk/sports/golf?cid=YOUR_CORAL_ID',
    'Ladbrokes': 'https://sports.ladbrokes.com/golf?affiliate=YOUR_LADBROKES_ID',
    'Paddy Power': 'https://www.paddypower.com/golf?AFF_ID=YOUR_PP_ID',
    'Sky Bet': 'https://www.skybet.com/golf?aff=YOUR_SKYBET_ID',
    'Betfair Sportsbook': 'https://www.betfair.com/sport/golf?pid=YOUR_BETFAIR_ID',
    'BoyleSports': 'https://www.boylesports.com/golf?aff=YOUR_BOYLE_ID',
    '888sport': 'https://www.888sport.com/golf?affiliate=YOUR_888_ID',
  };

  const [odds, setOdds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'avgOdds', direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(MAJORS[0]);
  const [bookmakers, setBookmakers] = useState([]);
  const [useMock, setUseMock] = useState(false);
  const [oddsFormat, setOddsFormat] = useState('fractional');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [activeMobilePane, setActiveMobilePane] = useState(0);
  const [apiStatus, setApiStatus] = useState({ isLive: false, lastUpdated: null, error: null });
  const [worldRankings, setWorldRankings] = useState(null);

  // World rankings state

  const fetchInProgress = useRef(false);

  // Fetch OWGR from Google Sheet on mount — cached 7 days
  useEffect(() => {
    fetchWorldRankings().then(r => { if (r) setWorldRankings(r); });
  }, []);


  const getCachedData = useCallback((tournamentId) => {
    try {
      const cached = localStorage.getItem('oddsCache');
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      if (age < CACHE_DURATION_MS && parsed.tournament === tournamentId) {
        console.log(`\u2705 Using cached data (${Math.round(age / 1000 / 60)} mins old)`);
        return parsed.apiResponse;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  const setCachedData = useCallback((apiResponse, tournamentId) => {
    try {
      localStorage.setItem('oddsCache', JSON.stringify({
        apiResponse,
        timestamp: Date.now(),
        tournament: tournamentId
      }));
    } catch (error) {}
  }, []);

  useEffect(() => {
    const mastersDate = new Date('2026-04-09T08:00:00-04:00');
    const updateCountdown = () => {
      const now = new Date();
      const diff = mastersDate - now;
      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedFormat = localStorage.getItem('oddsFormat');
    if (savedFormat) setOddsFormat(savedFormat);
  }, []);

  const processLiveOdds = useCallback((apiData) => {
    const bookmakerSet = new Map();
    const playersMap = new Map();

    apiData.forEach(event => {
      event.bookmakers?.forEach(bookmaker => {
        // Skip Betfair Exchange - only show Betfair Sportsbook
        if (bookmaker.key === 'betfair_ex') return;

        const bookmakerName = bookmaker.key === 'betfair' ? 'Betfair Sportsbook'
          : (bookmaker.title || bookmaker.key);
        if (!bookmakerSet.has(bookmakerName)) {
          bookmakerSet.set(bookmakerName, {
            name: bookmakerName,
            key: bookmaker.key,
            eachWay: { places: '5', fraction: '1/5' }
          });
        }
        bookmaker.markets?.forEach(market => {
          if (market.key === 'outrights') {
            market.outcomes?.forEach(outcome => {
              const playerName = outcome.name;
              if (!playersMap.has(playerName)) {
                playersMap.set(playerName, {
                  name: playerName,
                  nationality: 'TBD',
                  owgr: null,
                  recentForm: [],
                  courseHistory: '',
                  tipsterPicks: [],
                  bookmakerOdds: {}
                });
              }
              const player = playersMap.get(playerName);
              player.bookmakerOdds[bookmakerName] = {
                outright: outcome.price,
                top5: 'N/A', top10: 'N/A', top20: 'N/A',
                top30: 'N/A', top40: 'N/A', makeCut: 'N/A', r1Leader: 'N/A'
              };
            });
          }
        });
      });
    });

    const players = Array.from(playersMap.values()).map(player => {
      const outrightOdds = Object.values(player.bookmakerOdds)
        .map(o => o.outright).filter(o => typeof o === 'number');
      const avgOdds = outrightOdds.length > 0
        ? outrightOdds.reduce((a, b) => a + b, 0) / outrightOdds.length : 999;
      return { ...player, avgOdds };
    });

    const bookmakerList = Array.from(bookmakerSet.values());

    const expectedBookmakers = [
      { name: 'Bet365', key: 'bet365', eachWay: { places: '5' } },
      { name: 'William Hill', key: 'williamhill', eachWay: { places: '5' } },
      { name: 'Betway', key: 'betway', eachWay: { places: '6' } },
      { name: 'Coral', key: 'coral', eachWay: { places: '5' } },
      { name: 'Ladbrokes', key: 'ladbrokes', eachWay: { places: '5' } },
      { name: 'Paddy Power', key: 'paddypower', eachWay: { places: '6' } },
      { name: 'Sky Bet', key: 'skybet', eachWay: { places: '5' } },
      { name: 'Betfair Sportsbook', key: 'betfair', eachWay: { places: '5' } },
      { name: 'BoyleSports', key: 'boylesports', eachWay: { places: '5' } },
      { name: '888sport', key: '888sport', eachWay: { places: '5' } },
    ];

    const liveKeys = new Set(bookmakerList.map(b => b.key));
    const mergedBookmakers = [
      ...bookmakerList,
      ...expectedBookmakers.filter(b => !liveKeys.has(b.key))
    ];
    setOdds(players);
    setBookmakers(mergedBookmakers);
  }, []);

  const useMockData = useCallback(() => {
    setUseMock(true);
    const mockPlayers = [
      { name: 'Scottie Scheffler', nationality: 'USA', owgr: null, recentForm: [1, 2, 1, 3, 1, 2, 1], courseHistory: 'T2-1-T5-4-2-T3-1', tipsterPicks: ['GolfAnalyst', 'BettingExpert', 'ProGolfTips', 'OddsSharks', 'GreenJacket', 'TheMastersGuru', 'BirdiePicksGolf', 'FairwayFinder'] },
      { name: 'Rory McIlroy', nationality: 'NIR', owgr: null, recentForm: [3, 1, 5, 2, 4, 3, 2], courseHistory: 'T5-T7-2-T8-3-T6-4', tipsterPicks: ['GolfAnalyst', 'ProGolfTips', 'GreenJacket', 'BirdiePicksGolf', 'FairwayFinder', 'SwingTipster'] },
      { name: 'Jon Rahm', nationality: 'ESP', owgr: null, recentForm: [2, 4, 1, 1, 6, 3, 2], courseHistory: '1-T3-T4-2-1-T5-3', tipsterPicks: ['BettingExpert', 'OddsSharks', 'TheMastersGuru', 'SwingTipster', 'GolfWisdom'] },
      { name: 'Viktor Hovland', nationality: 'NOR', owgr: null, recentForm: [5, 3, 2, 4, 3, 5, 4], courseHistory: 'T12-T8-T15-T10-T9-T11-T13', tipsterPicks: ['ProGolfTips', 'BirdiePicksGolf', 'GolfWisdom'] },
      { name: 'Brooks Koepka', nationality: 'USA', owgr: null, recentForm: [4, 6, 3, 5, 2, 4, 3], courseHistory: 'T2-1-T4-3-T2-2-1', tipsterPicks: ['OddsSharks', 'TheMastersGuru', 'FairwayFinder', 'SwingTipster'] },
      { name: 'Xander Schauffele', nationality: 'USA', owgr: null, recentForm: [6, 2, 4, 3, 5, 6, 4], courseHistory: 'T3-T5-T9-T7-T4-T6-T8', tipsterPicks: ['GolfAnalyst', 'GreenJacket', 'GolfWisdom'] },
      { name: 'Collin Morikawa', nationality: 'USA', owgr: null, recentForm: [7, 5, 6, 8, 4, 7, 5], courseHistory: 'T18-T12-T20-T15-T11-T14-T16', tipsterPicks: ['BettingExpert', 'BirdiePicksGolf'] },
      { name: 'Patrick Cantlay', nationality: 'USA', owgr: null, recentForm: [8, 4, 7, 6, 7, 8, 6], courseHistory: 'T9-T14-T11-T10-T12-T13-T11', tipsterPicks: ['ProGolfTips', 'SwingTipster'] },
      { name: 'Tommy Fleetwood', nationality: 'ENG', owgr: null, recentForm: [10, 8, 9, 7, 9, 10, 8], courseHistory: 'T17-T22-T15-T19-T18-T20-T16', tipsterPicks: ['TheMastersGuru'] },
      { name: 'Jordan Spieth', nationality: 'USA', owgr: null, recentForm: [9, 11, 8, 10, 8, 9, 10], courseHistory: '1-T2-MC-T8-T10-MC-T15', tipsterPicks: ['OddsSharks', 'FairwayFinder', 'GolfWisdom'] },
      { name: 'Max Homa', nationality: 'USA', owgr: null, recentForm: [11, 9, 10, 12, 11, 11, 9], courseHistory: 'T24-T19-T28-T22-T25-T21-T23', tipsterPicks: ['BirdiePicksGolf'] },
      { name: 'Cameron Smith', nationality: 'AUS', owgr: null, recentForm: [12, 13, 11, 9, 13, 12, 11], courseHistory: 'T3-T5-T12-T8-T6-T9-T7', tipsterPicks: ['GreenJacket', 'SwingTipster'] },
      { name: 'Justin Thomas', nationality: 'USA', owgr: null, recentForm: [14, 10, 12, 14, 10, 13, 12], courseHistory: 'T8-T16-T7-T12-T10-T14-T9', tipsterPicks: ['GolfAnalyst'] },
      { name: 'Hideki Matsuyama', nationality: 'JPN', owgr: null, recentForm: [13, 14, 13, 11, 15, 14, 13], courseHistory: '1-T11-T18-T15-T12-T16-T14', tipsterPicks: ['BettingExpert', 'TheMastersGuru'] },
      { name: 'Tony Finau', nationality: 'USA', owgr: null, recentForm: [15, 12, 14, 13, 12, 15, 14], courseHistory: 'T5-T10-T21-T18-T15-T19-T17', tipsterPicks: [] },
      { name: 'Shane Lowry', nationality: 'IRL', owgr: null, recentForm: [16, 15, 17, 18, 14, 16, 15], courseHistory: 'T12-T25-MC-T20-T22-MC-T18', tipsterPicks: ['ProGolfTips'] },
      { name: 'Tyrrell Hatton', nationality: 'ENG', owgr: null, recentForm: [18, 17, 15, 16, 19, 18, 17], courseHistory: 'T15-T18-T23-T21-T19-T22-T20', tipsterPicks: [] },
      { name: 'Min Woo Lee', nationality: 'AUS', owgr: null, recentForm: [19, 20, 18, 17, 16, 19, 18], courseHistory: 'MC-T35-T42-T38-T40-MC-T36', tipsterPicks: [] },
      { name: 'Ludvig Aberg', nationality: 'SWE', owgr: null, recentForm: [2, 5, 3, 7, 6, 4, 5], courseHistory: '\u2014-8-6-10-7-9-8', tipsterPicks: ['GolfAnalyst', 'BettingExpert', 'OddsSharks', 'GreenJacket', 'BirdiePicksGolf'] },
      { name: 'Sahith Theegala', nationality: 'USA', owgr: null, recentForm: [20, 16, 19, 20, 18, 20, 19], courseHistory: 'T19-MC-T31-T28-T25-MC-T29', tipsterPicks: [] },
    ];

    const bookmakerList = [
      { name: 'Bet365', eachWay: { places: '5' } },
      { name: 'William Hill', eachWay: { places: '5' } },
      { name: 'Betway', eachWay: { places: '6' } },
      { name: 'Coral', eachWay: { places: '5' } },
      { name: 'Ladbrokes', eachWay: { places: '5' } },
      { name: 'Paddy Power', eachWay: { places: '6' } },
      { name: 'Sky Bet', eachWay: { places: '5' } },
      { name: 'Betfair Sportsbook', eachWay: { places: '5' } },
      { name: 'BoyleSports', eachWay: { places: '5' } },
      { name: '888sport', eachWay: { places: '5' } },
    ];

    setBookmakers(bookmakerList);

    const mockOdds = mockPlayers.map(player => {
      const playerOdds = {};
      const baseOdds = 5 + Math.random() * 45;
      bookmakerList.forEach(book => {
        const outright = +(baseOdds + (Math.random() - 0.5) * 3).toFixed(1);
        playerOdds[book.name] = {
          outright,
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
      return { ...player, bookmakerOdds: playerOdds, avgOdds };
    });

    setOdds(mockOdds);
  }, []);

  const fetchTournamentData = useCallback(async (tournament) => {
    if (fetchInProgress.current) return;
    if (!USE_LIVE_API) { useMockData(); return; }

    const cachedData = getCachedData(tournament.id);
    if (cachedData) {
      processLiveOdds(cachedData);
      setApiStatus({ isLive: true, lastUpdated: new Date(), error: null });
      setUseMock(false);
      setLoading(false);
      return;
    }

    console.log('\ud83d\udd34 Fetching LIVE odds from The Odds API...');
    fetchInProgress.current = true;
    setLoading(true);

    try {
      const sportKey = SPORT_KEYS[tournament.id];
      if (!sportKey) throw new Error(`Unknown tournament: ${tournament.id}`);

      const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?` +
        `apiKey=${ODDS_API_KEY}&regions=uk&markets=outrights&oddsFormat=decimal`;

      console.log('\ud83c\udf10 API URL:', url.replace(ODDS_API_KEY, 'KEY_HIDDEN'));

      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        useMockData();
        setApiStatus({ isLive: false, lastUpdated: null, error: 'No data available yet. Showing demo data.' });
        return;
      }

      setCachedData(data, tournament.id);
      processLiveOdds(data);
      setApiStatus({ isLive: true, lastUpdated: new Date(), error: null });
      setUseMock(false);
      console.log('\u2705 LIVE DATA loaded!');

    } catch (error) {
      console.error('\u274c API Error:', error.message);
      useMockData();
      setApiStatus({ isLive: false, lastUpdated: null, error: error.message });
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [getCachedData, setCachedData, processLiveOdds, useMockData]);

  useEffect(() => {
    fetchTournamentData(selectedTournament);
  }, [selectedTournament, fetchTournamentData]);

  // ===== MERGE WORLD RANKINGS INTO ODDS DATA =====
  // When either odds or rankings load/update, hydrate the owgr field on each player.
  const oddsWithRankings = useMemo(() => {
    if (!worldRankings) return odds; // Rankings not yet loaded \u2014 show players without rank
    return odds.map(player => ({
      ...player,
      owgr: getWorldRank(worldRankings, player.name) ?? player.owgr
    }));
  }, [odds, worldRankings]);

  const sortedAndFilteredOdds = useMemo(() => {
    let filtered = oddsWithRankings.filter(player =>
      player.name.toLowerCase().includes(filterText.toLowerCase())
    );
    return filtered.sort((a, b) => {
      let aValue, bValue;
      if (sortConfig.key === 'name') {
        aValue = a.name.split(' ').slice(-1)[0];
        bValue = b.name.split(' ').slice(-1)[0];
      } else if (sortConfig.key === 'owgr') {
        aValue = a.owgr || 999;
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
  }, [oddsWithRankings, sortConfig, filterText]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatOdds = (odds) => {
    if (!odds || odds === 'N/A') return '-';
    const numOdds = typeof odds === 'string' ? parseFloat(odds) : odds;
    if (isNaN(numOdds)) return '-';
    if (oddsFormat === 'american') {
      return numOdds >= 2.0 ? `+${Math.round((numOdds - 1) * 100)}` : `${Math.round(-100 / (numOdds - 1))}`;
    } else if (oddsFormat === 'fractional') {
      const decimalOdds = numOdds - 1;
      const commonFractions = {
        0.5: '1/2', 0.33: '1/3', 0.67: '2/3', 0.25: '1/4', 0.75: '3/4',
        0.2: '1/5', 0.4: '2/5', 0.6: '3/5', 0.8: '4/5',
        1: '1/1', 1.5: '3/2', 2: '2/1', 2.5: '5/2', 3: '3/1',
        3.5: '7/2', 4: '4/1', 5: '5/1', 6: '6/1', 7: '7/1',
        8: '8/1', 9: '9/1', 10: '10/1', 11: '11/1', 12: '12/1',
        14: '14/1', 16: '16/1', 20: '20/1', 25: '25/1', 33: '33/1',
        50: '50/1', 66: '66/1', 100: '100/1'
      };
      const rounded = Math.round(decimalOdds * 100) / 100;
      if (commonFractions[rounded]) return commonFractions[rounded];
      let numerator = Math.round(decimalOdds * 100);
      let denominator = 100;
      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(numerator, denominator);
      return `${numerator / divisor}/${denominator / divisor}`;
    } else {
      return numOdds % 1 === 0 ? numOdds.toFixed(0) : numOdds.toFixed(1);
    }
  };

  const getFinishClass = (position) => {
    if (position === 'MC' || position === 'WD' || position === 'DQ') return 'finish-mc';
    const posNum = parseInt(position.toString().replace(/\D/g, ''));
    if (isNaN(posNum)) return 'finish-other';
    if (posNum === 1) return 'finish-1';
    if (posNum <= 5) return 'finish-2-5';
    if (posNum <= 10) return 'finish-6-10';
    if (posNum <= 20) return 'finish-11-20';
    if (posNum <= 30) return 'finish-21-30';
    if (posNum <= 50) return 'finish-31-50';
    return 'finish-other';
  };

  const owgrBadge = (rank) => {
    if (!rank) return <span style={{ color: '#ccc' }}>-</span>;
    const cls = rank <= 10 ? 'owgr-badge owgr-top10' : rank <= 50 ? 'owgr-badge owgr-top50' : 'owgr-badge owgr-other';
    return <span className={cls}>#{rank}</span>;
  };

  const togglePlayerExpand = (playerName) => {
    setExpandedPlayer(expandedPlayer === playerName ? null : playerName);
  };

  const handleForceRefresh = () => {
    localStorage.removeItem('oddsCache');
    fetchInProgress.current = false;
    fetchTournamentData(selectedTournament);
  };

  const SortableHeader = ({ sortKey, label, className = '' }) => (
    <span
      onClick={() => handleSort(sortKey)}
      className={`sortable-header ${className}`}
    >
      {label}
      {sortConfig.key === sortKey && (
        <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' \u2191' : ' \u2193'}</span>
      )}
    </span>
  );

  return (
    <div className="app-container">
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background: #fafafa;
          color: #1a1a1a;
          overflow-x: hidden;
          max-width: 100vw;
        }

        .app-container { max-width: 1600px; margin: 0 auto; padding: 0; overflow-x: hidden; }

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

        .header-left { justify-self: start; }
        .header-center { justify-self: center; }

        .header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0;
          height: 100%;
        }

        .tagline { font-size: 1.7rem; color: #666; font-weight: 500; padding-top: 8px; }
        .wordmark { width: 100mm; height: auto; }
        .logo-center { height: 90px; width: auto; }
        .logo-mobile { display: none; }
        .logo-desktop { display: block; }

        .tournament-tabs { display: flex; gap: 8px; }

        .countdown-container {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.85rem;
        }

        .countdown-label { color: #666; font-weight: 500; }
        .countdown-time { color: #1a1a1a; font-weight: 700; font-family: 'Courier New', monospace; }

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

        .tournament-tab:hover { color: #1a1a1a; border-color: #1a1a1a; }
        .tournament-tab.active { background: #1a1a1a; color: white; border-color: #1a1a1a; font-weight: 600; }

        .best-odds-header { display: none; }
        .best-odds-cell-mobile { display: none; }

        .controls-bar {
          background: white;
          padding: 15px 30px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .search-bar { position: relative; max-width: 300px; }

        .search-bar input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .search-bar input:focus { outline: none; border-color: #1a1a1a; }

        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #999; }

        .refresh-button {
          padding: 8px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-button:hover:not(:disabled) { background: #218838; transform: translateY(-1px); }
        .refresh-button:disabled { background: #6c757d; cursor: not-allowed; opacity: 0.6; }

        .demo-notice { background: #fff3cd; padding: 12px 30px; border-bottom: 1px solid #ffc107; font-size: 0.85rem; color: #856404; }
        .live-notice { background: #d4edda; padding: 12px 30px; border-bottom: 1px solid #28a745; font-size: 0.85rem; color: #155724; font-weight: 600; }
        .error-notice { background: #f8d7da; padding: 12px 30px; border-bottom: 1px solid #dc3545; font-size: 0.85rem; color: #721c24; }

        .odds-matrix-container {
          background: white;
          overflow-x: auto;
          overflow-y: auto;
          max-height: calc(100vh - 140px);
        }

        .odds-matrix { width: 100%; border-collapse: collapse; min-width: 800px; }

        .odds-matrix thead th {
          background: #f8f8f8;
          padding: 8px 4px;
          text-align: center;
          font-weight: 600;
          font-size: 0.75rem;
          border-right: 1px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .odds-matrix thead th:first-child {
          position: sticky;
          left: 0;
          top: 0;
          z-index: 11;
          background: #f8f8f8;
          text-align: left;
          padding-left: 20px;
          width: 204px;
          min-width: 204px;
          max-width: 204px;
        }

        .player-header {
          background: #f8f8f8;
          padding: 16px 20px;
          text-align: left;
          font-weight: 600;
          font-size: 0.75rem;
          border-right: 1px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
          position: sticky;
          left: 0;
          top: 0;
          z-index: 11;
          width: 204px;
          min-width: 204px;
          max-width: 204px;
        }

        .player-header-content { display: flex; align-items: center; gap: 8px; }
        .inline-sort { cursor: pointer; transition: color 0.2s; font-size: 0.75rem; font-weight: 600; }
        .inline-sort:hover { color: #1a1a1a; }
        .header-separator { color: #ccc; font-weight: 400; }

        /* Bookmaker header - logo fills full column like Oddschecker */
        .bookmaker-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 120px;
          padding: 0;
          overflow: hidden;
          width: 100%;
        }

        /* Rotate the wrapper so logo reads bottom-to-top */
        .bookmaker-logo-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(270deg);
          width: 120px;
          height: 52px;
          overflow: hidden;
        }

        /* Every logo gets the same fixed box - object-fit scales within it */
        .bookmaker-logo {
          width: 110px;
          height: 32px;
          object-fit: contain;
          object-position: center;
          display: block;
          flex-shrink: 0;
        }

        .each-way-terms {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: #666;
          padding: 3px 0;
          width: 100%;
        }

        .ew-places { font-weight: 600; color: #1a1a1a; }
        .ew-fraction { display: none; }

        .sortable-header { cursor: pointer; user-select: none; }
        .sortable-header:hover { background: #f0f0f0; }
        .sort-arrow { font-size: 0.8rem; opacity: 0.7; }

        .odds-matrix tbody tr { border-bottom: 1px solid #f0f0f0; }
        .odds-matrix tbody tr:hover { background: #fafafa; }

        .odds-matrix tbody td {
          padding: 14px 4px;
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
          width: 204px;
          min-width: 204px;
          max-width: 204px;
        }

        .odds-matrix tbody tr:hover td:first-child { background: #fafafa; }

        .player-cell { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; }
        .expand-icon { color: #999; flex-shrink: 0; }
        .player-name { white-space: nowrap; flex: 1; min-width: 0; }
        .desktop-only { display: table-cell; }
        .mobile-only { display: none; }

        .tipster-header {
          font-size: 1.4rem;
          cursor: help;
          padding: 12px 6px;
          min-width: 40px;
          max-width: 50px;
        }

        .owgr-header {
          font-size: 0.7rem;
          padding: 8px 6px;
          width: 60px;
          min-width: 60px;
          max-width: 60px;
          line-height: 1.2;
        }

        .owgr-header div { font-weight: 600; }

        .owgr-badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 0.78rem; font-weight: 700; line-height: 1.4; }
        .owgr-top10 { background: #d4edda; color: #155724; }
        .owgr-top50 { background: #fff3cd; color: #856404; }
        .owgr-other { background: #f0f0f0; color: #555; }
        .owgr-cell {
          padding: 10px 4px;
          text-align: center;
          font-weight: 600;
          color: #666;
          font-size: 0.9rem;
          width: 60px;
        }

        /* World ranking badge colours */
        .owgr-badge {
          display: inline-block;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 0.78rem;
          font-weight: 700;
          line-height: 1.4;
        }
        .owgr-top10  { background: #d4edda; color: #155724; }
        .owgr-top50  { background: #fff3cd; color: #856404; }
        .owgr-other  { background: #f0f0f0; color: #555; }

        .tipster-cell { padding: 10px 4px; width: 50px; }

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

        .tipster-bar-container:hover { transform: scale(1.05); }

        .tipster-bar {
          position: absolute;
          left: 0; top: 0;
          height: 100%;
          background: linear-gradient(90deg, #2d5a2d, #4d8a4d);
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
        }

        .tipster-empty { text-align: center; color: #ccc; }
        .odds-cell { font-weight: 500; color: #1a1a1a; }

        .odds-link {
          display: block;
          color: inherit;
          text-decoration: none;
          padding: 2px 4px;
          border-radius: 3px;
          transition: all 0.2s;
        }

        .odds-link:hover { background: rgba(0,0,0,0.05); transform: scale(1.05); font-weight: 700; }
        .best-odds { background: #fff8e7; font-weight: 700; }
        .expanded-row { background: #f8f9fa; }
        .expanded-row td { padding: 0 !important; }

        .form-boxes { display: flex; justify-content: center; }

        .form-box {
          display: inline-block;
          padding: 6px 8px;
          border: 1px solid #d0d0d0;
          border-right: none;
          font-size: 0.8rem;
          font-weight: 600;
          text-align: center;
          min-width: 38px;
        }

        .form-box:first-child { border-radius: 3px 0 0 3px; }
        .form-box:last-child { border-right: 1px solid #d0d0d0; border-radius: 0 3px 3px 0; }
        .form-box:only-child { border-radius: 3px; border-right: 1px solid #d0d0d0; }

        .form-box.finish-1 { background: #1e3a8a; color: white; }
        .form-box.finish-2-5 { background: #3b82f6; color: white; }
        .form-box.finish-6-10 { background: #60a5fa; color: white; }
        .form-box.finish-11-20 { background: #93c5fd; color: #1a1a1a; }
        .form-box.finish-21-30 { background: #bfdbfe; color: #1a1a1a; }
        .form-box.finish-31-50 { background: #dbeafe; color: #1a1a1a; }
        .form-box.finish-mc { background: #f3f4f6; color: #6b7280; }
        .form-box.finish-other { background: #f9fafb; color: #1a1a1a; }

        .desktop-expanded-view { display: block; }
        .mobile-panes-wrapper { display: none; }

        .expanded-content { padding: 25px; background: #f8f9fa; width: 100%; }

        .desktop-cards-grid { display: flex; gap: 8px; width: 100%; align-items: stretch; }

        .desktop-info-card, .desktop-odds-card {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 8px 6px;
          text-align: center;
          flex: 0 0 auto;
          width: 90px;
        }

        .desktop-odds-card-clickable {
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
        }

        .desktop-odds-card-clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-color: #1a1a1a; }
        .desktop-form-card { width: 280px; }

        .desktop-card-label { font-size: 0.65rem; color: #999; text-transform: uppercase; font-weight: 600; line-height: 1.1; }
        .desktop-card-sublabel { font-size: 0.6rem; color: #bbb; text-transform: uppercase; margin-top: 1px; margin-bottom: 4px; }
        .desktop-card-value { font-size: 1rem; font-weight: 700; color: #1a1a1a; margin-top: 6px; }
        .desktop-card-odds { font-size: 1.2rem; font-weight: 700; color: #1a1a1a; margin-top: 4px; }
        .desktop-form-card .form-boxes { margin-top: 10px; }

        .loading-state { text-align: center; padding: 60px 20px; color: #999; font-size: 1.1rem; }

        .site-footer { background: #f8f8f8; border-top: 1px solid #e5e5e5; padding: 40px 30px 30px; margin-top: 60px; }
        .footer-content { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 25px; }
        .footer-disclaimer { display: flex; flex-direction: column; gap: 15px; }
        .responsible-gambling { font-size: 0.95rem; color: #1a1a1a; line-height: 1.6; margin: 0; }
        .responsible-gambling strong { color: #d32f2f; font-weight: 700; }
        .responsible-gambling a { color: #1a1a1a; text-decoration: underline; font-weight: 600; }
        .affiliate-notice { font-size: 0.85rem; color: #666; line-height: 1.5; margin: 0; }

        .footer-links { display: flex; justify-content: center; flex-wrap: wrap; gap: 15px; }
        .footer-link { color: #1a1a1a; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
        .footer-link:hover { color: #666; text-decoration: underline; }
        .footer-separator { color: #ccc; }

        .footer-logos { display: flex; justify-content: center; align-items: center; gap: 15px; padding: 20px 0; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5; }
        .footer-logo-link { text-decoration: none; transition: opacity 0.2s; }
        .footer-logo-link:hover { opacity: 0.7; }
        .gamcare-text { font-size: 0.9rem; color: #1a1a1a; font-weight: 600; }
        .footer-copyright { text-align: center; }
        .footer-copyright p { font-size: 0.85rem; color: #999; margin: 0; }

        .footer-odds-format { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 30px; padding: 20px 0; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5; }
        .footer-settings-group { display: flex; align-items: center; gap: 10px; }
        .footer-odds-format label { font-size: 0.9rem; color: #666; font-weight: 500; }
        .footer-odds-dropdown { padding: 6px 12px; border: 1px solid #e5e5e5; border-radius: 6px; font-size: 0.9rem; background: white; cursor: pointer; }
        .footer-odds-dropdown:focus { outline: none; border-color: #1a1a1a; }

        @media (max-width: 768px) {
          header { padding: 10px 15px !important; }
          .header-content { display: flex !important; flex-direction: column !important; gap: 10px !important; }
          .tagline { display: none !important; }
          .header-left { display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; }
          .header-center { display: none !important; }
          .wordmark { height: 28px !important; width: auto !important; display: block !important; }
          .logo-mobile { height: 32px !important; width: auto !important; display: block !important; }
          .logo-desktop { display: none !important; }
          .tournament-tabs { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 4px; }
          .countdown-container { display: none; }
          .tournament-tab { padding: 6px 10px; font-size: 0.7rem; flex-shrink: 0; }
          .controls-bar { padding: 12px 20px; }
          .search-bar { max-width: 100%; }
          .footer-odds-format { flex-direction: column; gap: 15px; padding: 15px 0; }
          .footer-settings-group { flex-direction: column; gap: 8px; text-align: center; }
          .odds-matrix thead th:not(:first-child):not(.best-odds-header) { display: none; }
          .odds-matrix tbody td:not(:first-child):not(.best-odds-cell-mobile) { display: none; }
          .desktop-only { display: none !important; }
          .mobile-only { display: table-cell !important; }
          .odds-matrix thead th { position: relative; top: 0; }
          .odds-matrix thead th:first-child { min-width: auto; max-width: none; width: 70%; position: relative; left: 0; }
          .odds-matrix tbody td:first-child { min-width: auto; max-width: none; }
          .best-odds-header { display: table-cell !important; width: 30%; text-align: center; }
          .best-odds-cell-mobile { display: table-cell !important; font-size: 1.1rem; font-weight: 700; cursor: pointer; }
          .player-name { font-size: 0.95rem; }
          .odds-matrix { font-size: 0.85rem; min-width: 100%; }
          .expanded-content { padding: 0 !important; width: 100%; }
          .site-footer { padding: 30px 20px 20px; margin-top: 40px; }
          .footer-links { flex-direction: column; gap: 10px; }
          .footer-separator { display: none; }
          .desktop-expanded-view { display: none; }
          .expanded-cell { max-width: 100vw !important; width: 100vw !important; padding: 0 !important; }
          .expanded-row { display: block !important; }
          .mobile-panes-wrapper { display: block; width: 100vw; overflow: hidden; }
          .mobile-tabs-container { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .mobile-tabs-container::-webkit-scrollbar { display: none; }
          .mobile-tab-pane { flex: 0 0 100vw; width: 100vw; scroll-snap-align: start; padding: 20px; box-sizing: border-box; }
          .mobile-pane-title { font-size: 1rem; font-weight: 700; margin-bottom: 15px; text-align: center; }
          .mobile-bookmaker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mobile-bookmaker-card { background: white; border: 2px solid #e5e5e5; border-radius: 8px; padding: 12px; text-align: center; text-decoration: none; color: inherit; display: block; }
          .mobile-bookmaker-card:active { transform: scale(0.98); }
          .mobile-bookmaker-card.best { background: #fff8e7; border-color: #d4af37; border-width: 3px; }
          .mobile-bookmaker-name { font-size: 0.75rem; color: #666; margin-bottom: 6px; font-weight: 600; }
          .mobile-bookmaker-odds { font-size: 1.4rem; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
          .mobile-bookmaker-ew { font-size: 0.7rem; color: #999; }
          .mobile-extra-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mobile-extra-card { background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; text-align: center; text-decoration: none; color: inherit; }
          .mobile-extra-label { font-size: 0.7rem; color: #999; text-transform: uppercase; margin-bottom: 6px; font-weight: 700; }
          .mobile-extra-bookmaker { font-size: 0.7rem; color: #666; margin-bottom: 6px; }
          .mobile-extra-odds { font-size: 1.3rem; font-weight: 700; color: #1a1a1a; }
          .mobile-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mobile-stat-card { background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; text-align: center; }
          .mobile-stat-full-width { grid-column: 1 / -1; }
          .mobile-stat-label { font-size: 0.7rem; color: #999; text-transform: uppercase; margin-bottom: 8px; font-weight: 600; }
          .mobile-stat-value { font-size: 1rem; font-weight: 700; color: #1a1a1a; }
          .mobile-swipe-indicator { display: flex; justify-content: center; gap: 8px; padding: 12px; border-top: 1px solid #f0f0f0; }
          .swipe-dot { width: 8px; height: 8px; border-radius: 50%; background: #d0d0d0; transition: background 0.3s; }
          .swipe-dot.active { background: #666; }
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
            <div className="countdown-container">
              <span className="countdown-label">Countdown to The Masters:</span>
              <span className="countdown-time">
                {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
              </span>
            </div>
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
        <div className="demo-notice">\ud83d\udca1 Demo data - Live odds available during major tournaments</div>
      )}

      {!useMock && apiStatus.isLive && (
        <div className="live-notice">
          \ud83d\udd34 LIVE DATA \u2022 Last updated: {apiStatus.lastUpdated?.toLocaleTimeString() || 'Just now'}
        </div>
      )}

      {apiStatus.error && (
        <div className="error-notice">\u26a0\ufe0f {apiStatus.error}</div>
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
        {USE_LIVE_API && (
          <button className="refresh-button" onClick={handleForceRefresh} disabled={loading} title="Force refresh (uses 1 API credit)">
            \ud83d\udd04 {loading ? 'Refreshing...' : 'Refresh Odds'}
          </button>
        )}
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
                  {sortConfig.key === 'owgr' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' \u2191' : ' \u2193'}</span>}
                </th>
                <th className="tipster-header desktop-only" onClick={() => handleSort('tipsterPicks')} style={{ cursor: 'pointer' }} title="Tipster Consensus">
                  \ud83c\udfaf
                  {sortConfig.key === 'tipsterPicks' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' \u2191' : ' \u2193'}</span>}
                </th>
                {bookmakers.map((bookmaker, idx) => (
                  <th key={idx} style={{ width: '52px', minWidth: '52px', maxWidth: '52px' }}>
                    <div className="bookmaker-header">
                      <div className="bookmaker-logo-wrapper">
                        <img
                          src={`/logos/${BOOKMAKER_LOGOS[bookmaker.name] || bookmaker.name.toLowerCase().replace(/\s/g, '') + '.png'}`}
                          alt={bookmaker.name}
                          className="bookmaker-logo"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <span style={{ display: 'none', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '0.75rem', fontWeight: '600' }}>
                          {bookmaker.name}
                        </span>
                      </div>
                      <div className="each-way-terms">
                        <span className="ew-places">{bookmaker.eachWay?.places}</span>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="best-odds-header mobile-only">Best</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredOdds.map((player, idx) => {
                const playerOutrightOdds = bookmakers
                  .map(b => player.bookmakerOdds[b.name]?.outright)
                  .filter(o => typeof o === 'number');
                const bestOdds = playerOutrightOdds.length > 0 ? Math.max(...playerOutrightOdds) : null;

                // World ranking badge helper
                const rankBadgeClass = player.owgr
                  ? player.owgr <= 10 ? 'owgr-badge owgr-top10'
                  : player.owgr <= 50 ? 'owgr-badge owgr-top50'
                  : 'owgr-badge owgr-other'
                  : '';

                return (
                  <React.Fragment key={idx}>
                    <tr>
                      <td>
                        <div className="player-cell" onClick={() => togglePlayerExpand(player.name)}>
                          {expandedPlayer === player.name ? <ChevronUp className="expand-icon" size={16} /> : <ChevronDown className="expand-icon" size={16} />}
                          <span className="player-name">{player.name}</span>
                        </div>
                      </td>
                      <td className="owgr-cell desktop-only">
                        {player.owgr
                          ? <span className={rankBadgeClass}>#{player.owgr}</span>
                          : <span style={{ color: '#ccc' }}>-</span>
                        }
                      </td>
                      <td className="tipster-cell desktop-only">
                        {player.tipsterPicks && player.tipsterPicks.length > 0 ? (
                          <div
                            className="tipster-bar-container"
                            onClick={() => alert(`${player.tipsterPicks.length} tipsters picked ${player.name}:\
\
${player.tipsterPicks.join('\
')}`)}
                            title={`${player.tipsterPicks.length} tipsters selected this player`}
                          >
                            <div className="tipster-bar" style={{ width: `${Math.min((player.tipsterPicks.length / 8) * 100, 100)}%` }} />
                            <span className="tipster-count">{player.tipsterPicks.length}</span>
                          </div>
                        ) : (
                          <div className="tipster-empty">-</div>
                        )}
                      </td>
                      {bookmakers.map((bookmaker, bIdx) => {
                        const playerOdds = player.bookmakerOdds[bookmaker.name]?.outright;
                        const isBest = playerOdds === bestOdds && bestOdds !== null;
                        return (
                          <td key={bIdx} className={`odds-cell ${isBest ? 'best-odds' : ''}`}>
                            <a
                              href={affiliateLinks[bookmaker.name]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="odds-link"
                              onClick={() => {
                                if (window.gtag) window.gtag('event', 'bookmaker_click', { bookmaker: bookmaker.name, player: player.name, odds: playerOdds, tournament: selectedTournament.name });
                              }}
                            >
                              {formatOdds(playerOdds)}
                            </a>
                          </td>
                        );
                      })}
                      <td className="odds-cell best-odds-cell-mobile" onClick={() => togglePlayerExpand(player.name)}>
                        {formatOdds(bestOdds)}
                      </td>
                    </tr>
                    {expandedPlayer === player.name && (
                      <tr className="expanded-row">
                        <td colSpan={bookmakers.length + 4} className="expanded-cell">
                          <div className="expanded-content">
                            <div className="desktop-expanded-view">
                              <div className="desktop-cards-grid">
                                <div className="desktop-info-card">
                                  <div className="desktop-card-label">Nationality</div>
                                  <div className="desktop-card-value">{player.nationality}</div>
                                </div>
                                <div className="desktop-info-card">
                                  <div className="desktop-card-label">World</div>
                                  <div className="desktop-card-label">Ranking</div>
                                  <div className="desktop-card-value">
                                    {player.owgr
                                      ? <span className={rankBadgeClass}>#{player.owgr}</span>
                                      : 'N/A'
                                    }
                                  </div>
                                </div>
                                {player.recentForm?.length > 0 && (
                                  <div className="desktop-info-card desktop-form-card">
                                    <div className="desktop-card-label">Recent Form</div>
                                    <div className="form-boxes">
                                      {player.recentForm.map((pos, i) => (
                                        <span key={i} className={`form-box ${getFinishClass(pos)}`}>
                                          {typeof pos === 'number' ? pos : pos.replace('T', '')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {player.courseHistory && (
                                  <div className="desktop-info-card desktop-form-card">
                                    <div className="desktop-card-label">Course History</div>
                                    <div className="form-boxes">
                                      {player.courseHistory.split('-').map((pos, i) => (
                                        <span key={i} className={`form-box ${getFinishClass(pos)}`}>
                                          {pos.replace('T', '')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {['top5', 'top10', 'top20', 'top30', 'top40', 'r1Leader'].map(market => {
                                  const labels = { top5: 'Top 5', top10: 'Top 10', top20: 'Top 20', top30: 'Top 30', top40: 'Top 40', r1Leader: 'R1 Leader' };
                                  const allMarketOdds = bookmakers.map(b => ({
                                    name: b.name,
                                    odds: player.bookmakerOdds[b.name]?.[market],
                                    url: affiliateLinks[b.name]
                                  })).filter(o => o.odds && o.odds !== 'N/A');
                                  const best = allMarketOdds.length > 0
                                    ? allMarketOdds.reduce((max, curr) => curr.odds > max.odds ? curr : max, allMarketOdds[0])
                                    : null;
                                  return best ? (
                                    <a key={market} href={best.url} target="_blank" rel="noopener noreferrer"
                                      className="desktop-odds-card desktop-odds-card-clickable"
                                      onClick={() => { if (window.gtag) window.gtag('event', 'bookmaker_click', { bookmaker: best.name, player: player.name, market: labels[market], odds: best.odds, source: 'desktop_extra' }); }}>
                                      <div className="desktop-card-label">{labels[market]}</div>
                                      <div className="desktop-card-sublabel">Best</div>
                                      <div className="desktop-card-odds">{formatOdds(best.odds)}</div>
                                    </a>
                                  ) : (
                                    <div key={market} className="desktop-odds-card">
                                      <div className="desktop-card-label">{labels[market]}</div>
                                      <div className="desktop-card-sublabel">Best</div>
                                      <div className="desktop-card-odds">N/A</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mobile-panes-wrapper">
                              <div className="mobile-tabs-container"
                                onScroll={(e) => {
                                  const scrollLeft = e.target.scrollLeft;
                                  const paneWidth = e.target.offsetWidth;
                                  setActiveMobilePane(Math.round(scrollLeft / paneWidth));
                                }}>
                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Outright Winner Odds</h3>
                                  <div className="mobile-bookmaker-grid">
                                    {bookmakers.map((bookmaker, i) => {
                                      const mobileOdds = player.bookmakerOdds[bookmaker.name]?.outright;
                                      const isBest = mobileOdds === bestOdds;
                                      return (
                                        <a key={i} href={affiliateLinks[bookmaker.name]} target="_blank" rel="noopener noreferrer"
                                          className={`mobile-bookmaker-card ${isBest ? 'best' : ''}`}
                                          onClick={() => { if (window.gtag) window.gtag('event', 'bookmaker_click', { bookmaker: bookmaker.name, player: player.name, odds: mobileOdds, source: 'mobile_outright' }); }}>
                                          <div className="mobile-bookmaker-name">{bookmaker.name}</div>
                                          <div className="mobile-bookmaker-odds">{formatOdds(mobileOdds)}</div>
                                          <div className="mobile-bookmaker-ew">{bookmaker.eachWay?.places} places</div>
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Extra Odds</h3>
                                  <div className="mobile-extra-grid">
                                    {['top5', 'top10', 'top20', 'top30', 'top40', 'makeCut'].map((market, mIdx) => {
                                      const labels = { top5: 'Top 5', top10: 'Top 10', top20: 'Top 20', top30: 'Top 30', top40: 'Top 40', makeCut: 'Make Cut' };
                                      const allOdds = bookmakers.map(b => ({
                                        name: b.name,
                                        odds: player.bookmakerOdds[b.name]?.[market] || (market === 'makeCut' ? 1.2 : null),
                                        url: affiliateLinks[b.name]
                                      })).filter(o => o.odds && o.odds !== 'N/A');
                                      const best = allOdds.length > 0 ? allOdds.reduce((max, curr) => curr.odds > max.odds ? curr : max, allOdds[0]) : null;
                                      return best ? (
                                        <a key={mIdx} href={best.url} target="_blank" rel="noopener noreferrer" className="mobile-extra-card"
                                          onClick={() => { if (window.gtag) window.gtag('event', 'bookmaker_click', { bookmaker: best.name, player: player.name, market: labels[market], odds: best.odds, source: 'mobile_extra' }); }}>
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
                                    <div className="mobile-stat-card">
                                      <div className="mobile-stat-label">Nationality</div>
                                      <div className="mobile-stat-value">{player.nationality}</div>
                                    </div>
                                    <div className="mobile-stat-card">
                                      <div className="mobile-stat-label">World Ranking</div>
                                      <div className="mobile-stat-value">
                                        {player.owgr
                                          ? <span className={rankBadgeClass}>#{player.owgr}</span>
                                          : 'N/A'
                                        }
                                      </div>
                                    </div>
                                    {player.recentForm?.length > 0 && (
                                      <div className="mobile-stat-card mobile-stat-full-width">
                                        <div className="mobile-stat-label">Recent Form</div>
                                        <div className="form-boxes">
                                          {player.recentForm.map((pos, i) => (
                                            <span key={i} className={`form-box ${getFinishClass(pos)}`}>
                                              {typeof pos === 'number' ? pos : pos.replace('T', '')}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {player.courseHistory && (
                                      <div className="mobile-stat-card mobile-stat-full-width">
                                        <div className="mobile-stat-label">Course History</div>
                                        <div className="form-boxes">
                                          {player.courseHistory.split('-').map((pos, i) => (
                                            <span key={i} className={`form-box ${getFinishClass(pos)}`}>
                                              {pos.replace('T', '')}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mobile-swipe-indicator">
                                <span className={`swipe-dot ${activeMobilePane === 0 ? 'active' : ''}`}></span>
                                <span className={`swipe-dot ${activeMobilePane === 1 ? 'active' : ''}`}></span>
                                <span className={`swipe-dot ${activeMobilePane === 2 ? 'active' : ''}`}></span>
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
      )}

      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-disclaimer">
            <p className="responsible-gambling">
              <strong>18+ Only.</strong> Please gamble responsibly. If you need help, visit{' '}
              <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">BeGambleAware.org</a>
              {' '}or call the National Gambling Helpline on 0808 8020 133.
            </p>
            <p className="affiliate-notice">
              The Fairway is an independent odds comparison service. We only feature bookmakers licensed by the UK Gambling Commission (UKGC).
              We may earn commission from bookmaker links. All odds are subject to change. Please check bookmaker sites for current terms and conditions. 18+ only.
            </p>
          </div>

          <div className="footer-odds-format">
            <div className="footer-settings-group">
              <label htmlFor="odds-format-footer">Odds Format:</label>
              <select id="odds-format-footer" value={oddsFormat}
                onChange={(e) => { setOddsFormat(e.target.value); localStorage.setItem('oddsFormat', e.target.value); }}
                className="footer-odds-dropdown">
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
            <p>\u00a9 2025 The Fairway. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GolfOddsComparison;
