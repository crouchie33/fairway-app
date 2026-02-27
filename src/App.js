import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import logoImg from './logo.png';
import wordmarkImg from './wordmark.png';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const USE_LIVE_API = false;
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const ODDS_CACHE_KEY = 'fairway_odds';
const ODDS_CACHE_MS = 60 * 60 * 1000;

const RANKINGS_URL = 'https://script.google.com/macros/s/AKfycbz0AV6lo8WSGm1qFLfKVKW8zbg2NrLaYGd82e20vPvrPFmQqsMUK6sIA0sc5fApVUUx/exec';
const NATIONALITY_URL       = 'https://script.google.com/macros/s/AKfycbzQweWv_6kEsGShpITxBKLpo4U81F3TmzSUkolKsW6AXx1vrj0s7JCy_7mt-Qe8eV3ieQ/exec';
const NATIONALITY_CACHE_KEY = 'fairway_nationalities';
const NATIONALITY_CACHE_MS  = 30 * 24 * 60 * 60 * 1000;
const RANKINGS_CACHE_KEY = 'fairway_rankings';
const RANKINGS_CACHE_MS = 24 * 60 * 60 * 1000;

const SHEET_PRICES_URLS = {
  masters: 'https://script.google.com/macros/s/AKfycbw1w-GVUGobfw3NHMjDdyB0v8ZLZuHe79k0zYFEV_SWv_SzFIoJfIa693eQYGVQd6VN/exec',
  pga:     'https://script.google.com/macros/s/AKfycbwk6W89Wn1pjq0zpOu6JKdh-qEcXi_-Gu03LjymwNRs-KF9BIl7j2kYmiwOyzmYH9m3/exec',
  usopen:  'https://script.google.com/macros/s/AKfycbzsCWHaIyPu4cRKE9vYAgTe5bX7RXl5QWGBioNGeYyWViLvSSWzgDC4RSMR1wlCzHOKoA/exec',
  open:    'https://script.google.com/macros/s/AKfycbwNw5qTNLMqmE7n_3K7M5NaJG7z70qD6coxj2nKrIGH7cRc6QjRgltot3xgwt310wMh/exec',
};
const SHEET_PRICES_CACHE_MS = 12 * 60 * 60 * 1000;

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
  { name: 'BoyleSports',       key: 'boylesports',  logo: 'boylesports.png', ew: '5' },
  { name: '888sport',          key: '888sport',     logo: '888sport.png',    ew: '5' },
  { name: 'Star Sports',        key: 'starsports',   logo: 'starsports.png',  ew: '5' },
  { name: 'Spreadex',           key: 'spreadex',     logo: 'spreadex.png',    ew: '5' },
  { name: 'AK Bets',            key: 'akbets',       logo: 'akbets.png',      ew: '5' },
  { name: '10bet',              key: '10bet',         logo: '10bet.png',       ew: '5' },
  { name: 'BetVictor',          key: 'betvictor',    logo: 'betvictor.png',   ew: '5' },
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
  'Star Sports':        'https://www.starsports.bet/?aff=YOUR_STARSPORTS_ID',
  'Spreadex':           'https://www.spreadex.com/sports/golf?aff=YOUR_SPREADEX_ID',
  'AK Bets':            'https://www.akbets.com/?aff=YOUR_AKBETS_ID',
  '10bet':              'https://www.10bet.co.uk/sports/golf/?aff=YOUR_10BET_ID',
  'BetVictor':          'https://www.betvictor.com/sports/golf?aff=YOUR_BETVICTOR_ID',
};

const POLYMARKET_FALLBACK = {
  "Scottie Scheffler": 4.3, "Rory McIlroy": 11.1, "Bryson DeChambeau": 16.7,
  "Min Woo Lee": 18.9, "Tommy Fleetwood": 17.2, "Ludvig Aberg": 16.7,
  "Jon Rahm": 18.5, "Xander Schauffele": 19.2, "Viktor Hovland": 28.6,
  "Collin Morikawa": 40.0, "Hideki Matsuyama": 41.7, "Jordan Spieth": 52.6,
  "Patrick Cantlay": 50.0, "Justin Thomas": 62.5, "Tyrrell Hatton": 52.6,
  "Brooks Koepka": 66.7, "Max Homa": 100.0, "Cameron Smith": 166.7,
  "Sahith Theegala": 125.0, "Shane Lowry": 125.0, "Tony Finau": 125.0,
};
const POLYMARKET_URL = "https://polymarket.com/event/the-masters-winner?slug=the-masters-winner";
const POLYMARKET_SHEET_URL = "https://script.google.com/macros/s/AKfycbwRfYkS4bBA3uI-BKshmbIBTCSrwAK10-VncZ6D5Rjn9kWXOKX50Q3MtYQhJjRqP9s7/exec";
const POLYMARKET_CACHE_KEY = 'fairway_polymarket';
const POLYMARKET_CACHE_MS = 6 * 60 * 60 * 1000;

const MAJORS_FORM_URL = "https://script.google.com/macros/s/AKfycbwjUK-2zF8GYa8eFevPCWTdUJOeCRA-J5TCXdneuF8b22y2RQexnJL76uxqWr3wBCFw/exec";

const CONFIRMED_URLS = {
  masters: 'https://script.google.com/macros/s/AKfycbxeH8CQ3I1xKGOwEq6TOwzULNuqp5C__ug4mlWdhrKwGf3_MG3KhyK2HUoNObIqdOua/exec',
  pga:     null,
  usopen:  null,
  open:    null,
};
const CONFIRMED_CACHE_MS = 12 * 60 * 60 * 1000;
const MAJORS_FORM_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

const CURRENT_FORM_URL = "https://script.google.com/macros/s/AKfycbzFo29_upCpM4_qg_WiB-ncdqwTMxqoMbsMs7LdHMEw_FnqZNAimPnipv3cTrWPlSuJ/exec";
const CURRENT_FORM_CACHE_MS = 24 * 60 * 60 * 1000;

const TIPSTER_PICKS_URL = "https://script.google.com/macros/s/AKfycbzv6t7xDMj9cYtSHQTVoh6qLnU-igRB5vSsb2sVrnFQ7dnhLm-mf3I11VOfluqqrIzz/exec";
const TIPSTER_PICKS_CACHE_MS = 2 * 60 * 60 * 1000;
const INCLUDED_TIPSTER_COUNT = 17;

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

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const norm = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function lookupRank(map, playerName) {
  if (!map || !playerName) return null;
  const n = norm(playerName);
  if (map[n] !== undefined) return map[n];
  const last = n.split(' ').slice(-1)[0];
  const hits = Object.keys(map).filter((k) => k.endsWith(last));
  return hits.length === 1 ? map[hits[0]] : null;
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

const BM_NAME_MAP = {
  'bet365':       'Bet365',
  'boyle sports': 'BoyleSports',
  'boylesports':  'BoyleSports',
  'skybet':       'Sky Bet',
  'sky bet':      'Sky Bet',
  'betfair':      'Betfair Sportsbook',
  'star sports':  'Star Sports',
  'ak bets':      'AK Bets',
  '10bet':        '10bet',
  'betvictor':    'BetVictor',
};
const normBmName = (name) => BM_NAME_MAP[name.toLowerCase().trim()] || name.trim();

const PLAYER_ALIASES = {
  'siwoo kim':       'Si Woo Kim',
  'joohyung kim':    'Tom Kim',
  'kh lee':          'K.H. Lee',
  'kyoung-hoon lee': 'K.H. Lee',
  'byeonghun an':    'Byeong Hun An',
  'harold varner':   'Harold Varner III',
  'hao tong li':     'Haotong Li',
  'li haotong':      'Haotong Li',
  'daniel brown':    'Dan Brown',
  'shaun norris':    'Shaun Norris',
};

function resolvePlayerName(sheetName, dgNames) {
  if (!sheetName) return sheetName;
  const cleaned     = sheetName.replace(/\(a\)/gi, '').trim();
  const normCleaned = norm(cleaned);

  if (PLAYER_ALIASES[normCleaned]) return PLAYER_ALIASES[normCleaned];
  if (!dgNames || dgNames.length === 0) return sheetName;

  const exact = dgNames.find(n => norm(n) === normCleaned);
  if (exact) return exact;

  const parts   = normCleaned.split(' ');
  const surname = parts.slice(-1)[0];

  const surnameMatches = dgNames.filter(n => norm(n).split(' ').slice(-1)[0] === surname);
  if (surnameMatches.length === 1) return surnameMatches[0];

  if (parts.length >= 2) {
    const initial = parts[0].replace(/\./g, '');
    if (initial.length === 1) {
      const initialMatches = surnameMatches.filter(n => {
        const dgFirst = norm(n).split(' ')[0];
        return dgFirst.startsWith(initial);
      });
      if (initialMatches.length === 1) return initialMatches[0];
    }
  }

  console.warn('[Name unmatched] "' + sheetName + '" — add to PLAYER_ALIASES if incorrect');
  return sheetName;
}

const lookupNationality = (map, name) => {
  if (!map || !name) return 'TBD';
  const n = norm(name);
  const key = Object.keys(map).find(k => norm(k) === n);
  return key ? map[key] : 'TBD';
};

function lookupByName(map, playerName) {
  if (!map || !playerName) return null;
  const n = norm(playerName);
  const surname = n.split(' ').slice(-1)[0];
  let key = Object.keys(map).find(k => norm(k) === n);
  if (key) return key;
  const hits = Object.keys(map).filter(k => norm(k).split(' ').slice(-1)[0] === surname);
  return hits.length === 1 ? hits[0] : null;
}

function buildPlayersFromSheet(oddsData, dgNames = []) {
  return Object.entries(oddsData).map(([name, bookOdds]) => {
    const canonicalName = resolvePlayerName(name, dgNames);
    const bookmakerOdds = {};
    Object.entries(bookOdds).forEach(([bmName, dec]) => {
      bookmakerOdds[normBmName(bmName)] = {
        outright: typeof dec === 'number' ? dec : parseFloat(dec),
        top5: 'N/A', top10: 'N/A', top20: 'N/A',
        top30: 'N/A', top40: 'N/A', r1Leader: 'N/A',
      };
    });
    const vals = Object.values(bookmakerOdds).map((o) => o.outright).filter(Number.isFinite);
    const avgOdds = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 999;
    return {
      name: canonicalName,
      nationality: 'TBD',
      owgr: null,
      recentForm: [1],
      courseHistory: 'TBD',
      tipsterPicks: [],
      bookmakerOdds,
      avgOdds,
    };
  });
}

// ─── THEME ───────────────────────────────────────────────────────────────────

const THEMES = ['light', 'grey', 'dark'];

const THEME_ICONS = { light: '☀️', grey: '◑', dark: '🌙' };
const THEME_LABELS = { light: 'Light', grey: 'Grey', dark: 'Dark' };

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('fairway-theme');
    if (saved && THEMES.includes(saved)) return saved;
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function GolfOddsComparison() {

  const [players, setPlayers]                     = useState([]);
  const [bookmakers, setBookmakers]               = useState(BOOKMAKERS);
  const [ewTermsMap, setEwTermsMap]               = useState({});
  const [rankingsMap, setRankingsMap]             = useState({});
  const [rankingsCount, setRankingsCount]         = useState(0);
  const [loading, setLoading]                     = useState(false);
  const [sheetLoading, setSheetLoading]           = useState(false);
  const [sheetError, setSheetError]               = useState(false);
  const [useMock, setUseMock]                     = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(MAJORS[0]);
  const [sortConfig, setSortConfig]               = useState({ key: 'avgOdds', direction: 'asc' });
  const [filterText, setFilterText]               = useState('');
  const [expandedPlayer, setExpandedPlayer]       = useState(null);
  const [oddsFormat, setOddsFormat]               = useState('decimal');
  const [activeMobilePane, setActiveMobilePane]   = useState(0);
  const [countdown, setCountdown]                 = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [menuOpen, setMenuOpen]                   = useState(false);
  const fetchingRef                               = useRef(false);
  const [polyOddsMap, setPolyOddsMap]             = useState(POLYMARKET_FALLBACK);
  const [majorFormMap, setMajorFormMap]           = useState({});
  const [nationalityMap, setNationalityMap]       = useState({});
  const [confirmedPlayers, setConfirmedPlayers]   = useState([]);
  const [currentFormMap, setCurrentFormMap]       = useState({});
  const [tipsterPicksMap, setTipsterPicksMap]     = useState({});
  const [maxTipsterPicks, setMaxTipsterPicks]     = useState(23);
  const [tipsterModal, setTipsterModal]           = useState(null);
  const [isUS, setIsUS]                           = useState(false);
  const [promoIndex, setPromoIndex]               = useState(0);
  const [theme, setTheme]                         = useState(getInitialTheme);

  // ── apply theme to <html> and persist ──
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('fairway-theme', theme); } catch {}
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => THEMES[(THEMES.indexOf(prev) + 1) % THEMES.length]);
  };

  const derivedMaxTips = useMemo(() => {
    const vals = Object.values(tipsterPicksMap).map(p => p.length);
    return vals.length ? Math.max(...vals) : 1;
  }, [tipsterPicksMap]);

  const PROMO_ITEMS = [
    { label: 'Book', labelClass: 'book', text: "The Trader's Guide to Golf Betting — available on Amazon", url: 'https://www.amazon.co.uk/traders-guide-Golf-Betting-Everything-ebook/dp/B0C9XF1VKH' },
    { label: 'New',  labelClass: '',     text: 'Masters 2026 — best odds comparison updated daily',        url: '#' },
    { label: 'New',  labelClass: '',     text: 'Outsiders to back now - 8 weeks out from The Masters',     url: '/blog/masters-2026-outsiders' },
  ];

  useEffect(() => {
    const id = setInterval(() => setPromoIndex((prev) => (prev + 1) % PROMO_ITEMS.length), 4000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  useEffect(() => {
    const saved = localStorage.getItem('oddsFormat');
    if (saved) setOddsFormat(saved);
  }, []);

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

  // ── TIER 1: IMMEDIATE — odds table + polymarket ──────────────────────────────

  useEffect(() => {
    const url      = SHEET_PRICES_URLS[selectedTournament.id];
    const cacheKey = `fairway_sheetPrices_${selectedTournament.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, ewData, ts } = JSON.parse(cached);
        if (Date.now() - ts < SHEET_PRICES_CACHE_MS && data && Object.keys(data).length > 0) {
          const builtPlayers = buildPlayersFromSheet(data, Object.keys(nationalityMap));
          setPlayers(builtPlayers);
          setBookmakers(BOOKMAKERS);
          if (ewData) setEwTermsMap(ewData);
          setUseMock(false);
          setSheetError(false);
          return;
        }
      }
    } catch {}
    setSheetLoading(true);
    setSheetError(false);
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => {
        const oddsData = json.odds || json;
        const ewData   = json.ewTerms || null;
        if (!oddsData || Object.keys(oddsData).length === 0) throw new Error('Empty response');
        const builtPlayers = buildPlayersFromSheet(oddsData, Object.keys(nationalityMap));
        setPlayers(builtPlayers);
        setBookmakers(BOOKMAKERS);
        if (ewData) setEwTermsMap(ewData);
        setUseMock(false);
        setSheetError(false);
        try { localStorage.setItem(cacheKey, JSON.stringify({ data: oddsData, ewData, ts: Date.now() })); } catch {}
      })
      .catch((err) => {
        console.warn('Sheet prices unavailable, falling back to demo:', err.message);
        setSheetError(true);
        loadMock();
      })
      .finally(() => setSheetLoading(false));
  }, [selectedTournament]); // eslint-disable-line

  useEffect(() => {
    try {
      const cached = localStorage.getItem(POLYMARKET_CACHE_KEY);
      if (cached) {
        const c = JSON.parse(cached);
        if (Date.now() - c.ts < POLYMARKET_CACHE_MS) { setPolyOddsMap(c.data); return; }
      }
    } catch {}
    fetch(POLYMARKET_SHEET_URL)
      .then((r) => r.json())
      .then((json) => {
        if (json.odds && Object.keys(json.odds).length > 0) {
          setPolyOddsMap(json.odds);
          try { localStorage.setItem(POLYMARKET_CACHE_KEY, JSON.stringify({ data: json.odds, ts: Date.now() })); } catch {}
        }
      })
      .catch((err) => console.warn('Polymarket unavailable:', err.message));
  }, [selectedTournament]); // eslint-disable-line

  // ── TIER 2: 2s DELAY — rankings + tipsters ───────────────────────────────────

  useEffect(() => {
    const run = () => {
      const cached = getRankingsCache();
      if (cached) { setRankingsMap(cached); setRankingsCount(Object.keys(cached).length); return; }
      fetch(RANKINGS_URL)
        .then((r) => r.json())
        .then((json) => {
          const raw = json.rankings || {};
          const map = {};
          Object.entries(raw).forEach(([name, rank]) => { map[norm(name)] = Number(rank); });
          setRankingsMap(map);
          setRankingsCount(Object.keys(map).length);
          setRankingsCache(map);
        })
        .catch((err) => console.warn('Rankings unavailable:', err.message));
    };
    const t = setTimeout(run, 2000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  useEffect(() => {
    const run = () => {
      const cacheKey = 'tipsterPicks_v2';
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < TIPSTER_PICKS_CACHE_MS && data && Object.keys(data).length > 0) { setTipsterPicksMap(data); return; }
        }
      } catch {}
      fetch(TIPSTER_PICKS_URL)
        .then(r => r.json())
        .then(json => {
          if (json && Object.keys(json).length > 0) {
            setTipsterPicksMap(json);
            const max = Math.max(...Object.values(json).map(picks => picks.length));
            setMaxTipsterPicks(max > 0 ? max : 23);
            try { localStorage.setItem(cacheKey, JSON.stringify({ data: json, ts: Date.now() })); } catch {}
          }
        })
        .catch(err => console.warn('Tipster picks unavailable:', err.message));
    };
    const t = setTimeout(run, 2000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  // ── apply rankings to players once both are loaded ───────────────────────────
  useEffect(() => {
    if (Object.keys(rankingsMap).length === 0 || players.length === 0) return;
    setPlayers((prev) =>
      prev.map((p) => {
        const rank = lookupRank(rankingsMap, p.name);
        return rank !== null ? { ...p, owgr: rank } : p;
      })
    );
  }, [rankingsMap, selectedTournament]); // eslint-disable-line

  // ── re-resolve names once nationalityMap loads ───────────────────────────────
  useEffect(() => {
    const dgNames = Object.keys(nationalityMap);
    if (dgNames.length === 0 || players.length === 0) return;
    const needsUpdate = players.some(p => resolvePlayerName(p.name, dgNames) !== p.name);
    if (!needsUpdate) return;
    setPlayers((prev) =>
      prev.map((p) => {
        const resolved = resolvePlayerName(p.name, dgNames);
        if (resolved === p.name) return p;
        const rank = lookupRank(rankingsMap, resolved);
        return { ...p, name: resolved, owgr: rank !== null ? rank : p.owgr };
      })
    );
  }, [nationalityMap, players.length]); // eslint-disable-line

  // ── TIER 3: 5s DELAY — nationalities, form x2, confirmed players ─────────────

  useEffect(() => {
    const run = () => {
      // nationalities
      try {
        const cached = localStorage.getItem(NATIONALITY_CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < NATIONALITY_CACHE_MS && data && Object.keys(data).length > 0) {
            setNationalityMap(data);
            return;
          }
        }
      } catch {}
      fetch(NATIONALITY_URL)
        .then(r => r.json())
        .then(json => {
          const map = json.nationalities || {};
          if (Object.keys(map).length > 0) {
            setNationalityMap(map);
            try { localStorage.setItem(NATIONALITY_CACHE_KEY, JSON.stringify({ data: map, ts: Date.now() })); } catch {}
          }
        })
        .catch(err => console.warn('Nationality fetch unavailable:', err.message));
    };
    const t = setTimeout(run, 5000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  useEffect(() => {
    const run = () => {
      const nameMap = { 'The Masters': 'Masters', 'PGA Championship': 'PGA Championship', 'US Open': 'US Open', 'The Open': 'The Open' };
      const majorName = nameMap[selectedTournament.name] || selectedTournament.name;
      const cacheKey = 'fairway_form_' + majorName.replace(/\s/g, '_');
      // major form
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const c = JSON.parse(cached);
          if (Date.now() - c.ts < MAJORS_FORM_CACHE_MS) { setMajorFormMap(c.data); return; }
        }
      } catch {}
      fetch(MAJORS_FORM_URL + '?major=' + encodeURIComponent(majorName))
        .then((r) => r.json())
        .then((json) => {
          if (json.form && Object.keys(json.form).length > 0) {
            setMajorFormMap(json.form);
            try { localStorage.setItem(cacheKey, JSON.stringify({ data: json.form, ts: Date.now() })); } catch {}
          }
          if (json.nationalities && Object.keys(json.nationalities).length > 0) {
            setNationalityMap(prev => Object.keys(prev).length === 0 ? json.nationalities : prev);
            try { localStorage.setItem('fairway_nationalities', JSON.stringify({ data: json.nationalities, ts: Date.now() })); } catch {}
          }
        })
        .catch((err) => console.warn('Majors form unavailable:', err.message));
    };
    const t = setTimeout(run, 5000);
    return () => clearTimeout(t);
  }, [selectedTournament]); // eslint-disable-line

  useEffect(() => {
    const run = () => {
      const cacheKey = 'currentForm2026';
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CURRENT_FORM_CACHE_MS && data && Object.keys(data).length > 0) { setCurrentFormMap(data); return; }
        }
      } catch {}
      fetch(CURRENT_FORM_URL)
        .then((r) => r.json())
        .then((json) => {
          if (json.players && Object.keys(json.players).length > 0) {
            setCurrentFormMap(json.players);
            try { localStorage.setItem(cacheKey, JSON.stringify({ data: json.players, ts: Date.now() })); } catch {}
          }
        })
        .catch((err) => console.warn('Current form unavailable:', err.message));
    };
    const t = setTimeout(run, 5000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  useEffect(() => {
    const run = () => {
      const url = CONFIRMED_URLS[selectedTournament.id];
      if (!url) { setConfirmedPlayers([]); return; }
      const cacheKey = 'fairway_confirmed_' + selectedTournament.id;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CONFIRMED_CACHE_MS && data && data.length > 0) { setConfirmedPlayers(data); return; }
        }
      } catch {}
      fetch(url)
        .then(r => r.json())
        .then(json => {
          const list = json.confirmed || [];
          if (list.length > 0) {
            setConfirmedPlayers(list);
            try { localStorage.setItem(cacheKey, JSON.stringify({ data: list, ts: Date.now() })); } catch {}
          }
        })
        .catch(err => console.warn('Confirmed players unavailable:', err.message));
    };
    const t = setTimeout(run, 5000);
    return () => clearTimeout(t);
  }, [selectedTournament]); // eslint-disable-line

  // ── US detection (fire and forget, low priority) ─────────────────────────────
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(d => { if (d.country_code === 'US') setIsUS(true); })
      .catch(() => setIsUS(false));
  }, []); // eslint-disable-line

  const loadMock = useCallback(() => {
    setUseMock(true);
    const result = MOCK_PLAYERS.map((p) => {
      const base = 5 + Math.random() * 45;
      const bOdds = {};
      BOOKMAKERS.forEach((b) => {
        const v = +(base + (Math.random() - 0.5) * 3).toFixed(1);
        bOdds[b.name] = { outright: v, top5: +(v*0.25).toFixed(1), top10: +(v*0.15).toFixed(1), top20: +(v*0.08).toFixed(1), top30: +(v*0.06).toFixed(1), top40: +(v*0.05).toFixed(1), r1Leader: +(v*0.4).toFixed(1) };
      });
      const vals = BOOKMAKERS.map((b) => bOdds[b.name].outright);
      return { ...p, bookmakerOdds: bOdds, avgOdds: vals.reduce((a, b) => a + b, 0) / vals.length };
    });
    setPlayers(result);
    setBookmakers(BOOKMAKERS);
  }, []);

  const formatOdds = useCallback((val) => {
    if (!val || val === 'N/A') return '-';
    const n = typeof val === 'string' ? parseFloat(val) : val;
    if (!Number.isFinite(n)) return '-';
    if (oddsFormat === 'american') return n >= 2 ? `+${Math.round((n-1)*100)}` : `${Math.round(-100/(n-1))}`;
    if (oddsFormat === 'fractional') {
      const d = n - 1;
      const table = { 0.5:'1/2',0.33:'1/3',0.67:'2/3',0.25:'1/4',0.75:'3/4',0.2:'1/5',0.4:'2/5',0.6:'3/5',0.8:'4/5',1:'1/1',1.5:'3/2',2:'2/1',2.5:'5/2',3:'3/1',3.5:'7/2',4:'4/1',5:'5/1',6:'6/1',7:'7/1',8:'8/1',9:'9/1',10:'10/1',11:'11/1',12:'12/1',14:'14/1',16:'16/1',20:'20/1',25:'25/1',33:'33/1',50:'50/1',66:'66/1',100:'100/1' };
      const r = Math.round(d * 100) / 100;
      if (table[r]) return table[r];
      let num = Math.round(d * 100), den = 100;
      const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
      const g = gcd(num, den);
      return `${num/g}/${den/g}`;
    }
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }, [oddsFormat]);

  const getFinishClass = (pos) => {
    if (['MC','WD','DQ'].includes(String(pos))) return 'finish-mc';
    const n = parseInt(String(pos).replace(/\D/g,''), 10);
    if (isNaN(n))  return 'finish-other';
    if (n === 1)   return 'finish-1';
    if (n <= 5)    return 'finish-2-5';
    if (n <= 10)   return 'finish-6-10';
    if (n <= 20)   return 'finish-11-20';
    if (n <= 30)   return 'finish-21-30';
    if (n <= 50)   return 'finish-31-50';
    return 'finish-other';
  };

  const getEwTerms = useCallback((bmName) => {
    if (ewTermsMap[bmName]) return ewTermsMap[bmName];
    const bm = BOOKMAKERS.find((b) => b.name === bmName);
    return bm ? bm.ew : '5';
  }, [ewTermsMap]);

  const sorted = useMemo(() => {
    const dgNames = Object.keys(nationalityMap);
    const normConfirmed = (n) => norm(resolvePlayerName(n.replace(/\(a\)/gi, '').trim(), dgNames));
    const confirmedSet = confirmedPlayers.length > 0
      ? new Set(confirmedPlayers.map(n => normConfirmed(n)))
      : null;
    const filtered = players.filter((p) => {
      if (confirmedSet && !confirmedSet.has(normConfirmed(p.name))) return false;
      return p.name.toLowerCase().includes(filterText.toLowerCase());
    });
    return filtered.sort((a, b) => {
      let av, bv;
      if (sortConfig.key === 'name') { av = a.name.split(' ').slice(-1)[0]; bv = b.name.split(' ').slice(-1)[0]; }
      else if (sortConfig.key === 'owgr') { av = a.owgr ?? 9999; bv = b.owgr ?? 9999; }
      else if (sortConfig.key === 'tipsterPicks') {
        const tKeyA = Object.keys(tipsterPicksMap).find(k => norm(k) === norm(a.name));
        const tKeyB = Object.keys(tipsterPicksMap).find(k => norm(k) === norm(b.name));
        av = tKeyA ? tipsterPicksMap[tKeyA].length : 0;
        bv = tKeyB ? tipsterPicksMap[tKeyB].length : 0;
      } else if (sortConfig.key === 'polyOdds') {
        const fp = (p) => { const k = Object.keys(polyOddsMap).find(k => norm(k) === norm(p.name)); return k ? polyOddsMap[k] : 9999; };
        av = fp(a); bv = fp(b);
      } else { av = a[sortConfig.key] ?? 0; bv = b[sortConfig.key] ?? 0; }
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ?  1 : -1;
      return 0;
    });
  }, [players, sortConfig, filterText, tipsterPicksMap, polyOddsMap, confirmedPlayers]);

  const handleSort = (key) => setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const SortBtn = ({ sortKey, label, className = '' }) => (
    <span onClick={() => handleSort(sortKey)} className={`sortable-header ${className}`}>
      {label}
      {sortConfig.key === sortKey && <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>}
    </span>
  );

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <style>{`

        /* ══════════════════════════════════════════════════
           THEME TOKENS
           ══════════════════════════════════════════════════ */

        /* Light (default) */
        :root, [data-theme="light"] {
          --bg-base:           #F5F7FA;
          --bg-surface:        #EDF0F4;
          --bg-surface-alt:    #E2E8F0;
          --bg-header:         #F5F7FA;
          --bg-drawer:         #ffffff;
          --bg-cell-sticky:    #F5F7FA;
          --bg-cell-hover:     #E8ECF0;
          --bg-thead:          #EDF0F4;
          --bg-expanded:       #EDF0F4;
          --bg-card:           #F5F7FA;
          --bg-input:          #ffffff;
          --bg-promo:          #F5F7FA;
          --bg-footer:         #EDF0F4;
          --bg-best-odds:      #E8ECF0;

          --text-primary:      #2D3748;
          --text-secondary:    #718096;
          --text-muted:        #A0AEC0;
          --text-tagline:      #718096;
          --text-odds:         #2D3748;
          --text-poly:         #6046ff;

          --border-main:       #CBD5E0;
          --border-light:      #E2E8F0;
          --border-best:       #2D3748;

          --accent-primary:    #2D3748;
          --accent-secondary:  #4A5568;
          --accent-bar:        #2D3748;
          --accent-bar-grad:   linear-gradient(90deg, #2D3748, #4A5568);
          --accent-bar-text:   #2D3748;
          --accent-highlight:  #2D3748; /* best odds cell */

          --tab-active-bg:     #2D3748;
          --tab-active-color:  #ffffff;

          --tipster-bg:        #DDE2E8;
          --tipster-count-col: #2D3748;

          --btn-bg:            #2D3748;
          --btn-color:         #ffffff;
          --btn-hamburger:     #2D3748;

          --wordmark-filter:   none;
          --logo-filter:       none;
        }

        /* Grey */
        [data-theme="grey"] {
          --bg-base:           #d4d4d4;
          --bg-surface:        #c2c2c2;
          --bg-surface-alt:    #b0b0b0;
          --bg-header:         #d4d4d4;
          --bg-drawer:         #c8c8c8;
          --bg-cell-sticky:    #d4d4d4;
          --bg-cell-hover:     #bebebe;
          --bg-thead:          #c2c2c2;
          --bg-expanded:       #c2c2c2;
          --bg-card:           #d4d4d4;
          --bg-input:          #cbcbcb;
          --bg-promo:          #d4d4d4;
          --bg-footer:         #c2c2c2;
          --bg-best-odds:      #b8b8b8;

          --text-primary:      #1a1a1a;
          --text-secondary:    #3a3a3a;
          --text-muted:        #555555;
          --text-tagline:      #3a3a3a;
          --text-odds:         #1a1a1a;
          --text-poly:         #4433cc;

          --border-main:       #999999;
          --border-light:      #b0b0b0;
          --border-best:       #1a1a1a;

          --accent-primary:    #2a2a2a;
          --accent-secondary:  #444444;
          --accent-bar:        #3a6b3a;
          --accent-bar-grad:   linear-gradient(90deg, #3a6b3a, #4e8f4e);
          --accent-bar-text:   #1a1a1a;
          --accent-highlight:  #2e7d32;

          --tab-active-bg:     #2a2a2a;
          --tab-active-color:  #ffffff;

          --tipster-bg:        #b8b8b8;
          --tipster-count-col: #1a1a1a;

          --btn-bg:            #2a2a2a;
          --btn-color:         #ffffff;
          --btn-hamburger:     #1a1a1a;

          --wordmark-filter:   grayscale(100%) contrast(1.1);
          --logo-filter:       grayscale(100%) contrast(1.1);
        }

        /* Dark */
        [data-theme="dark"] {
          --bg-base:           #2b2b2b;
          --bg-surface:        #333333;
          --bg-surface-alt:    #3d3d3d;
          --bg-header:         #2b2b2b;
          --bg-drawer:         #222222;
          --bg-cell-sticky:    #2b2b2b;
          --bg-cell-hover:     #3a3a3a;
          --bg-thead:          #303030;
          --bg-expanded:       #303030;
          --bg-card:           #333333;
          --bg-input:          #3d3d3d;
          --bg-promo:          #333333;
          --bg-footer:         #222222;
          --bg-best-odds:      #3a3a3a;

          --text-primary:      #e0e0e0;
          --text-secondary:    #aaaaaa;
          --text-muted:        #777777;
          --text-tagline:      #aaaaaa;
          --text-odds:         #e0e0e0;
          --text-poly:         #9b8fff;

          --border-main:       #4a4a4a;
          --border-light:      #404040;
          --border-best:       #4caf50;

          --accent-primary:    #e0e0e0;
          --accent-secondary:  #aaaaaa;
          --accent-bar:        #4caf50;
          --accent-bar-grad:   linear-gradient(90deg, #388e3c, #4caf50);
          --accent-bar-text:   #e0e0e0;
          --accent-highlight:  #4caf50;

          --tab-active-bg:     #e0e0e0;
          --tab-active-color:  #2b2b2b;

          --tipster-bg:        #444444;
          --tipster-count-col: #e0e0e0;

          --btn-bg:            #e0e0e0;
          --btn-color:         #2b2b2b;
          --btn-hamburger:     #e0e0e0;

          --wordmark-filter:   invert(1) brightness(1.15);
          --logo-filter:       invert(1) brightness(1.15);
        }

        /* ══════════════════════════════════════════════════
           RESET & BASE
           ══════════════════════════════════════════════════ */
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          letter-spacing: -0.01em;
          background: var(--bg-base);
          color: var(--text-primary);
          overflow-x: hidden;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .app-container { max-width: 1600px; margin: 0 auto; }

        /* ── HEADER ── */
        header {
          background: var(--bg-header);
          border-bottom: 1px solid var(--border-main);
          padding: 20px 30px;
          position: sticky; top: 0; z-index: 100;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          position: relative;
        }
        .header-content { display: flex; flex-direction: column; gap: 0; }
        .header-top-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 20px; width: 100%; }
        .header-left  { justify-self: start; }
        .header-center{ justify-self: center; }
        .header-right { display: flex; flex-direction: column; align-items: flex-end; }
        .tagline { font-size: 1.7rem; color: var(--text-tagline); font-weight: 500; padding-top: 8px; }
        .wordmark { width: 100mm; height: auto; filter: var(--wordmark-filter); transition: filter 0.2s; }
        .logo-center { height: 90px; width: auto; filter: var(--logo-filter); transition: filter 0.2s; }
        .logo-mobile { display: none; }
        .logo-desktop{ display: block; }

        /* ── NAV / HAMBURGER ── */
        .nav-menu-btn {
          background: none; border: none; cursor: pointer; padding: 6px;
          display: flex; flex-direction: column; gap: 5px;
          align-items: center; justify-content: center;
          flex-shrink: 0; align-self: flex-end;
        }
        .nav-menu-btn span {
          display: block; width: 22px; height: 2px;
          background: var(--btn-hamburger);
          border-radius: 2px; transition: all 0.2s;
        }
        .nav-menu-btn.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .nav-menu-btn.open span:nth-child(2) { opacity: 0; }
        .nav-menu-btn.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .nav-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 150; }
        .nav-overlay.open { display: block; }
        .nav-drawer {
          position: fixed; top: 0; right: -300px; width: 300px; height: 100vh;
          background: var(--bg-drawer); z-index: 160;
          transition: right 0.25s ease;
          box-shadow: -4px 0 20px rgba(0,0,0,0.18);
          display: flex; flex-direction: column;
        }
        .nav-drawer.open { right: 0; }
        .nav-drawer-header {
          padding: 20px 24px; border-bottom: 1px solid var(--border-main);
          font-weight: 700; font-size: 1rem; color: var(--text-primary); position: relative;
        }
        .nav-drawer-close {
          position: absolute; top: 20px; right: 20px; background: none; border: none;
          cursor: pointer; font-size: 1.3rem; color: var(--text-muted);
          line-height: 1; padding: 0; width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
        }
        .nav-drawer-close:hover { color: var(--text-primary); }
        .nav-drawer-links { display: flex; flex-direction: column; padding: 12px 0; flex: 1; }
        .nav-drawer-link {
          padding: 14px 24px; font-size: 1rem; color: var(--text-primary);
          text-decoration: none; font-weight: 500;
          border-bottom: 1px solid var(--bg-base);
          transition: background 0.1s;
        }
        .nav-drawer-link:hover { background: var(--bg-base); }
        .nav-drawer-link.active { color: var(--text-primary); font-weight: 700; }
        .nav-drawer-section {
          padding: 10px 24px 4px; font-size: 0.72rem; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--text-muted); font-weight: 600; margin-top: 8px;
        }
        .nav-drawer-footer {
          padding: 16px 24px; border-top: 1px solid var(--border-main);
          font-size: 0.78rem; color: var(--text-secondary);
        }

        /* ── THEME TOGGLE (inline in drawer header) ── */
        .nav-theme-row {
          display: flex; align-items: center; gap: 10px; margin-top: 12px;
        }
        .nav-theme-word {
          font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--text-muted);
        }
        .nav-theme-icons { display: flex; gap: 8px; align-items: center; }
        .nav-theme-icon-btn {
          background: none; border: 2px solid transparent;
          border-radius: 50%; padding: 2px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, transform 0.15s;
          line-height: 0;
        }
        .nav-theme-icon-btn:hover { transform: scale(1.15); }
        .nav-theme-icon-btn.active { border-color: var(--accent-primary); }

        /* ── ODDS FORMAT TOGGLE (inline in drawer header) ── */
        .nav-odds-btns {
          display: flex; border: 1.5px solid var(--border-main); border-radius: 6px; overflow: hidden;
        }
        .nav-odds-btn {
          flex: 1; background: none; border: none; border-right: 1px solid var(--border-main);
          padding: 5px 10px; font-size: 0.75rem; font-weight: 600;
          color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          letter-spacing: 0.01em;
        }
        .nav-odds-btn:last-child { border-right: none; }
        .nav-odds-btn:hover { background: var(--bg-base); color: var(--text-primary); }
        .nav-odds-btn.active {
          background: var(--accent-primary); color: var(--tab-active-color);
        }

        /* ── TABS ── */
        .tabs-row-desktop { display: flex; gap: 8px; margin-top: 8px; }
        .tabs-row-mobile  { display: none; }
        .tournament-tab {
          padding: 8px 16px;
          background: var(--bg-base);
          border: 1px solid var(--border-main);
          border-radius: 6px; font-size: 0.85rem; font-weight: 500;
          color: var(--text-secondary); cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .tournament-tab:hover { color: var(--text-primary); border-color: var(--accent-primary); }
        .tournament-tab.active {
          background: var(--tab-active-bg); color: var(--tab-active-color);
          border-color: var(--tab-active-bg); font-weight: 600;
        }

        /* ── COUNTDOWN ── */
        .countdown-container { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 0.85rem; }
        .countdown-label { color: var(--text-secondary); font-weight: 500; }
        .countdown-time  { font-weight: 700; font-family: 'Courier New', monospace; color: var(--text-primary); }

        /* ── PROMO ── */
        .promo-banner {
          flex: 1; overflow: hidden; position: relative; height: 36px;
          border-radius: 6px; border: 1px solid var(--border-main);
          background: var(--bg-promo);
        }
        .promo-track { position: relative; width: 100%; height: 100%; }
        .promo-card {
          display: flex; align-items: center; gap: 10px; padding: 0 16px; height: 36px;
          white-space: nowrap; text-decoration: none; color: var(--text-primary);
          font-size: 0.85rem; position: absolute; top: 0; left: 0; width: 100%;
          opacity: 0; transition: opacity 0.5s ease-in-out; pointer-events: none;
        }
        .promo-card.promo-active { opacity: 1; pointer-events: auto; }
        .promo-card:hover { background: var(--bg-surface); }
        .promo-card-label {
          background: var(--accent-primary); color: var(--tab-active-color);
          font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 3px;
          text-transform: uppercase; flex-shrink: 0;
        }
        .promo-card-label.book { background: #e07b00; color: #fff; }
        .promo-card-text { font-weight: 500; }
        .promo-dots { display: flex; gap: 4px; align-items: center; padding: 0 8px; flex-shrink: 0; }
        .promo-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--border-main); cursor: pointer; transition: background 0.2s; }
        .promo-dot.active { background: var(--accent-primary); }
        @media (max-width: 768px) { .promo-banner { display: none; } .promo-dots { display: none; } }

        /* ── TIPSTER MODAL ── */
        .tipster-ball {
          display: none; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 50%;
          background: var(--accent-primary); color: var(--tab-active-color);
          font-size: 0.7rem; font-weight: 700; flex-shrink: 0;
          margin-left: auto; margin-right: 8px; cursor: pointer;
        }
        @media (max-width: 768px) { .tipster-ball { display: inline-flex; } }
        .tipster-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 300;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .tipster-modal {
          background: var(--bg-drawer); border-radius: 12px; padding: 28px 32px;
          max-width: 360px; width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;
          border: 1px solid var(--border-main);
        }
        .tipster-modal-close {
          position: absolute; top: 14px; right: 16px; background: none; border: none;
          cursor: pointer; font-size: 1.2rem; color: var(--text-muted); line-height: 1; padding: 4px;
        }
        .tipster-modal-close:hover { color: var(--text-primary); }
        .tipster-modal-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 6px; }
        .tipster-modal-player { font-family: Georgia, serif; font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .tipster-modal-count { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px; }
        .tipster-modal-count span { font-weight: 700; color: var(--text-primary); }
        .tipster-modal-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .tipster-modal-handle {
          background: var(--bg-base); border: 1px solid var(--border-main);
          border-radius: 20px; padding: 5px 12px; font-size: 0.8rem; font-weight: 600; color: var(--text-primary);
        }

        /* ── PICKS CTA ── */
        .picks-cta { display: flex; align-items: center; flex-shrink: 0; }
        .picks-cta-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--btn-bg); color: var(--btn-color);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 0.78rem; font-weight: 700; padding: 0 14px; height: 36px;
          border-radius: 6px; text-decoration: none; white-space: nowrap; transition: opacity 0.15s;
        }
        .picks-cta-btn:hover { opacity: 0.85; }

        /* ── NOTICES ── */
        .notice { padding: 10px 30px; border-bottom: 1px solid; font-size: 0.85rem; }
        .notice-demo    { background: var(--bg-surface-alt); border-color: var(--border-main); color: var(--text-primary); }
        .notice-live    { background: #d4edda; border-color: #28a745; color: #155724; font-weight: 600; }
        .notice-loading { background: #fff3cd; border-color: #ffc107; color: #856404; }
        .notice-error   { background: #f8d7da; border-color: #dc3545; color: #721c24; }

        /* ── CONTROLS ── */
        .controls-bar {
          background: var(--bg-base); padding: 12px 30px;
          border-bottom: 1px solid var(--border-main);
          display: flex; align-items: center; gap: 16px;
        }
        .search-bar { position: relative; max-width: 300px; flex: 1; }
        .search-bar input {
          width: 100%; padding: 8px 12px 8px 34px;
          border: 1px solid var(--border-main); border-radius: 6px; font-size: 0.9rem;
          background: var(--bg-input); color: var(--text-primary);
        }
        .search-bar input:focus { outline: none; border-color: var(--accent-primary); }
        .search-bar input::placeholder { color: var(--text-muted); }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }

        /* ── TABLE ── */
        .odds-matrix-container {
          background: var(--bg-base); overflow-x: auto; overflow-y: auto;
          max-height: calc(100vh - 160px);
        }
        .odds-matrix { width: 100%; border-collapse: collapse; min-width: 800px; border: 1px solid var(--border-main); }
        .odds-matrix thead th {
          background: var(--bg-thead); padding: 8px 4px; text-align: center;
          font-weight: 600; font-size: 0.75rem; color: var(--text-primary);
          border-right: 1px solid var(--border-main); border-bottom: 1px solid var(--border-main);
          position: sticky; top: 0; z-index: 10;
        }
        .player-header {
          position: sticky; left: 0; top: 0; z-index: 11;
          background: var(--bg-thead); text-align: left; padding: 16px 20px;
          font-weight: 600; font-size: 0.75rem; color: var(--text-primary);
          border-right: 1px solid var(--border-main); border-bottom: 1px solid var(--border-main);
          width: 204px; min-width: 204px; max-width: 204px;
        }
        .player-header-content { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .header-separator { color: var(--border-main); }
        .sortable-header { cursor: pointer; user-select: none; color: var(--text-primary); }
        .sortable-header:hover { opacity: 0.7; }
        .sort-arrow { font-size: 0.8rem; opacity: 0.7; }
        .inline-sort { font-size: 0.75rem; font-weight: 600; }
        .poly-header { padding: 8px 4px; width: 42px; min-width: 42px; max-width: 42px; cursor: pointer; vertical-align: bottom; }
        .poly-cell { width: 42px; min-width: 42px; max-width: 42px; padding: 0 !important; position: relative; height: 36px; }
        .poly-link {
          display: flex; align-items: center; justify-content: center;
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          color: var(--text-poly); font-weight: 600; font-size: 0.88rem;
          text-decoration: none; transition: background 0.15s;
        }
        .poly-link:hover { background: rgba(128,128,128,0.1); font-weight: 700; }
        .owgr-header { font-size: 0.7rem; padding: 8px 6px; width: 56px; min-width: 56px; max-width: 56px; line-height: 1.2; cursor: pointer; color: var(--text-primary); }
        .owgr-header div { font-weight: 600; }
        .tipster-header { font-size: 1.4rem; cursor: pointer; padding: 12px 6px; width: 46px; min-width: 46px; max-width: 46px; }
        .bookmaker-header { display: flex; flex-direction: column; align-items: center; height: 150px; padding: 0; overflow: hidden; width: 100%; }
        .bookmaker-logo-wrapper { height: 118px; width: 100%; display: flex; align-items: center; justify-content: center; transform: rotate(270deg); overflow: hidden; padding: 0 1px; }
        .bookmaker-logo { width: 100%; height: 100%; object-fit: contain; display: block; }
        .ew-terms {
          height: 32px; display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; font-weight: 600; color: var(--text-primary);
          border-top: 1px solid var(--border-light); width: 100%;
        }
        .odds-matrix tbody tr { border-bottom: 1px solid var(--border-light); }
        .odds-matrix tbody tr:hover { background: var(--bg-cell-hover); }
        .odds-matrix tbody td {
          padding: 0; font-size: 0.9rem; text-align: center;
          border-right: 1px solid var(--border-light); height: 36px;
          color: var(--text-odds);
        }
        .odds-matrix tbody td:first-child {
          position: sticky; left: 0; background: var(--bg-cell-sticky); z-index: 1;
          text-align: left; padding: 0 0 0 20px;
          border-right: 1px solid var(--border-main);
          width: 204px; min-width: 204px; max-width: 204px; height: 36px;
          color: var(--text-primary);
        }
        .odds-matrix tbody tr:hover td:first-child { background: var(--bg-cell-hover); }
        .odds-matrix tbody tr:hover td.odds-cell.best-odds { background: var(--bg-cell-hover); }
        .player-cell {
          display: flex; align-items: center; gap: 8px; cursor: pointer;
          font-weight: 500; padding: 8px 0;
        }
        .expand-icon { color: var(--text-muted); flex-shrink: 0; }
        .player-name { white-space: nowrap; color: var(--text-primary); }
        .owgr-cell { width: 56px; font-weight: 600; color: var(--text-secondary); font-size: 0.85rem; }
        .tipster-cell { width: 46px; padding: 0 4px !important; }
        .tipster-bar-container {
          position: relative; width: 100%; height: 20px;
          background: var(--tipster-bg); border-radius: 3px; overflow: hidden; cursor: pointer;
        }
        .tipster-bar-container:hover { opacity: 0.85; }
        .tipster-bar { position: absolute; left: 0; top: 0; height: 100%; background: var(--accent-bar-grad); }
        .tipster-count { position: absolute; right: 3px; top: 50%; transform: translateY(-50%); font-size: 0.72rem; font-weight: 700; }
        .tipster-empty { color: var(--text-muted); }
        .odds-cell { padding: 0 !important; position: relative; height: 36px; }
        .odds-cell.best-odds {
          background: var(--bg-best-odds);
          box-shadow: inset 0 0 0 2.5px var(--accent-highlight);
          border-radius: 4px; z-index: 2; position: relative;
        }
        .best-odds .odds-link { font-weight: 700; border-radius: 4px; }
        .odds-link {
          display: flex; align-items: center; justify-content: center;
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          color: var(--text-odds); text-decoration: none; font-weight: 500; transition: background 0.15s;
        }
        .odds-link:hover { background: rgba(128,128,128,0.1); font-weight: 700; }
        .best-odds .odds-link:hover { background: rgba(128,128,128,0.15); }
        .best-odds-header { display: none; }
        .best-odds-cell-mobile { display: none; }
        .desktop-only { display: table-cell; }
        .mobile-only  { display: none; }

        /* ── EXPANDED ROW ── */
        .expanded-row td { padding: 0 !important; }
        .expanded-content { padding: 20px 25px; background: var(--bg-expanded); }
        .desktop-cards-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .desktop-info-card, .desktop-odds-card {
          background: var(--bg-card); border: 1px solid var(--border-main);
          border-radius: 6px; padding: 8px 10px; text-align: center; min-width: 85px;
        }
        .desktop-odds-card-clickable {
          text-decoration: none; color: inherit; cursor: pointer; display: flex;
          flex-direction: column; transition: transform 0.15s, box-shadow 0.15s;
        }
        .desktop-odds-card-clickable:hover {
          transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          border-color: var(--accent-primary);
        }
        .desktop-form-card { min-width: 260px; }
        .desktop-card-label    { font-size: 0.62rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; line-height: 1.2; }
        .desktop-card-sublabel { font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px; }
        .desktop-card-value    { font-size: 1rem; font-weight: 700; margin-top: 5px; color: var(--text-primary); }
        .desktop-card-odds     { font-size: 1.15rem; font-weight: 700; margin-top: 3px; color: var(--text-primary); }

        /* ── FORM BOXES ── */
        .form-boxes { display: flex; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
        .form-box {
          display: inline-block; padding: 5px 7px;
          border: 1px solid var(--border-light); border-right: none;
          font-size: 0.78rem; font-weight: 600; min-width: 34px; text-align: center;
        }
        .form-box:first-child { border-radius: 3px 0 0 3px; }
        .form-box:last-child  { border-right: 1px solid var(--border-light); border-radius: 0 3px 3px 0; }
        .form-box:only-child  { border-radius: 3px; border-right: 1px solid var(--border-light); }
        .form-box.finish-1      { background: #2D3748; color: white; }
        .form-box.finish-2-5    { background: #4A5568; color: white; }
        .form-box.finish-6-10   { background: #718096; color: white; }
        .form-box.finish-11-20  { background: #A0AEC0; color: #2D3748; }
        .form-box.finish-21-30  { background: #CBD5E0; color: #2D3748; }
        .form-box.finish-31-50  { background: #E2E8F0; color: #2D3748; }
        .form-box.finish-mc     { background: #f3f4f6; color: #6b7280; }
        .form-box.finish-other  { background: var(--bg-card); color: var(--text-primary); }

        .loading-state { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 1.1rem; }

        /* ── SKELETON LOADER ── */
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg,
            var(--bg-surface) 25%,
            var(--bg-surface-alt) 50%,
            var(--bg-surface) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        .skeleton-name { height: 14px; width: 130px; }
        .skeleton-cell { height: 14px; width: 28px; }
        .skeleton-bar  { height: 14px; width: 36px; }
        .skeleton-table tbody tr { height: 36px; }
        .skeleton-table tbody td { vertical-align: middle; }

        /* ── FOOTER ── */
        .site-footer {
          background: var(--bg-footer); border-top: 1px solid var(--border-main);
          padding: 40px 30px 30px; margin-top: 60px;
        }
        .footer-content { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
        .responsible-gambling { font-size: 0.9rem; color: var(--text-primary); line-height: 1.6; }
        .responsible-gambling strong { color: #d32f2f; }
        .responsible-gambling a { color: var(--text-primary); font-weight: 600; }
        .affiliate-notice { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; }
        .footer-links { display: flex; justify-content: center; flex-wrap: wrap; gap: 14px; }
        .footer-link { color: var(--text-primary); text-decoration: none; font-size: 0.88rem; font-weight: 500; }
        .footer-link:hover { text-decoration: underline; }
        .footer-separator { color: var(--border-main); }
        .footer-logos { display: flex; justify-content: center; align-items: center; gap: 14px; padding: 16px 0; border-top: 1px solid var(--border-main); border-bottom: 1px solid var(--border-main); }
        .gamcare-text { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
        .footer-odds-format { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px 0; border-top: 1px solid var(--border-main); border-bottom: 1px solid var(--border-main); }
        .footer-odds-format label { font-size: 0.88rem; color: var(--text-secondary); font-weight: 500; }
        .footer-odds-dropdown {
          padding: 6px 12px; border: 1px solid var(--border-main); border-radius: 6px;
          font-size: 0.88rem; background: var(--bg-input); color: var(--text-primary); cursor: pointer;
        }
        .footer-odds-dropdown:focus { outline: none; border-color: var(--accent-primary); }
        .footer-copyright p { font-size: 0.82rem; color: var(--text-muted); text-align: center; }

        .desktop-expanded-view { display: block; }
        .mobile-panes-wrapper  { display: none; }

        @media (max-width: 768px) {
          header { padding: 10px 15px 0 15px !important; }
          .header-content { display: flex !important; flex-direction: column !important; gap: 0 !important; width: 100% !important; }
          .header-top-row { display: flex !important; align-items: center !important; width: 100% !important; padding-bottom: 10px !important; }
          .header-left  { flex: 1 !important; display: flex !important; align-items: center !important; justify-content: flex-start !important; }
          .header-center { flex: 0 !important; display: flex !important; justify-content: center !important; }
          .header-right { flex: 1 !important; display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-end !important; }
          .tabs-row-mobile  { display: flex !important; width: 100% !important; justify-content: center !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; padding: 0 0 10px !important; gap: 4px !important; }
          .tabs-row-desktop { display: none !important; }
          .tournament-tab { padding: 6px 10px !important; font-size: 0.7rem !important; flex-shrink: 0 !important; }
          .tagline { display: none !important; }
          .countdown-container { display: none !important; }
          .wordmark { height: auto !important; max-width: 128px !important; }
          .logo-mobile { height: 32px !important; width: auto !important; display: block !important; }
          .logo-desktop { display: none !important; }
          .controls-bar { padding: 10px 15px; }
          .search-bar { max-width: 100%; }
          .odds-matrix-container { max-height: none !important; overflow-y: visible !important; }
          .odds-matrix thead th { position: static !important; top: auto !important; }
          .player-header { position: static !important; top: auto !important; left: auto !important; }
          .odds-matrix thead th:not(:first-child):not(.best-odds-header) { display: none; }
          .odds-matrix tbody td:not(:first-child):not(.best-odds-cell-mobile) { display: none; }
          .desktop-only { display: none !important; }
          .mobile-only  { display: table-cell !important; }
          .odds-matrix thead th:first-child { width: auto !important; min-width: unset !important; max-width: unset !important; position: relative; left: 0; }
          .odds-matrix tbody td:first-child  { min-width: unset !important; max-width: unset !important; width: auto !important; }
          .odds-matrix tbody td { height: 44px !important; }
          .odds-matrix tbody td:first-child { height: 44px !important; }
          .best-odds-header { display: table-cell !important; width: 28vw; max-width: 110px; text-align: center; position: static !important; color: var(--text-primary); }
          .odds-matrix { table-layout: fixed; width: 100%; min-width: unset !important; }
          .odds-matrix-container { overflow-x: hidden; }
          .best-odds-cell-mobile { display: table-cell !important; font-size: 1.1rem; font-weight: 700; cursor: pointer; padding: 0 8px !important; color: var(--text-primary); }
          .expanded-content { padding: 0 !important; }
          .expanded-cell { max-width: 100vw !important; width: 100vw !important; padding: 0 !important; }
          .expanded-row { display: block !important; }
          .desktop-expanded-view { display: none; }
          .mobile-panes-wrapper { display: block; width: 100vw; overflow: hidden; }
          .mobile-tabs-container { display: flex; overflow-x: scroll; scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
          .mobile-tabs-container::-webkit-scrollbar { display: none; }
          .mobile-tab-pane { flex: 0 0 100vw; width: 100vw; scroll-snap-align: start; scroll-snap-stop: always; padding: 18px 16px; box-sizing: border-box; background: var(--bg-expanded); }
          .mobile-pane-title { font-size: 1rem; font-weight: 700; margin-bottom: 14px; text-align: center; color: var(--text-primary); }
          .mobile-bookmaker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mobile-bookmaker-card { background: var(--bg-card); border: 2px solid var(--border-main); border-radius: 8px; padding: 12px; text-align: center; text-decoration: none; color: inherit; display: block; }
          .mobile-bookmaker-card.best { background: var(--bg-best-odds); border-color: var(--accent-highlight); border-width: 3px; }
          .mobile-bookmaker-name { font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 5px; font-weight: 600; }
          .mobile-bookmaker-odds { font-size: 1.35rem; font-weight: 700; margin-bottom: 3px; color: var(--text-primary); }
          .mobile-bookmaker-ew   { font-size: 0.68rem; color: var(--text-muted); }
          .mobile-extra-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mobile-extra-card { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 8px; padding: 12px; text-align: center; text-decoration: none; color: inherit; }
          .mobile-extra-label     { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; font-weight: 700; }
          .mobile-extra-bookmaker { font-size: 0.68rem; color: var(--text-secondary); margin-bottom: 5px; }
          .mobile-extra-odds      { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
          .mobile-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mobile-stat-card { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 8px; padding: 12px; text-align: center; }
          .mobile-stat-full-width { grid-column: 1 / -1; }
          .mobile-stat-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 7px; font-weight: 600; }
          .mobile-stat-value { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
          .mobile-swipe-indicator { display: flex; justify-content: center; gap: 8px; padding: 12px; border-top: 1px solid var(--border-light); background: var(--bg-expanded); }
          .swipe-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border-main); }
          .swipe-dot.active { background: var(--text-secondary); }
          .footer-odds-format { flex-direction: column; gap: 10px; }
          .footer-links { flex-direction: column; align-items: center; gap: 10px; }
          .footer-separator { display: none; }
          .site-footer { padding: 28px 18px 20px; margin-top: 30px; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header>
        <div className={`nav-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />
        <nav className={`nav-drawer${menuOpen ? ' open' : ''}`}>
          <div className="nav-drawer-header">
            <img src={wordmarkImg} alt="The Fairway" style={{height:'28px',width:'auto',filter:'var(--wordmark-filter)'}} />
            <button className="nav-drawer-close" onClick={() => setMenuOpen(false)}>✕</button>
            <div className="nav-theme-row">
              <span className="nav-theme-word">Format</span>
              <div className="nav-theme-icons">
                <button
                  className={`nav-theme-icon-btn${theme === 'light' ? ' active' : ''}`}
                  onClick={() => setTheme('light')}
                  aria-label="Light mode"
                  title="Light"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="9" fill="white" stroke="#cccccc" strokeWidth="1.5"/>
                  </svg>
                </button>
                <button
                  className={`nav-theme-icon-btn${theme === 'grey' ? ' active' : ''}`}
                  onClick={() => setTheme('grey')}
                  aria-label="Grey mode"
                  title="Grey"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="9" fill="#888888" stroke="#555555" strokeWidth="1.5"/>
                    <path d="M10 1 A9 9 0 0 1 10 19 Z" fill="white"/>
                  </svg>
                </button>
                <button
                  className={`nav-theme-icon-btn${theme === 'dark' ? ' active' : ''}`}
                  onClick={() => setTheme('dark')}
                  aria-label="Dark mode"
                  title="Dark"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="9" fill="#222222" stroke="#555555" strokeWidth="1.5"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="nav-theme-row">
              <span className="nav-theme-word">Odds</span>
              <div className="nav-odds-btns">
                {[['decimal','1.5'],['fractional','1/2'],['american','-200']].map(([val, label]) => (
                  <button
                    key={val}
                    className={`nav-odds-btn${oddsFormat === val ? ' active' : ''}`}
                    onClick={() => { setOddsFormat(val); localStorage.setItem('oddsFormat', val); }}
                    aria-pressed={oddsFormat === val}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="nav-drawer-links">
            <a href="/" className="nav-drawer-link active">Odds Comparison</a>
            <div className="nav-drawer-section">Blog</div>
            <a href="/blog" className="nav-drawer-link">All Articles</a>
            <a href="/blog/masters-2026-outsiders" className="nav-drawer-link">Masters 2026 Outsiders</a>
          </div>

          <div className="nav-drawer-footer">18+ | BeGambleAware.org</div>
        </nav>
        <div className="header-content">
          <div className="header-top-row">
            <div className="header-left"><img src={wordmarkImg} alt="The Fairway" className="wordmark" /></div>
            <div className="header-center">
              <img src={logoImg} alt="The Fairway Logo" className="logo-center logo-desktop" />
              <img src={logoImg} alt="The Fairway Logo" className="logo-center logo-mobile" />
            </div>
            <div className="header-right">
              <button className={`nav-menu-btn${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                <span /><span /><span />
              </button>
              <div className="tagline">Better Odds. Better Bets.</div>
              <div className="countdown-container">
                <span className="countdown-label">Countdown to The Masters:</span>
                <span className="countdown-time">{countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s</span>
              </div>
              <div className="tabs-row-desktop">
                {MAJORS.map((m) => (
                  <button key={m.id} className={`tournament-tab${selectedTournament.id === m.id ? ' active' : ''}`} onClick={() => setSelectedTournament(m)}>{m.name}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="tabs-row-mobile">
            {MAJORS.map((m) => (
              <button key={m.id} className={`tournament-tab${selectedTournament.id === m.id ? ' active' : ''}`} onClick={() => setSelectedTournament(m)}>{m.name}</button>
            ))}
          </div>
        </div>
      </header>

      {/* ── NOTICES ── */}


      {/* ── CONTROLS ── */}
      <div className="controls-bar">
        <div className="search-bar">
          <Search className="search-icon" size={16} />
          <input id="player-search" name="player-search" type="text" placeholder={`Search ${sorted.length} players...`} value={filterText} onChange={(e) => setFilterText(e.target.value)} />
        </div>
        <div className="promo-banner">
          <div className="promo-track">
            {PROMO_ITEMS.map((item, i) => (
              <a key={i} href={item.url} target={item.url !== '#' ? '_blank' : '_self'} rel="noopener noreferrer" className={`promo-card${promoIndex === i ? ' promo-active' : ''}`}>
                <span className={`promo-card-label ${item.labelClass}`}>{item.label}</span>
                <span className="promo-card-text">{item.text}</span>
              </a>
            ))}
          </div>
        </div>
        {tipsterModal && (
          <div className="tipster-modal-overlay" onClick={() => setTipsterModal(null)}>
            <div className="tipster-modal" onClick={e => e.stopPropagation()}>
              <button className="tipster-modal-close" onClick={() => setTipsterModal(null)}>✕</button>
              <div className="tipster-modal-title">Tipster Consensus</div>
              <div className="tipster-modal-player">{tipsterModal.name}</div>
              <div className="tipster-modal-count">Tipped by <span>{tipsterModal.picks.length} tipster{tipsterModal.picks.length !== 1 ? 's' : ''}</span></div>
              <div className="tipster-modal-list">
                {tipsterModal.picks.map((handle, i) => <span key={i} className="tipster-modal-handle">{handle}</span>)}
              </div>
            </div>
          </div>
        )}
        <div className="picks-cta"><a href="/picks" className="picks-cta-btn">Get picks &#8250;</a></div>
        <div className="promo-dots">
          {PROMO_ITEMS.map((_, i) => <span key={i} className={`promo-dot${promoIndex === i ? ' active' : ''}`} onClick={() => setPromoIndex(i)} />)}
        </div>
      </div>

      {/* ── TABLE ── */}
      {sheetLoading ? (
        <div className="odds-matrix-container">
          <table className="odds-matrix skeleton-table">
            <thead>
              <tr>
                <th className="player-header"><div className="skeleton skeleton-name" /></th>
                <th className="owgr-header desktop-only"><div className="skeleton skeleton-cell" /></th>
                <th className="tipster-header desktop-only"><div className="skeleton skeleton-cell" /></th>
                <th className="poly-header desktop-only"><div className="skeleton skeleton-cell" /></th>
                {BOOKMAKERS.map((_, i) => <th key={i} style={{width:'42px'}}><div className="skeleton skeleton-cell" /></th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({length: 14}).map((_, i) => (
                <tr key={i}>
                  <td><div style={{padding:'8px 0 8px 20px'}}><div className="skeleton skeleton-name" /></div></td>
                  <td className="desktop-only"><div className="skeleton skeleton-cell" style={{margin:'0 auto'}} /></td>
                  <td className="desktop-only"><div className="skeleton skeleton-bar" style={{margin:'0 6px'}} /></td>
                  <td className="desktop-only"><div className="skeleton skeleton-cell" style={{margin:'0 auto'}} /></td>
                  {BOOKMAKERS.map((_, j) => (
                    <td key={j}><div className="skeleton skeleton-cell" style={{margin:'0 auto'}} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="odds-matrix-container">
          <table className="odds-matrix">
            <thead>
              <tr>
                <th className="player-header">
                  <div className="player-header-content">
                    <div style={{display:'flex',alignItems:'center',gap:'6px',flex:1}}>
                      <SortBtn sortKey="name"    label="Surname" className="inline-sort" />
                      <span className="header-separator">|</span>
                      <SortBtn sortKey="avgOdds" label="Price"  className="inline-sort" />
                    </div>
                    <span className="mobile-only" style={{marginRight:'8px'}}>
                      <SortBtn sortKey="tipsterPicks" label="🎯" className="inline-sort" />
                    </span>
                  </div>
                </th>
                <th className="owgr-header desktop-only" onClick={() => handleSort('owgr')}>
                  <div>World</div><div>Ranking</div>
                  {sortConfig.key === 'owgr' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="tipster-header desktop-only" onClick={() => handleSort('tipsterPicks')} title="Tipster Consensus">
                  <div className="bookmaker-header">
                    <div className="bookmaker-logo-wrapper">
                      <img src="/tipster-icon.png" alt="Tipsters" className="bookmaker-logo" style={{filter:'var(--wordmark-filter)'}} onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                      <span style={{display:'none',fontSize:'0.6rem',fontWeight:700,textAlign:'center'}}>TIPS</span>
                    </div>
                  </div>
                  {sortConfig.key === 'tipsterPicks' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="poly-header desktop-only" onClick={() => handleSort('polyOdds')} title="Polymarket implied odds">
                  <div className="bookmaker-header">
                    <div className="bookmaker-logo-wrapper">
                      <img src="/logos/polymarket.png" alt="Polymarket" className="bookmaker-logo" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                      <span style={{display:'none',fontSize:'0.6rem',fontWeight:700,textAlign:'center'}}>POLY</span>
                    </div>
                  </div>
                </th>
                {bookmakers.map((bm, i) => (
                  <th key={i} style={{width:'42px',minWidth:'42px',maxWidth:'42px'}}>
                    <div className="bookmaker-header">
                      <div className="bookmaker-logo-wrapper">
                        <img src={`/logos/${bm.logo}`} alt={bm.name} className="bookmaker-logo" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                        <span style={{display:'none',fontSize:'0.55rem',fontWeight:700,textAlign:'center',lineHeight:'1.2',color:'var(--text-primary)',writingMode:'vertical-rl',transform:'rotate(180deg)',whiteSpace:'nowrap'}}>{bm.name}</span>
                      </div>
                      <div className="ew-terms">{getEwTerms(bm.name)}</div>
                    </div>
                  </th>
                ))}
                <th className="best-odds-header mobile-only">Best</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, idx) => {
                const outrightVals = bookmakers.map((b) => player.bookmakerOdds?.[b.name]?.outright).filter(Number.isFinite);
                const bestOdds = outrightVals.length ? Math.max(...outrightVals) : null;

                return (
                  <React.Fragment key={idx}>
                    <tr>
                      <td>
                        <div className="player-cell" onClick={() => { setExpandedPlayer(expandedPlayer === player.name ? null : player.name); setActiveMobilePane(0); }}>
                          {expandedPlayer === player.name ? <ChevronUp className="expand-icon" size={16} /> : <ChevronDown className="expand-icon" size={16} />}
                          <span className="player-name">{player.name}</span>
                          {(() => {
                            const tKey = Object.keys(tipsterPicksMap).find(k => norm(k) === norm(player.name));
                            const picks = tKey ? tipsterPicksMap[tKey] : [];
                            return picks.length > 0 ? (
                              <span className="tipster-ball" onClick={e => { e.stopPropagation(); setTipsterModal({ name: player.name, picks }); }}>{picks.length}</span>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className="owgr-cell desktop-only">{player.owgr ?? '-'}</td>
                      <td className="tipster-cell desktop-only">
                        {(() => {
                          const tKey = Object.keys(tipsterPicksMap).find(k => norm(k) === norm(player.name));
                          const picks = tKey ? tipsterPicksMap[tKey] : [];
                          return picks.length > 0 ? (
                            <div className="tipster-bar-container" onClick={() => setTipsterModal({ name: player.name, picks })} title="Number of tipsters backing this player">
                              <div className="tipster-bar" style={{ width: `${Math.min((picks.length / derivedMaxTips) * 70, 70)}%` }} />
                              <span className="tipster-count" style={{ color: 'var(--tipster-count-col)' }}>{picks.length}</span>
                            </div>
                          ) : <div className="tipster-empty">-</div>;
                        })()}
                      </td>
                      {(() => {
                        const polyKey = Object.keys(polyOddsMap).find(k => norm(k) === norm(player.name));
                        const polyVal = polyKey ? polyOddsMap[polyKey] : null;
                        return (
                          <td className="poly-cell desktop-only">
                            {polyVal ? (
                              isUS
                                ? <a href={POLYMARKET_URL} target="_blank" rel="noopener noreferrer" className="poly-link">{formatOdds(polyVal)}</a>
                                : <span className="poly-link" style={{cursor:'default',opacity:0.6}}>{formatOdds(polyVal)}</span>
                            ) : <span style={{color:'var(--text-muted)'}}>-</span>}
                          </td>
                        );
                      })()}
                      {bookmakers.map((bm, bIdx) => {
                        const val = player.bookmakerOdds?.[bm.name]?.outright;
                        const isBest = val === bestOdds && bestOdds !== null;
                        return (
                          <td key={bIdx} className={`odds-cell${isBest ? ' best-odds' : ''}`}>
                            <a href={AFFILIATE_LINKS[bm.name] || '#'} target="_blank" rel="noopener noreferrer" className="odds-link"
                               onClick={() => window.gtag?.('event','bookmaker_click',{ bookmaker: bm.name, player: player.name, odds: val, tournament: selectedTournament.name })}>
                              {formatOdds(val)}
                            </a>
                          </td>
                        );
                      })}
                      <td className="odds-cell best-odds-cell-mobile" onClick={() => { setExpandedPlayer(expandedPlayer === player.name ? null : player.name); setActiveMobilePane(0); }}>
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
                                  <div className="desktop-card-value">{lookupNationality(nationalityMap, player.name)}</div>
                                </div>
                                <div className="desktop-info-card">
                                  <div className="desktop-card-label">World Ranking</div>
                                  <div className="desktop-card-value">{player.owgr ?? 'N/A'}</div>
                                </div>
                                {player.recentForm?.length > 0 && (
                                  <div className="desktop-info-card desktop-form-card">
                                    <div className="desktop-card-label">Recent Form</div>
                                    <div className="form-boxes">
                                      {(() => {
                                        const key = lookupByName(currentFormMap, player.name);
                                        const raw = key ? currentFormMap[key] : [];
                                        const played = raw.filter(p => p !== '-' && p !== '').reverse();
                                        const first7 = played.slice(0, 7);
                                        while (first7.length < 7) first7.push('-');
                                        return first7.map((p, i) => (
                                          <span key={i} className={`form-box ${getFinishClass(p)}`}>{p === '-' ? '-' : String(p).replace('T','')}</span>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                )}
                                {player.courseHistory && (
                                  <div className="desktop-info-card desktop-form-card">
                                    <div className="desktop-card-label">Event Form</div>
                                    <div className="form-boxes">
                                      {(() => {
                                        const key = lookupByName(majorFormMap, player.name);
                                        const results = key ? majorFormMap[key] : [];
                                        if (!results || results.length === 0) return <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>No data</span>;
                                        return results.map((p, i) => (
                                          <span key={i} className={`form-box ${getFinishClass(p)}`}>{String(p).replace('T','')}</span>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                )}
                                {['top5','top10','top20','top30','top40','r1Leader'].map((mkt) => {
                                  const LABELS = { top5:'Top 5', top10:'Top 10', top20:'Top 20', top30:'Top 30', top40:'Top 40', r1Leader:'R1 Leader' };
                                  const candidates = bookmakers.map((b) => ({ name: b.name, odds: player.bookmakerOdds?.[b.name]?.[mkt], url: AFFILIATE_LINKS[b.name] })).filter((o) => o.odds && o.odds !== 'N/A');
                                  const best = candidates.length ? candidates.reduce((mx, c) => c.odds > mx.odds ? c : mx, candidates[0]) : null;
                                  return best ? (
                                    <a key={mkt} href={best.url} target="_blank" rel="noopener noreferrer" className="desktop-odds-card desktop-odds-card-clickable"
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

                            <div className="mobile-panes-wrapper">
                              <div className="mobile-tabs-container" onScroll={(e) => setActiveMobilePane(Math.round(e.target.scrollLeft / e.target.offsetWidth))}>
                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Best Prices</h3>
                                  <div className="mobile-bookmaker-grid">
                                    {bookmakers.map((bm) => ({ bm, v: player.bookmakerOdds?.[bm.name]?.outright }))
                                      .filter(({ v }) => v && Number.isFinite(v))
                                      .sort((a, b) => b.v - a.v)
                                      .slice(0, 6)
                                      .map(({ bm, v }, i) => (
                                        <a key={i} href={AFFILIATE_LINKS[bm.name]} target="_blank" rel="noopener noreferrer" className={`mobile-bookmaker-card${v === bestOdds ? ' best' : ''}`}>
                                          <div className="mobile-bookmaker-name">{bm.name}</div>
                                          <div className="mobile-bookmaker-odds">{formatOdds(v)}</div>
                                          <div className="mobile-bookmaker-ew">{getEwTerms(bm.name)} places</div>
                                        </a>
                                      ))}
                                  </div>
                                </div>
                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Extra Odds</h3>
                                  <div className="mobile-extra-grid">
                                    {['top5','top10','top20','top30','top40','makeCut'].map((mkt, mi) => {
                                      const LABELS = { top5:'Top 5', top10:'Top 10', top20:'Top 20', top30:'Top 30', top40:'Top 40', makeCut:'Make Cut' };
                                      const candidates = bookmakers.map((b) => ({ name: b.name, odds: player.bookmakerOdds?.[b.name]?.[mkt], url: AFFILIATE_LINKS[b.name] })).filter((o) => o.odds && o.odds !== 'N/A');
                                      const best = candidates.length ? candidates.reduce((mx,c) => c.odds > mx.odds ? c : mx, candidates[0]) : null;
                                      return best ? (
                                        <a key={mi} href={best.url} target="_blank" rel="noopener noreferrer" className="mobile-extra-card">
                                          <div className="mobile-extra-label">{LABELS[mkt]}</div>
                                          <div className="mobile-extra-bookmaker">{best.name}</div>
                                          <div className="mobile-extra-odds">{formatOdds(best.odds)}</div>
                                        </a>
                                      ) : (
                                        <div key={mi} className="mobile-extra-card" style={{opacity:0.4}}>
                                          <div className="mobile-extra-label">{LABELS[mkt]}</div>
                                          <div className="mobile-extra-bookmaker">-</div>
                                          <div className="mobile-extra-odds">N/A</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="mobile-tab-pane">
                                  <h3 className="mobile-pane-title">Player Stats</h3>
                                  <div className="mobile-stats-grid">
                                    <div className="mobile-stat-card">
                                      <div className="mobile-stat-label">Nationality</div>
                                      <div className="mobile-stat-value">{lookupNationality(nationalityMap, player.name)}</div>
                                    </div>
                                    <div className="mobile-stat-card">
                                      <div className="mobile-stat-label">World Ranking</div>
                                      <div className="mobile-stat-value">{player.owgr ?? 'N/A'}</div>
                                    </div>
                                    {lookupByName(currentFormMap, player.name) && (
                                      <div className="mobile-stat-card mobile-stat-full-width">
                                        <div className="mobile-stat-label">Recent Form</div>
                                        <div className="form-boxes">
                                          {(() => {
                                            const key = lookupByName(currentFormMap, player.name);
                                            const raw = key ? currentFormMap[key] : [];
                                            const played = raw.filter(p => p !== '-' && p !== '').reverse();
                                            const first7 = played.slice(0, 7);
                                            while (first7.length < 7) first7.push('-');
                                            return first7.map((p, i) => (
                                              <span key={i} className={`form-box ${getFinishClass(p)}`}>{p === '-' ? '-' : String(p).replace('T','')}</span>
                                            ));
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                    {lookupByName(majorFormMap, player.name) && (
                                      <div className="mobile-stat-card mobile-stat-full-width">
                                        <div className="mobile-stat-label">Event Form</div>
                                        <div className="form-boxes">
                                          {(() => {
                                            const key = lookupByName(majorFormMap, player.name);
                                            const results = key ? majorFormMap[key] : [];
                                            return results.map((p, i) => (
                                              <span key={i} className={`form-box ${getFinishClass(p)}`}>{String(p).replace('T','')}</span>
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
            <select id="odds-format" name="odds-format" value={oddsFormat}
              onChange={(e) => { setOddsFormat(e.target.value); localStorage.setItem('oddsFormat', e.target.value); }}
              className="footer-odds-dropdown">
              <option value="decimal">Decimal (6.50)</option>
              <option value="fractional">Fractional (11/2)</option>
              <option value="american">American (+550)</option>
            </select>
          </div>
          <div className="footer-links">
            <a href="/terms"                className="footer-link">Terms &amp; Conditions</a>
            <span className="footer-separator">|</span>
            <a href="/privacy"              className="footer-link">Privacy Policy</a>
            <span className="footer-separator">|</span>
            <a href="/responsible-gambling" className="footer-link">Responsible Gambling</a>
            <span className="footer-separator">|</span>
            <a href="/contact"              className="footer-link">Contact</a>
          </div>
          <div className="footer-logos">
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer"><span className="gamcare-text">BeGambleAware</span></a>
            <span className="footer-separator">|</span>
            <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer"><span className="gamcare-text">GamCare</span></a>
          </div>
          <div className="footer-copyright"><p>© 2025 The Fairway. All rights reserved.</p></div>
        </div>
      </footer>
    </div>
  );
}
