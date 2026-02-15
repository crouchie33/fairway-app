import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import logoImg from './logo.png';
import wordmarkImg from './wordmark.png';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const USE_LIVE_API = false;
const ODDS_API_KEY = 'f68c6ebed30010a80949e68b3e57c825';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const ODDS_CACHE_KEY = 'fairway_odds';
const ODDS_CACHE_MS = 60 * 60 * 1000; // 1 hour

// DataGolf rankings via your Google Apps Script web app
const RANKINGS_URL =
  'https://script.google.com/macros/s/AKfycbz0AV6lo8WSGm1qFLfKVKW8zbg2NrLaYGd82e20vPvrPFmQqsMUK6sIA0sc5fApVUUx/exec';
const RANKINGS_CACHE_KEY = 'fairway_rankings';
const RANKINGS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── STATIC DATA ─────────────────────────────────────────────────────────────

const MAJORS = [
  { id: 'masters',  name: 'The Masters',      sportKey: 'golf_masters_tournament_winner' },
  { id: 'pga',      name: 'PGA Championship', sportKey: 'golf_pga_championship_winner' },
  { id: 'usopen',   name: 'US Open',          sportKey: 'golf_us_open_winner' },
  { id: 'open',     name: 'The Open',         sportKey: 'golf_the_open_championship_winner' },
];

const BOOKMAKERS = [
  { name: 'Bet365',            key: 'bet365',       logo: 'bet365.png',      ew: '5' },
  { name: 'William Hill',      key: 'williamhill',  logo: 'williamhill.png', ew: '5' },
  { name: 'Betway',            key: 'betway',       logo: 'betway.png',      ew: '6' },
  { name: 'Coral',             key: 'coral',        logo: 'coral.png',       ew: '5' },
  { name: 'Ladbrokes',         key: 'ladbrokes',    logo: 'ladbrokes.png',   ew: '5' },
  { name: 'Paddy Power',       key: 'paddypower',   logo: 'paddypower.png',  ew: '6' },
  { name: 'Sky Bet',           key: 'skybet',       logo: 'skybet.png',      ew: '5' },
  { name: 'Betfair Sportsbook',key: 'betfair',      logo: 'betfair.png',     ew: '5' },
  { name: 'BoyleSports',       key: 'boylesports',  logo: 'boylesports.png', ew: '5' },
  { name: '888sport',          key: '888sport',     logo: '888sport.png',    ew: '5' },
];

const AFFILIATE_LINKS = {
  'Bet365':             'https://www.bet365.com/olp/golf?affiliate=YOUR_BET365_ID',
  'William Hill':       'https://www.williamhill.com/golf?AffiliateID=YOUR_WH_ID',
  'Betway':             'https://sports.betway.com/golf?btag=YOUR_BETWAY_ID',
  'Coral':              'https://www.coral.co.uk/sports/golf?cid=YOUR_CORAL_ID',
  'Ladbrokes':          'https://sports.ladbrokes.com/golf?affiliate=YOUR_LADBROKES_ID',
  'Paddy Power':        'https://www.paddypower.com/golf?AFF_ID=YOUR_PP_ID',
  'Sky Bet':            'https://www.skybet.com/golf?aff=YOUR_SKYBET_ID',
  'Betfair Sportsbook': 'https://www.betfair.com/sport/golf?pid=YOUR_BETFAIR_ID',
  'BoyleSports':        'https://www.boylesports.com/golf?aff=YOUR_BOYLE_ID',
  '888sport':           'https://www.888sport.com/golf?affiliate=YOUR_888_ID',
};

// Polymarket odds loaded dynamically from Google Sheet
// Fallback hardcoded values used until sheet loads
const POLYMARKET_FALLBACK = {
  "Scottie Scheffler": 4.3,
  "Rory McIlroy": 11.1,
  "Bryson DeChambeau": 16.7,
  "Min Woo Lee": 18.9,
  "Tommy Fleetwood": 17.2,
  "Ludvig Aberg": 16.7,
  "Jon Rahm": 18.5,
  "Xander Schauffele": 19.2,
  "Viktor Hovland": 28.6,
  "Collin Morikawa": 40.0,
  "Hideki Matsuyama": 41.7,
  "Jordan Spieth": 52.6,
  "Patrick Cantlay": 50.0,
  "Justin Thomas": 62.5,
  "Tyrrell Hatton": 52.6,
  "Brooks Koepka": 66.7,
  "Max Homa": 100.0,
  "Cameron Smith": 166.7,
  "Sahith Theegala": 125.0,
  "Shane Lowry": 125.0,
  "Tony Finau": 125.0,
};
const POLYMARKET_URL = "https://polymarket.com/event/the-masters-winner?slug=the-masters-winner";
const POLYMARKET_SHEET_URL = "https://script.google.com/macros/s/AKfycbwRfYkS4bBA3uI-BKshmbIBTCSrwAK10-VncZ6D5Rjn9kWXOKX50Q3MtYQhJjRqP9s7/exec";
const POLYMARKET_CACHE_KEY = 'fairway_polymarket';
const POLYMARKET_CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

const MAJORS_FORM_URL = "https://script.google.com/macros/s/AKfycbwjUK-2zF8GYa8eFevPCWTdUJOeCRA-J5TCXdneuF8b22y2RQexnJL76uxqWr3wBCFw/exec";
const MAJORS_FORM_CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const MOCK_PLAYERS = [
  { name: 'Scottie Scheffler', nationality: 'USA', owgr: 1,  recentForm: [1,2,1,3,1,2,1], courseHistory: 'T2-1-T5-4-2-T3-1',         tipsterPicks: ['GolfAnalyst','BettingExpert','ProGolfTips','OddsSharks','GreenJacket','TheMastersGuru','BirdiePicksGolf','FairwayFinder'] },
  { name: 'Rory McIlroy',      nationality: 'NIR', owgr: 2,  recentForm: [3,1,5,2,4,3,2], courseHistory: 'T5-T7-2-T8-3-T6-4',         tipsterPicks: ['GolfAnalyst','ProGolfTips','GreenJacket','BirdiePicksGolf','FairwayFinder','SwingTipster'] },
  { name: 'Jon Rahm',          nationality: 'ESP', owgr: 3,  recentForm: [2,4,1,1,6,3,2], courseHistory: '1-T3-T4-2-1-T5-3',           tipsterPicks: ['BettingExpert','OddsSharks','TheMastersGuru','SwingTipster','GolfWisdom'] },
  { name: 'Viktor Hovland',    nationality: 'NOR', owgr: 4,  recentForm: [5,3,2,4,3,5,4], courseHistory: 'T12-T8-T15-T10-T9-T11-T13',  tipsterPicks: ['ProGolfTips','BirdiePicksGolf','GolfWisdom'] },
  { name: 'Brooks Koepka',     nationality: 'USA', owgr: 5,  recentForm: [4,6,3,5,2,4,3], courseHistory: 'T2-1-T4-3-T2-2-1',           tipsterPicks: ['OddsSharks','TheMastersGuru','FairwayFinder','SwingTipster'] },
  { name: 'Xander Schauffele', nationality: 'USA', owgr: 6,  recentForm: [6,2,4,3,5,6,4], courseHistory: 'T3-T5-T9-T7-T4-T6-T8',       tipsterPicks: ['GolfAnalyst','GreenJacket','GolfWisdom'] },
  { name: 'Collin Morikawa',   nationality: 'USA', owgr: 7,  recentForm: [7,5,6,8,4,7,5], courseHistory: 'T18-T12-T20-T15-T11-T14-T16', tipsterPicks: ['BettingExpert','BirdiePicksGolf'] },
  { name: 'Patrick Cantlay',   nationality: 'USA', owgr: 8,  recentForm: [8,4,7,6,7,8,6], courseHistory: 'T9-T14-T11-T10-T12-T13-T11',  tipsterPicks: ['ProGolfTips','SwingTipster'] },
  { name: 'Tommy Fleetwood',   nationality: 'ENG', owgr: 9,  recentForm: [10,8,9,7,9,10,8],courseHistory: 'T17-T22-T15-T19-T18-T20-T16', tipsterPicks: ['TheMastersGuru'] },
  { name: 'Jordan Spieth',     nationality: 'USA', owgr: 10, recentForm: [9,11,8,10,8,9,10],courseHistory: '1-T2-MC-T8-T10-MC-T15',      tipsterPicks: ['OddsSharks','FairwayFinder','GolfWisdom'] },
  { name: 'Hideki Matsuyama',  nationality: 'JPN', owgr: 11, recentForm: [13,14,13,11,15,14,13],courseHistory: '1-T11-T18-T15-T12-T16-T14',tipsterPicks: ['BettingExpert','TheMastersGuru'] },
  { name: 'Max Homa',          nationality: 'USA', owgr: 12, recentForm: [11,9,10,12,11,11,9],courseHistory: 'T24-T19-T28-T22-T25-T21-T23',tipsterPicks: ['BirdiePicksGolf'] },
  { name: 'Ludvig Aberg',      nationality: 'SWE', owgr: 13, recentForm: [2,5,3,7,6,4,5], courseHistory: 'T8-6-10-7-9-8',               tipsterPicks: ['GolfAnalyst','BettingExpert','OddsSharks','GreenJacket','BirdiePicksGolf'] },
  { name: 'Cameron Smith',     nationality: 'AUS', owgr: 14, recentForm: [12,13,11,9,13,12,11],courseHistory: 'T3-T5-T12-T8-T6-T9-T7',   tipsterPicks: ['GreenJacket','SwingTipster'] },
  { name: 'Justin Thomas',     nationality: 'USA', owgr: 15, recentForm: [14,10,12,14,10,13,12],courseHistory: 'T8-T16-T7-T12-T10-T14-T9',tipsterPicks: ['GolfAnalyst'] },
  { name: 'Tony Finau',        nationality: 'USA', owgr: 16, recentForm: [15,12,14,13,12,15,14],courseHistory: 'T5-T10-T21-T18-T15-T19-T17',tipsterPicks: [] },
  { name: 'Shane Lowry',       nationality: 'IRL', owgr: 18, recentForm: [16,15,17,18,14,16,15],courseHistory: 'T12-T25-MC-T20-T22-MC-T18',tipsterPicks: ['ProGolfTips'] },
  { name: 'Tyrrell Hatton',    nationality: 'ENG', owgr: 20, recentForm: [18,17,15,16,19,18,17],courseHistory: 'T15-T18-T23-T21-T19-T22-T20',tipsterPicks: [] },
  { name: 'Min Woo Lee',       nationality: 'AUS', owgr: 35, recentForm: [19,20,18,17,16,19,18],courseHistory: 'MC-T35-T42-T38-T40-MC-T36',tipsterPicks: [] },
  { name: 'Sahith Theegala',   nationality: 'USA', owgr: 25, recentForm: [20,16,19,20,18,20,19],courseHistory: 'T19-MC-T31-T28-T25-MC-T29',tipsterPicks: [] },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const norm = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function lookupRank(map, playerName) {
  if (!map || !playerName) return null;
  const n = norm(playerName);
  if (map[n] !== undefined) return map[n];
  // last-name fallback
  const last = n.split(' ').slice(-1)[0];
  const hit = Object.keys(map).find((k) => k.endsWith(last));
  return hit ? map[hit] : null;
}

function getOddsCache() {
  try {
    const raw = localStorage.getItem(ODDS_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (Date.now() - c.ts > ODDS_CACHE_MS || !c.tournament) return null;
    return c;
  } catch { return null; }
}

function setOddsCache(tournament, data) {
  try {
    localStorage.setItem(ODDS_CACHE_KEY, JSON.stringify({ tournament, data, ts: Date.now() }));
  } catch {}
}

function getRankingsCache() {
  try {
    const raw = localStorage.getItem(RANKINGS_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (Date.now() - c.ts > RANKINGS_CACHE_MS) return null;
    return c.map;
  } catch { return null; }
}

function setRankingsCache(map) {
  try {
    localStorage.setItem(RANKINGS_CACHE_KEY, JSON.stringify({ map, ts: Date.now() }));
  } catch {}
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function GolfOddsComparison() {

  // ── state ──
  const [players, setPlayers]               = useState([]);
  const [bookmakers, setBookmakers]         = useState(BOOKMAKERS);
  const [rankingsMap, setRankingsMap]       = useState({});
  const [rankingsCount, setRankingsCount]   = useState(0);
  const [loading, setLoading]               = useState(false);
  const [useMock, setUseMock]               = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(MAJORS[0]);
  const [sortConfig, setSortConfig]         = useState({ key: 'avgOdds', direction: 'asc' });
  const [filterText, setFilterText]         = useState('');
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [oddsFormat, setOddsFormat]         = useState('fractional');
  const [activeMobilePane, setActiveMobilePane] = useState(0);
  const [countdown, setCountdown]           = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [menuOpen, setMenuOpen]             = useState(false);

  const fetchingRef = useRef(false);
  const [polyOddsMap, setPolyOddsMap] = useState(POLYMARKET_FALLBACK);
  const [majorFormMap, setMajorFormMap] = useState({});
  const [promoIndex, setPromoIndex] = useState(0);

  const PROMO_ITEMS = [
    {
      label: 'Book',
      labelClass: 'book',
      text: "The Trader's Guide to Golf Betting — available on Amazon",
      url: 'https://www.amazon.co.uk/traders-guide-Golf-Betting-Everything-ebook/dp/B0C9XF1VKH',
    },
    {
      label: 'New',
      labelClass: '',
      text: 'Masters 2026 — best odds comparison updated daily',
      url: '#',
    },
    {
      label: 'New',
      labelClass: '',
      text: 'Outsiders to back now - 8 weeks out from The Masters',
      url: '/blog/masters-2026-outsiders',
    },
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % PROMO_ITEMS.length);
    }, 4000);
    return () => clearInterval(id);
  // eslint-disable-line
  }, []);

  // ── load saved odds format ──
  useEffect(() => {
    const saved = localStorage.getItem('oddsFormat');
    if (saved) setOddsFormat(saved);
  }, []);

  // ── countdown ──
  useEffect(() => {
    const target = new Date('2026-04-09T08:00:00-04:00');
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) return;
      setCountdown({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000)  / 60000),
        seconds: Math.floor((diff % 60000)    / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── fetch DataGolf rankings from Apps Script ──
  useEffect(() => {
    const cached = getRankingsCache();
    if (cached) {
      setRankingsMap(cached);
      setRankingsCount(Object.keys(cached).length);
      return;
    }
    fetch(RANKINGS_URL)
      .then((r) => r.json())
      .then((json) => {
        const raw = json.rankings || {};
        // normalise keys
        const map = {};
        Object.entries(raw).forEach(([name, rank]) => {
          map[norm(name)] = Number(rank);
        });
        setRankingsMap(map);
        setRankingsCount(Object.keys(map).length);
        setRankingsCache(map);
      })
      .catch((err) => console.warn('Rankings unavailable:', err.message));
  }, []);

  // ── apply rankings whenever rankingsMap or players change ──
  useEffect(() => {
    if (Object.keys(rankingsMap).length === 0 || players.length === 0) return;
    setPlayers((prev) =>
      prev.map((p) => {
        const rank = lookupRank(rankingsMap, p.name);
        return rank !== null ? { ...p, owgr: rank } : p;
      })
    );
  }, [rankingsMap]); // eslint-disable-line

  // fetch Polymarket odds from Google Sheet — 6hr cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(POLYMARKET_CACHE_KEY);
      if (cached) {
        const c = JSON.parse(cached);
        if (Date.now() - c.ts < POLYMARKET_CACHE_MS) {
          setPolyOddsMap(c.data);
          return;
        }
      }
    } catch {}
    fetch(POLYMARKET_SHEET_URL)
      .then((r) => r.json())
      .then((json) => {
        if (json.odds && Object.keys(json.odds).length > 0) {
          setPolyOddsMap(json.odds);
          try {
            localStorage.setItem(POLYMARKET_CACHE_KEY, JSON.stringify({ data: json.odds, ts: Date.now() }));
          } catch {}
        }
      })
      .catch((err) => console.warn('Polymarket sheet unavailable:', err.message));
  }, []);

  // fetch major event form when tournament tab changes
  useEffect(() => {
    // Map app tournament names to sheet tab names
    const nameMap = {
      'The Masters': 'Masters',
      'PGA Championship': 'PGA Championship',
      'US Open': 'US Open',
      'The Open': 'The Open',
    };
    const majorName = nameMap[selectedTournament.name] || selectedTournament.name;
    const cacheKey = 'fairway_form_' + majorName.replace(/\s/g, '_');
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const c = JSON.parse(cached);
        if (Date.now() - c.ts < MAJORS_FORM_CACHE_MS) {
          setMajorFormMap(c.data);
          return;
        }
      }
    } catch {}
    fetch(MAJORS_FORM_URL + '?major=' + encodeURIComponent(majorName))
      .then((r) => r.json())
      .then((json) => {
        if (json.form && Object.keys(json.form).length > 0) {
          setMajorFormMap(json.form);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ data: json.form, ts: Date.now() }));
          } catch {}
        }
      })
      .catch((err) => console.warn('Majors form unavailable:', err.message));
  }, [selectedTournament]); // eslint-disable-line

  // ── build mock data ──
  const loadMock = useCallback(() => {
    setUseMock(true);
    const result = MOCK_PLAYERS.map((p) => {
      const base = 5 + Math.random() * 45;
      const bOdds = {};
      BOOKMAKERS.forEach((b) => {
        const v = +(base + (Math.random() - 0.5) * 3).toFixed(1);
        bOdds[b.name] = {
          outright: v,
          top5:  +(v * 0.25).toFixed(1),
          top10: +(v * 0.15).toFixed(1),
          top20: +(v * 0.08).toFixed(1),
          top30: +(v * 0.06).toFixed(1),
          top40: +(v * 0.05).toFixed(1),
          r1Leader: +(v * 0.4).toFixed(1),
        };
      });
      const vals = BOOKMAKERS.map((b) => bOdds[b.name].outright);
      const avgOdds = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { ...p, bookmakerOdds: bOdds, avgOdds };
    });
    setPlayers(result);
    setBookmakers(BOOKMAKERS);
  }, []);

  // ── build live data from Odds API response ──
  const processLive = useCallback((apiData) => {
    const bmMap = new Map();
    const pmMap = new Map();
    apiData.forEach((event) => {
      event.bookmakers?.forEach((bm) => {
        if (bm.key === 'betfair_ex') return;
        const name = bm.key === 'betfair' ? 'Betfair Sportsbook' : (bm.title || bm.key);
        if (!bmMap.has(name)) {
          const known = BOOKMAKERS.find((b) => b.key === bm.key || b.name === name);
          bmMap.set(name, known || { name, key: bm.key, logo: '', ew: '5' });
        }
        bm.markets?.forEach((mkt) => {
          if (mkt.key !== 'outrights') return;
          mkt.outcomes?.forEach((o) => {
            if (!pmMap.has(o.name)) {
              pmMap.set(o.name, {
                name: o.name, nationality: 'TBD', owgr: null,
                recentForm: [], courseHistory: '', tipsterPicks: [],
                bookmakerOdds: {},
              });
            }
            pmMap.get(o.name).bookmakerOdds[name] = {
              outright: o.price,
              top5: 'N/A', top10: 'N/A', top20: 'N/A',
              top30: 'N/A', top40: 'N/A', r1Leader: 'N/A',
            };
          });
        });
      });
    });
    const result = Array.from(pmMap.values()).map((p) => {
      const vals = Object.values(p.bookmakerOdds).map((o) => o.outright).filter(Number.isFinite);
      return { ...p, avgOdds: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 999 };
    });
    // fill in any missing bookmaker columns
    const liveKeys = new Set(Array.from(bmMap.keys()));
    const merged = [
      ...Array.from(bmMap.values()),
      ...BOOKMAKERS.filter((b) => !liveKeys.has(b.name)),
    ];
    setPlayers(result);
    setBookmakers(merged);
    setUseMock(false);
  }, []);

  // ── load tournament data ──
  useEffect(() => {
    if (fetchingRef.current) return;
    if (!USE_LIVE_API) { loadMock(); return; }

    const cached = getOddsCache();
    if (cached && cached.tournament === selectedTournament.id) {
      processLive(cached.data);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);

    const url = `${ODDS_API_BASE}/sports/${selectedTournament.sportKey}/odds/?`
      + `apiKey=${ODDS_API_KEY}&regions=uk&markets=outrights&oddsFormat=decimal`;

    fetch(url, { signal: AbortSignal.timeout(15000) })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (!data?.length) { loadMock(); return; }
        setOddsCache(selectedTournament.id, data);
        processLive(data);
      })
      .catch(() => loadMock())
      .finally(() => { setLoading(false); fetchingRef.current = false; });
  }, [selectedTournament, loadMock, processLive]);

  // ── format odds ──
  const formatOdds = useCallback((val) => {
    if (!val || val === 'N/A') return '-';
    const n = typeof val === 'string' ? parseFloat(val) : val;
    if (!Number.isFinite(n)) return '-';
    if (oddsFormat === 'american') {
      return n >= 2 ? `+${Math.round((n - 1) * 100)}` : `${Math.round(-100 / (n - 1))}`;
    }
    if (oddsFormat === 'fractional') {
      const d = n - 1;
      const table = {
        0.5:'1/2',0.33:'1/3',0.67:'2/3',0.25:'1/4',0.75:'3/4',
        0.2:'1/5',0.4:'2/5',0.6:'3/5',0.8:'4/5',1:'1/1',
        1.5:'3/2',2:'2/1',2.5:'5/2',3:'3/1',3.5:'7/2',4:'4/1',
        5:'5/1',6:'6/1',7:'7/1',8:'8/1',9:'9/1',10:'10/1',
        11:'11/1',12:'12/1',14:'14/1',16:'16/1',20:'20/1',
        25:'25/1',33:'33/1',50:'50/1',66:'66/1',100:'100/1',
      };
      const r = Math.round(d * 100) / 100;
      if (table[r]) return table[r];
      let num = Math.round(d * 100), den = 100;
      const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
      const g = gcd(num, den);
      return `${num / g}/${den / g}`;
    }
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }, [oddsFormat]);

  const getFinishClass = (pos) => {
    if (['MC','WD','DQ'].includes(String(pos))) return 'finish-mc';
    const n = parseInt(String(pos).replace(/\D/g, ''), 10);
    if (isNaN(n)) return 'finish-other';
    if (n === 1)  return 'finish-1';
    if (n <= 5)   return 'finish-2-5';
    if (n <= 10)  return 'finish-6-10';
    if (n <= 20)  return 'finish-11-20';
    if (n <= 30)  return 'finish-21-30';
    if (n <= 50)  return 'finish-31-50';
    return 'finish-other';
  };

  // ── sort + filter ──
  const sorted = useMemo(() => {
    const filtered = players.filter((p) =>
      p.name.toLowerCase().includes(filterText.toLowerCase())
    );
    return filtered.sort((a, b) => {
      let av, bv;
      if (sortConfig.key === 'name') {
        av = a.name.split(' ').slice(-1)[0];
        bv = b.name.split(' ').slice(-1)[0];
      } else if (sortConfig.key === 'owgr') {
        av = a.owgr ?? 9999; bv = b.owgr ?? 9999;
      } else if (sortConfig.key === 'tipsterPicks') {
        av = a.tipsterPicks?.length ?? 0; bv = b.tipsterPicks?.length ?? 0;
      } else if (sortConfig.key === 'polyOdds') {
        const findPoly = (p) => { const k = Object.keys(polyOddsMap).find(k => norm(k) === norm(p.name)); return k ? polyOddsMap[k] : 9999; };
        av = findPoly(a); bv = findPoly(b);
      } else {
        av = a[sortConfig.key] ?? 0; bv = b[sortConfig.key] ?? 0;
      }
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ?  1 : -1;
      return 0;
    });
  }, [players, sortConfig, filterText]);

  const handleSort = (key) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));

  const SortBtn = ({ sortKey, label, className = '' }) => (
    <span onClick={() => handleSort(sortKey)} className={`sortable-header ${className}`}>
      {label}
      {sortConfig.key === sortKey && (
        <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
      )}
    </span>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; letter-spacing: -0.01em; background: #F5F7FA; color: #2D3748; overflow-x: hidden; }

        .app-container { max-width: 1600px; margin: 0 auto; }

        /* ── HEADER ── */
        header { background: #F5F7FA; border-bottom: 1px solid #CBD5E0; padding: 20px 30px; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative; }
        .header-content { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 20px; }
        .header-left  { justify-self: start; }
        .header-center{ justify-self: center; }
        .header-right { display: flex; flex-direction: column; align-items: flex-end; }
        .tagline { font-size: 1.7rem; color: #718096; font-weight: 500; padding-top: 8px; }
        .wordmark { width: 100mm; height: auto; }
        .logo-center { height: 90px; width: auto; }
        .logo-mobile { display: none; }
        .logo-desktop{ display: block; }

        /* ── NAV MENU ── */
        .nav-menu-btn { background: none; border: none; cursor: pointer; padding: 6px; display: flex; flex-direction: column; gap: 5px; align-items: center; justify-content: center; position: absolute; right: 30px; top: 50%; transform: translateY(-50%); z-index: 200; }
        .nav-menu-btn span { display: block; width: 22px; height: 2px; background: #2D3748; border-radius: 2px; transition: all 0.2s; }
        .nav-menu-btn.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .nav-menu-btn.open span:nth-child(2) { opacity: 0; }
        .nav-menu-btn.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        .nav-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 150; }
        .nav-overlay.open { display: block; }

        .nav-drawer {
          position: fixed; top: 0; right: -280px; width: 280px; height: 100vh;
          background: white; z-index: 160; transition: right 0.25s ease;
          box-shadow: -4px 0 20px rgba(0,0,0,0.12);
          display: flex; flex-direction: column;
        }
        .nav-drawer.open { right: 0; }
        .nav-drawer-header { padding: 20px 24px; border-bottom: 1px solid #CBD5E0; font-weight: 700; font-size: 1rem; color: #2D3748; }
        .nav-drawer-links { display: flex; flex-direction: column; padding: 12px 0; flex: 1; }
        .nav-drawer-link { padding: 14px 24px; font-size: 1rem; color: #2D3748; text-decoration: none; font-weight: 500; border-bottom: 1px solid #F5F7FA; transition: background 0.1s; }
        .nav-drawer-link:hover { background: #F5F7FA; }
        .nav-drawer-link.active { color: #2D3748; font-weight: 700; }
        .nav-drawer-section { padding: 10px 24px 4px; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #718096; font-weight: 600; margin-top: 8px; }
        .nav-drawer-footer { padding: 16px 24px; border-top: 1px solid #CBD5E0; font-size: 0.78rem; color: #718096; }

        /* ── TOURNAMENT TABS ── */
        .tournament-tabs { display: flex; gap: 8px; margin-top: 8px; }
        .tournament-tab { padding: 8px 16px; background: #F5F7FA; border: 1px solid #CBD5E0; border-radius: 6px; font-size: 0.85rem; font-weight: 500; color: #718096; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .tournament-tab:hover { color: #2D3748; border-color: #2D3748; }
        .tournament-tab.active { background: #2D3748; color: white; border-color: #2D3748; font-weight: 600; }

        /* ── COUNTDOWN ── */
        .countdown-container { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 0.85rem; }
        .countdown-label { color: #718096; font-weight: 500; }
        .countdown-time  { font-weight: 700; font-family: 'Courier New', monospace; }

        /* ── PROMO BANNER ── */
        .promo-banner {
          flex: 1;
          overflow: hidden;
          position: relative;
          height: 36px;
          border-radius: 6px;
          border: 1px solid #CBD5E0;
          background: #F5F7FA;
        }
        .promo-track {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .promo-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          height: 36px;
          white-space: nowrap;
          text-decoration: none;
          color: #2D3748;
          font-size: 0.85rem;
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
          pointer-events: none;
        }
        .promo-card.promo-active {
          opacity: 1;
          pointer-events: auto;
        }
        .promo-card:hover { background: #F5F7FA; }
        .promo-card-label {
          background: #2D3748;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .promo-card-label.book { background: #e07b00; }
        .promo-card-text { font-weight: 500; }
        .promo-dots {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 0 8px;
          flex-shrink: 0;
        }
        .promo-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #d0d0d0;
          cursor: pointer;
          transition: background 0.2s;
        }
        .promo-dot.active { background: #2D3748; }

        @media (max-width: 768px) {
          .promo-banner { display: none; }
          .promo-dots  { display: none; }
        }

        /* ── NOTICES ── */
        .notice { padding: 10px 30px; border-bottom: 1px solid; font-size: 0.85rem; }
        .notice-demo     { background: #CBD5E0; border-color: #A0AEC0; color: #2D3748; }
        .notice-live     { background: #d4edda; border-color: #28a745; color: #155724; font-weight: 600; }
        .notice-rankings { background: #d1ecf1; border-color: #bee5eb; color: #0c5460; }

        /* ── CONTROLS BAR ── */
        .controls-bar { background: #F5F7FA; padding: 12px 30px; border-bottom: 1px solid #CBD5E0; display: flex; align-items: center; gap: 16px; }
        .search-bar { position: relative; max-width: 300px; flex: 1; }
        .search-bar input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #CBD5E0; border-radius: 6px; font-size: 0.9rem; }
        .search-bar input:focus { outline: none; border-color: #2D3748; }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #A0AEC0; }

        /* ── TABLE CONTAINER ── */
        .odds-matrix-container { background: #F5F7FA; overflow-x: auto; overflow-y: auto; max-height: calc(100vh - 160px); }
        .odds-matrix { width: 100%; border-collapse: collapse; min-width: 800px; border: 1px solid #CBD5E0; }

        /* ── THEAD ── */
        .odds-matrix thead th {
          background: #EDF0F4;
          padding: 8px 4px;
          text-align: center;
          font-weight: 600;
          font-size: 0.75rem;
          border-right: 1px solid #CBD5E0;
          border-bottom: 1px solid #CBD5E0;
          position: sticky; top: 0; z-index: 10;
        }
        .player-header {
          position: sticky; left: 0; top: 0; z-index: 11;
          background: #EDF0F4; text-align: left; padding: 16px 20px;
          font-weight: 600; font-size: 0.75rem;
          border-right: 1px solid #CBD5E0; border-bottom: 1px solid #CBD5E0;
          width: 204px; min-width: 204px; max-width: 204px;
        }
        .player-header-content { display: flex; align-items: center; gap: 8px; }
        .header-separator { color: #ccc; }
        .sortable-header { cursor: pointer; user-select: none; }
        .sortable-header:hover { opacity: 0.7; }
        .sort-arrow { font-size: 0.8rem; opacity: 0.7; }
        .inline-sort { font-size: 0.75rem; font-weight: 600; }

        /* ── POLYMARKET COLUMN ── */
        .poly-header {
          padding: 8px 4px; width: 52px; min-width: 52px; max-width: 52px;
          cursor: pointer; vertical-align: bottom;
        }
        .poly-cell { width: 52px; min-width: 52px; max-width: 52px; padding: 0 !important; position: relative; height: 48px; }
        .poly-link {
          display: flex; align-items: center; justify-content: center;
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          color: #6046ff; font-weight: 600; font-size: 0.88rem;
          text-decoration: none; transition: background 0.15s;
        }
        .poly-link:hover { background: rgba(74,85,104,0.08); font-weight: 700; }

        /* ── OWGR HEADER ── */
        .owgr-header { font-size: 0.7rem; padding: 8px 6px; width: 56px; min-width: 56px; max-width: 56px; line-height: 1.2; cursor: pointer; }
        .owgr-header div { font-weight: 600; }

        /* ── TIPSTER HEADER ── */
        .tipster-header { font-size: 1.4rem; cursor: pointer; padding: 12px 6px; width: 46px; min-width: 46px; max-width: 46px; }

        /* ── BOOKMAKER HEADER ── */
        .bookmaker-header { display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 120px; padding: 0; overflow: hidden; width: 100%; }
        .bookmaker-logo-wrapper { flex: 1; display: flex; align-items: center; justify-content: center; transform: rotate(270deg); width: 110px; height: 52px; overflow: hidden; }
        .bookmaker-logo { width: 100px; height: 30px; object-fit: contain; display: block; }
        .ew-terms { font-size: 0.7rem; font-weight: 600; color: #2D3748; padding: 3px 0; }

        /* ── TBODY ── */
        .odds-matrix tbody tr { border-bottom: 1px solid #E2E8F0; }
        .odds-matrix tbody tr:hover { background: #F5F7FA; }
        .odds-matrix tbody td { padding: 0; font-size: 0.9rem; text-align: center; border-right: 1px solid #E2E8F0; height: 48px; }

        /* sticky player column */
        .odds-matrix tbody td:first-child {
          position: sticky; left: 0; background: #F5F7FA; z-index: 1;
          text-align: left; padding: 0 0 0 20px;
          border-right: 1px solid #CBD5E0;
          width: 204px; min-width: 204px; max-width: 204px;
          height: 48px;
        }
        .odds-matrix tbody tr:hover td:first-child { background: #F5F7FA; }

        .player-cell { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; padding: 14px 0; }
        .expand-icon { color: #A0AEC0; flex-shrink: 0; }
        .player-name { white-space: nowrap; }

        /* ── OWGR CELL ── */
        .owgr-cell { width: 56px; font-weight: 600; color: #4A5568; font-size: 0.85rem; }

        /* ── TIPSTER CELL ── */
        .tipster-cell { width: 46px; padding: 0 4px !important; }
        .tipster-bar-container { position: relative; width: 100%; height: 20px; background: #DDE2E8; border-radius: 3px; overflow: hidden; cursor: pointer; }
        .tipster-bar-container:hover { opacity: 0.85; }
        .tipster-bar { position: absolute; left: 0; top: 0; height: 100%; background: linear-gradient(90deg, #2D3748, #4A5568); }
        .tipster-count { position: absolute; right: 3px; top: 50%; transform: translateY(-50%); font-size: 0.72rem; font-weight: 700; }
        .tipster-empty { color: #ccc; }

        /* ── ODDS CELL — full-cell clickable link ── */
        .odds-cell {
          padding: 0 !important;
          position: relative;
          height: 48px;
        }
        .odds-cell.best-odds { background: #E8ECF0; }

        .odds-link {
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          color: #2D3748;
          text-decoration: none;
          font-weight: 500;
          transition: background 0.15s;
        }
        .odds-link:hover {
          background: rgba(74,85,104,0.08);
          font-weight: 700;
        }
        .best-odds .odds-link:hover { background: rgba(160,174,192,0.25); }

        /* ── MOBILE best column ── */
        .best-odds-header { display: none; }
        .best-odds-cell-mobile { display: none; }
        .desktop-only { display: table-cell; }
        .mobile-only  { display: none; }

        /* ── EXPANDED ROW ── */
        .expanded-row td { padding: 0 !important; }
        .expanded-content { padding: 20px 25px; background: #EDF0F4; }
        .desktop-cards-grid { display: flex; flex-wrap: wrap; gap: 8px; }

        .desktop-info-card, .desktop-odds-card {
          background: #F5F7FA; border: 1px solid #CBD5E0; border-radius: 6px;
          padding: 8px 10px; text-align: center; min-width: 85px;
        }
        .desktop-odds-card-clickable {
          text-decoration: none; color: inherit; cursor: pointer; display: flex; flex-direction: column;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .desktop-odds-card-clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-color: #2D3748; }
        .desktop-form-card { min-width: 260px; }
        .desktop-card-label    { font-size: 0.62rem; color: #A0AEC0; text-transform: uppercase; font-weight: 600; line-height: 1.2; }
        .desktop-card-sublabel { font-size: 0.58rem; color: #bbb; text-transform: uppercase; margin-bottom: 2px; }
        .desktop-card-value    { font-size: 1rem; font-weight: 700; margin-top: 5px; }
        .desktop-card-odds     { font-size: 1.15rem; font-weight: 700; margin-top: 3px; }

        /* ── FORM BOXES ── */
        .form-boxes { display: flex; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
        .form-box { display: inline-block; padding: 5px 7px; border: 1px solid #d0d0d0; border-right: none; font-size: 0.78rem; font-weight: 600; min-width: 34px; text-align: center; }
        .form-box:first-child { border-radius: 3px 0 0 3px; }
        .form-box:last-child  { border-right: 1px solid #d0d0d0; border-radius: 0 3px 3px 0; }
        .form-box:only-child  { border-radius: 3px; border-right: 1px solid #d0d0d0; }
        .form-box.finish-1      { background: #2D3748; color: white; }
        .form-box.finish-2-5    { background: #4A5568; color: white; }
        .form-box.finish-6-10   { background: #718096; color: white; }
        .form-box.finish-11-20  { background: #A0AEC0; color: #2D3748; }
        .form-box.finish-21-30  { background: #CBD5E0; color: #2D3748; }
        .form-box.finish-31-50  { background: #E2E8F0; color: #2D3748; }
        .form-box.finish-mc     { background: #f3f4f6; color: #6b7280; }
        .form-box.finish-other  { background: #f9fafb; color: #2D3748; }

        /* ── LOADING ── */
        .loading-state { text-align: center; padding: 60px 20px; color: #A0AEC0; font-size: 1.1rem; }

        /* ── FOOTER ── */
        .site-footer { background: #EDF0F4; border-top: 1px solid #CBD5E0; padding: 40px 30px 30px; margin-top: 60px; }
        .footer-content { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
        .responsible-gambling { font-size: 0.9rem; color: #2D3748; line-height: 1.6; }
        .responsible-gambling strong { color: #d32f2f; }
        .responsible-gambling a { color: #2D3748; font-weight: 600; }
        .affiliate-notice { font-size: 0.82rem; color: #718096; line-height: 1.5; }
        .footer-links { display: flex; justify-content: center; flex-wrap: wrap; gap: 14px; }
        .footer-link { color: #2D3748; text-decoration: none; font-size: 0.88rem; font-weight: 500; }
        .footer-link:hover { text-decoration: underline; }
        .footer-separator { color: #ccc; }
        .footer-logos { display: flex; justify-content: center; align-items: center; gap: 14px; padding: 16px 0; border-top: 1px solid #CBD5E0; border-bottom: 1px solid #CBD5E0; }
        .gamcare-text { font-size: 0.88rem; font-weight: 600; }
        .footer-odds-format { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px 0; border-top: 1px solid #CBD5E0; border-bottom: 1px solid #CBD5E0; }
        .footer-odds-format label { font-size: 0.88rem; color: #718096; font-weight: 500; }
        .footer-odds-dropdown { padding: 6px 12px; border: 1px solid #CBD5E0; border-radius: 6px; font-size: 0.88rem; background: #F5F7FA; cursor: pointer; }
        .footer-odds-dropdown:focus { outline: none; border-color: #2D3748; }
        .footer-copyright p { font-size: 0.82rem; color: #A0AEC0; text-align: center; }

        /* ── MOBILE ── */
        .desktop-expanded-view { display: block; }


        .mobile-panes-wrapper  { display: none; }

        @media (max-width: 768px) {
          header { padding: 10px 15px !important; }
          .header-content { display: flex !important; flex-direction: column !important; gap: 8px !important; }
          .tagline { display: none !important; }
          .header-left { display: flex !important; justify-content: space-between !important; width: 100% !important; }
          .header-center { display: none !important; }
          .wordmark { height: 26px !important; width: auto !important; }
          .logo-mobile { height: 30px !important; width: auto !important; display: block !important; }
          .logo-desktop { display: none !important; }
          .tournament-tabs { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 4px; }
          .tournament-tab { padding: 6px 10px; font-size: 0.7rem; flex-shrink: 0; }
          .countdown-container { display: none; }
          .controls-bar { padding: 10px 15px; }
          .search-bar { max-width: 100%; }

          .odds-matrix thead th:not(:first-child):not(.best-odds-header) { display: none; }
          .odds-matrix tbody td:not(:first-child):not(.best-odds-cell-mobile) { display: none; }
          .desktop-only { display: none !important; }
          .mobile-only  { display: table-cell !important; }
          .odds-matrix thead th:first-child { width: auto !important; min-width: unset !important; max-width: unset !important; position: relative; left: 0; }
          .odds-matrix tbody td:first-child  { min-width: unset !important; max-width: unset !important; width: auto !important; }
          .best-odds-header { display: table-cell !important; width: 28vw; max-width: 110px; text-align: center; }
          .odds-matrix { table-layout: fixed; width: 100%; min-width: unset !important; }
          .odds-matrix-container { overflow-x: hidden; }
          .best-odds-cell-mobile { display: table-cell !important; font-size: 1.1rem; font-weight: 700; cursor: pointer; padding: 0 8px !important; }

          .expanded-content { padding: 0 !important; }
          .expanded-cell { max-width: 100vw !important; width: 100vw !important; padding: 0 !important; }
          .expanded-row { display: block !important; }
          .desktop-expanded-view { display: none; }
          .mobile-panes-wrapper { display: block; width: 100vw; overflow: hidden; }
          .mobile-tabs-container { display: flex; overflow-x: scroll; scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
          .mobile-tabs-container::-webkit-scrollbar { display: none; }
          .mobile-tab-pane { flex: 0 0 100vw; width: 100vw; scroll-snap-align: start; scroll-snap-stop: always; padding: 18px 16px; box-sizing: border-box; }
          .mobile-pane-title { font-size: 1rem; font-weight: 700; margin-bottom: 14px; text-align: center; }
          .mobile-bookmaker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mobile-bookmaker-card { background: #F5F7FA; border: 2px solid #CBD5E0; border-radius: 8px; padding: 12px; text-align: center; text-decoration: none; color: inherit; display: block; }
          .mobile-bookmaker-card.best { background: #E8ECF0; border-color: #d4af37; border-width: 3px; }
          .mobile-bookmaker-name { font-size: 0.72rem; color: #718096; margin-bottom: 5px; font-weight: 600; }
          .mobile-bookmaker-odds { font-size: 1.35rem; font-weight: 700; margin-bottom: 3px; }
          .mobile-bookmaker-ew   { font-size: 0.68rem; color: #A0AEC0; }
          .mobile-extra-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mobile-extra-card { background: #F5F7FA; border: 1px solid #CBD5E0; border-radius: 8px; padding: 12px; text-align: center; text-decoration: none; color: inherit; }
          .mobile-extra-label     { font-size: 0.68rem; color: #A0AEC0; text-transform: uppercase; margin-bottom: 5px; font-weight: 700; }
          .mobile-extra-bookmaker { font-size: 0.68rem; color: #718096; margin-bottom: 5px; }
          .mobile-extra-odds      { font-size: 1.25rem; font-weight: 700; }
          .mobile-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mobile-stat-card { background: #F5F7FA; border: 1px solid #CBD5E0; border-radius: 8px; padding: 12px; text-align: center; }
          .mobile-stat-full-width { grid-column: 1 / -1; }
          .mobile-stat-label { font-size: 0.68rem; color: #A0AEC0; text-transform: uppercase; margin-bottom: 7px; font-weight: 600; }
          .mobile-stat-value { font-size: 1rem; font-weight: 700; }
          .mobile-swipe-indicator { display: flex; justify-content: center; gap: 8px; padding: 12px; border-top: 1px solid #DDE2E8; }
          .swipe-dot { width: 8px; height: 8px; border-radius: 50%; background: #d0d0d0; }
          .swipe-dot.active { background: #718096; }

          .footer-odds-format { flex-direction: column; gap: 10px; }
          .footer-links { flex-direction: column; align-items: center; gap: 10px; }
          .footer-separator { display: none; }
          .site-footer { padding: 28px 18px 20px; margin-top: 30px; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header>
        {/* hamburger button */}
        <button
          className={`nav-menu-btn${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>

        {/* overlay */}
        <div className={`nav-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />

        {/* drawer */}
        <nav className={`nav-drawer${menuOpen ? ' open' : ''}`}>
          <div className="nav-drawer-header">The Fairway</div>
          <div className="nav-drawer-links">
            <a href="/" className="nav-drawer-link active">&#127931; Odds Comparison</a>
            <div className="nav-drawer-section">Blog</div>
            <a href="/blog" className="nav-drawer-link">All Articles</a>
            <a href="/blog/masters-2026-outsiders" className="nav-drawer-link">Masters 2026 Outsiders</a>
          </div>
          <div className="nav-drawer-footer">18+ | BeGambleAware.org</div>
        </nav>

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
              {MAJORS.map((m) => (
                <button
                  key={m.id}
                  className={`tournament-tab${selectedTournament.id === m.id ? ' active' : ''}`}
                  onClick={() => setSelectedTournament(m)}
                >{m.name}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── NOTICES ── */}
      {useMock && <div className="notice notice-demo">💡 Demo data — live odds available during major tournaments</div>}


      {/* ── CONTROLS ── */}
      <div className="controls-bar">
        <div className="search-bar">
          <Search className="search-icon" size={16} />
          <input
            id="player-search"
            name="player-search"
            type="text"
            placeholder="Search players..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <div className="promo-banner">
          <div className="promo-track">
            {PROMO_ITEMS.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target={item.url !== '#' ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className={`promo-card${promoIndex === i ? ' promo-active' : ''}`}
              >
                <span className={`promo-card-label ${item.labelClass}`}>{item.label}</span>
                <span className="promo-card-text">{item.text}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="promo-dots">
          {PROMO_ITEMS.map((_, i) => (
            <span
              key={i}
              className={`promo-dot${promoIndex === i ? ' active' : ''}`}
              onClick={() => setPromoIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* ── TABLE ── */}
      {loading ? (
        <div className="loading-state">Loading odds…</div>
      ) : (
        <div className="odds-matrix-container">
          <table className="odds-matrix">
            <thead>
              <tr>
                <th className="player-header">
                  <div className="player-header-content">
                    <SortBtn sortKey="name"     label="Player" className="inline-sort" />
                    <span className="header-separator">|</span>
                    <SortBtn sortKey="avgOdds"  label="Price"  className="inline-sort" />
                  </div>
                </th>
                <th className="owgr-header desktop-only" onClick={() => handleSort('owgr')}>
                  <div>World</div><div>Ranking</div>
                  {sortConfig.key === 'owgr' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="tipster-header desktop-only" onClick={() => handleSort('tipsterPicks')} title="Tipster Consensus">
                  🎯{sortConfig.key === 'tipsterPicks' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="poly-header desktop-only" onClick={() => handleSort('polyOdds')} title="Polymarket implied odds">
                  <div className="bookmaker-header">
                    <div className="bookmaker-logo-wrapper">
                      <img src="/logos/polymarket.png" alt="Polymarket" className="bookmaker-logo"
                        onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                      />
                      <span style={{display:'none', writingMode:'vertical-rl', transform:'rotate(180deg)', fontSize:'0.72rem', fontWeight:700}}>POLY</span>
                    </div>
                    <div className="ew-terms" style={{fontSize:'0.6rem', color:'#888'}}>
                      {sortConfig.key === 'polyOdds' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                  </div>
                </th>
                {bookmakers.map((bm, i) => (
                  <th key={i} style={{ width: '52px', minWidth: '52px', maxWidth: '52px' }}>
                    <div className="bookmaker-header">
                      <div className="bookmaker-logo-wrapper">
                        <img
                          src={`/logos/${bm.logo || bm.name.toLowerCase().replace(/\s/g,'') + '.png'}`}
                          alt={bm.name}
                          className="bookmaker-logo"
                          onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                        />
                        <span style={{ display:'none', writingMode:'vertical-rl', transform:'rotate(180deg)', fontSize:'0.72rem', fontWeight:600 }}>
                          {bm.name}
                        </span>
                      </div>
                      <div className="ew-terms">{bm.ew}</div>
                    </div>
                  </th>
                ))}
                <th className="best-odds-header mobile-only">Best</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, idx) => {
                const outrightVals = bookmakers
                  .map((b) => player.bookmakerOdds?.[b.name]?.outright)
                  .filter(Number.isFinite);
                const bestOdds = outrightVals.length ? Math.max(...outrightVals) : null;

                return (
                  <React.Fragment key={idx}>
                    <tr>
                      {/* player name */}
                      <td>
                        <div className="player-cell" onClick={() => setExpandedPlayer(expandedPlayer === player.name ? null : player.name)}>
                          {expandedPlayer === player.name
                            ? <ChevronUp   className="expand-icon" size={16} />
                            : <ChevronDown className="expand-icon" size={16} />}
                          <span className="player-name">{player.name}</span>
                        </div>
                      </td>

                      {/* owgr */}
                      <td className="owgr-cell desktop-only">{player.owgr ?? '-'}</td>

                      {/* tipster bar */}
                      <td className="tipster-cell desktop-only">
                        {player.tipsterPicks?.length > 0 ? (
                          <div
                            className="tipster-bar-container"
                            onClick={() => alert(`${player.tipsterPicks.length} tipsters picked ${player.name}:\n\n${player.tipsterPicks.join('\n')}`)}
                            title={`${player.tipsterPicks.length} tipsters`}
                          >
                            <div className="tipster-bar" style={{ width: `${Math.min((player.tipsterPicks.length / 8) * 100, 100)}%` }} />
                            <span className="tipster-count">{player.tipsterPicks.length}</span>
                          </div>
                        ) : <div className="tipster-empty">-</div>}
                      </td>

                      {/* polymarket */}
                      {(() => {
                        const polyKey = Object.keys(polyOddsMap).find(k => norm(k) === norm(player.name));
                        const polyVal = polyKey ? polyOddsMap[polyKey] : null;
                        return (
                          <td className="poly-cell desktop-only">
                            {polyVal ? (
                              <a href={POLYMARKET_URL} target="_blank" rel="noopener noreferrer" className="poly-link" title="Trade on Polymarket">
                                {formatOdds(polyVal)}
                              </a>
                            ) : <span style={{color:'#ccc'}}>-</span>}
                          </td>
                        );
                      })()}

                      {/* odds — full-cell anchor */}
                      {bookmakers.map((bm, bIdx) => {
                        const val = player.bookmakerOdds?.[bm.name]?.outright;
                        const isBest = val === bestOdds && bestOdds !== null;
                        return (
                          <td key={bIdx} className={`odds-cell${isBest ? ' best-odds' : ''}`}>
                            <a
                              href={AFFILIATE_LINKS[bm.name] || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="odds-link"
                              onClick={() => window.gtag?.('event', 'bookmaker_click', { bookmaker: bm.name, player: player.name, odds: val, tournament: selectedTournament.name })}
                            >
                              {formatOdds(val)}
                            </a>
                          </td>
                        );
                      })}

                      {/* mobile best odds */}
                      <td className="odds-cell best-odds-cell-mobile" onClick={() => setExpandedPlayer(expandedPlayer === player.name ? null : player.name)}>
                        {formatOdds(bestOdds)}
                      </td>
                    </tr>

                    {/* expanded row */}
                    {expandedPlayer === player.name && (
                      <tr className="expanded-row">
                        <td colSpan={bookmakers.length + 4} className="expanded-cell">
                          <div className="expanded-content">

                            {/* desktop */}
                            <div className="desktop-expanded-view">
                              <div className="desktop-cards-grid">
                                <div className="desktop-info-card">
                                  <div className="desktop-card-label">Nationality</div>
                                  <div className="desktop-card-value">{player.nationality}</div>
                                </div>
                                <div className="desktop-info-card">
                                  <div className="desktop-card-label">World Ranking</div>
                                  <div className="desktop-card-value">{player.owgr ?? 'N/A'}</div>
                                </div>
                                {player.recentForm?.length > 0 && (
                                  <div className="desktop-info-card desktop-form-card">
                                    <div className="desktop-card-label">Recent Form</div>
                                    <div className="form-boxes">
                                      {player.recentForm.map((p, i) => (
                                        <span key={i} className={`form-box ${getFinishClass(p)}`}>
                                          {typeof p === 'number' ? p : String(p).replace('T','')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {player.courseHistory && (
                                  <div className="desktop-info-card desktop-form-card">
                                    <div className="desktop-card-label">Event Form</div>
                                    <div className="form-boxes">
                                      {(() => {
                                        const key = Object.keys(majorFormMap).find(k => norm(k) === norm(player.name));
                                        const results = key ? majorFormMap[key] : [];
                                        if (!results || results.length === 0) return <span style={{color:'#A0AEC0', fontSize:'0.75rem'}}>No data</span>;
                                        return results.map((p, i) => (
                                          <span key={i} className={`form-box ${getFinishClass(p)}`}>
                                            {String(p).replace('T','')}
                                          </span>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                )}
                                {['top5','top10','top20','top30','top40','r1Leader'].map((mkt) => {
                                  const LABELS = { top5:'Top 5', top10:'Top 10', top20:'Top 20', top30:'Top 30', top40:'Top 40', r1Leader:'R1 Leader' };
                                  const candidates = bookmakers
                                    .map((b) => ({ name: b.name, odds: player.bookmakerOdds?.[b.name]?.[mkt], url: AFFILIATE_LINKS[b.name] }))
                                    .filter((o) => o.odds && o.odds !== 'N/A');
                                  const best = candidates.length
                                    ? candidates.reduce((mx, c) => c.odds > mx.odds ? c : mx, candidates[0])
                                    : null;
                                  return best ? (
                                    <a key={mkt} href={best.url} target="_blank" rel="noopener noreferrer"
                                       className="desktop-odds-card desktop-odds-card-clickable"
                                       onClick={() => window.gtag?.('event','bookmaker_click',{ bookmaker: best.name, player: player.name, market: LABELS[mkt], odds: best.odds })}>
                                      <div className="desktop-card-label">{LABELS[mkt]}</div>
                                      <div className="desktop-card-sublabel">Best</div>
                                      <div className="desktop-card-odds">{formatOdds(best.odds)}</div>
                                    </a>
                                  ) : (
                                    <div key={mkt} className="desktop-odds-card">
                                      <div className="desktop-card-label">{LABELS[mkt]}</div>
                                      <div className="desktop-card-sublabel">Best</div>
                                      <div className="desktop-card-odds">N/A</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* mobile */}
                            <div className="mobile-panes-wrapper">
                              <div className="mobile-tabs-container"
                                onScroll={(e) => setActiveMobilePane(Math.round(e.target.scrollLeft / e.target.offsetWidth))}>

                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Best Prices</h3>
                                  <div className="mobile-bookmaker-grid">
                                    {bookmakers
                                      .map((bm) => ({ bm, v: player.bookmakerOdds?.[bm.name]?.outright }))
                                      .filter(({ v }) => v && Number.isFinite(v))
                                      .sort((a, b) => b.v - a.v)
                                      .slice(0, 6)
                                      .map(({ bm, v }, i) => (
                                        <a key={i} href={AFFILIATE_LINKS[bm.name]} target="_blank" rel="noopener noreferrer"
                                           className={`mobile-bookmaker-card${v === bestOdds ? ' best' : ''}`}>
                                          <div className="mobile-bookmaker-name">{bm.name}</div>
                                          <div className="mobile-bookmaker-odds">{formatOdds(v)}</div>
                                          <div className="mobile-bookmaker-ew">{bm.ew} places</div>
                                        </a>
                                      ))
                                    }
                                  </div>
                                </div>

                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Extra Odds</h3>
                                  <div className="mobile-extra-grid">
                                    {['top5','top10','top20','top30','top40','makeCut'].map((mkt, mi) => {
                                      const LABELS = { top5:'Top 5', top10:'Top 10', top20:'Top 20', top30:'Top 30', top40:'Top 40', makeCut:'Make Cut' };
                                      const candidates = bookmakers
                                        .map((b) => ({ name: b.name, odds: player.bookmakerOdds?.[b.name]?.[mkt], url: AFFILIATE_LINKS[b.name] }))
                                        .filter((o) => o.odds && o.odds !== 'N/A');
                                      const best = candidates.length ? candidates.reduce((mx,c) => c.odds > mx.odds ? c : mx, candidates[0]) : null;
                                      return best ? (
                                        <a key={mi} href={best.url} target="_blank" rel="noopener noreferrer" className="mobile-extra-card">
                                          <div className="mobile-extra-label">{LABELS[mkt]}</div>
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
                                      <div className="mobile-stat-value">{player.owgr ?? 'N/A'}</div>
                                    </div>
                                    {player.recentForm?.length > 0 && (
                                      <div className="mobile-stat-card mobile-stat-full-width">
                                        <div className="mobile-stat-label">Recent Form</div>
                                        <div className="form-boxes">
                                          {player.recentForm.map((p, i) => (
                                            <span key={i} className={`form-box ${getFinishClass(p)}`}>
                                              {typeof p === 'number' ? p : String(p).replace('T','')}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {Object.keys(majorFormMap).find(k => norm(k) === norm(player.name)) && (
                                      <div className="mobile-stat-card mobile-stat-full-width">
                                        <div className="mobile-stat-label">Event Form</div>
                                        <div className="form-boxes">
                                          {(() => {
                                            const key = Object.keys(majorFormMap).find(k => norm(k) === norm(player.name));
                                            const results = key ? majorFormMap[key] : [];
                                            return results.map((p, i) => (
                                              <span key={i} className={`form-box ${getFinishClass(p)}`}>
                                                {String(p).replace('T','')}
                                              </span>
                                            ));
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                              </div>
                              <div className="mobile-swipe-indicator">
                                {[0,1,2].map((i) => <span key={i} className={`swipe-dot${activeMobilePane === i ? ' active' : ''}`} />)}
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

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-content">
          <p className="responsible-gambling">
            <strong>18+ Only.</strong> Please gamble responsibly. If you need help, visit{' '}
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">BeGambleAware.org</a>
            {' '}or call the National Gambling Helpline on 0808 8020 133.
          </p>
          <p className="affiliate-notice">
            The Fairway is an independent odds comparison service. We only feature bookmakers licensed by the UK Gambling Commission (UKGC).
            We may earn commission from bookmaker links. All odds are subject to change. 18+ only.
          </p>
          <div className="footer-odds-format">
            <label htmlFor="odds-format">Odds Format:</label>
            <select
              id="odds-format"
              name="odds-format"
              value={oddsFormat}
              onChange={(e) => { setOddsFormat(e.target.value); localStorage.setItem('oddsFormat', e.target.value); }}
              className="footer-odds-dropdown"
            >
              <option value="decimal">Decimal (6.50)</option>
              <option value="fractional">Fractional (11/2)</option>
              <option value="american">American (+550)</option>
            </select>
          </div>
          <div className="footer-links">
            <a href="/terms"               className="footer-link">Terms &amp; Conditions</a>
            <span className="footer-separator">|</span>
            <a href="/privacy"             className="footer-link">Privacy Policy</a>
            <span className="footer-separator">|</span>
            <a href="/responsible-gambling"className="footer-link">Responsible Gambling</a>
            <span className="footer-separator">|</span>
            <a href="/contact"             className="footer-link">Contact</a>
          </div>
          <div className="footer-logos">
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">
              <span className="gamcare-text">BeGambleAware</span>
            </a>
            <span className="footer-separator">|</span>
            <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer">
              <span className="gamcare-text">GamCare</span>
            </a>
          </div>
          <div className="footer-copyright"><p>© 2025 The Fairway. All rights reserved.</p></div>
        </div>
      </footer>

    </div>
  );
}
