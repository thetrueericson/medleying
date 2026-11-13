import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Music,
  Search,
  Download,
  RotateCcw,
  Scissors,
  Gauge,
  ArrowUp,
  ArrowDown,
  Copy,
  Sparkles,
  Check,
  Clock,
  SlidersHorizontal,
  Youtube,
  Link,
  ExternalLink,
  Video,
  BookmarkCheck,
  Activity,
  FileCode,
  FileText,
  SkipForward,
  SkipBack,
  TrendingUp,
  Zap,
  FastForward,
  Volume2
} from 'lucide-react';

// Declare YouTube IFrame API on window
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// --- Transition Model between two consecutive blocks ---
export interface TransitionConfig {
  duration: number; // in seconds (fondu / transition)
  curve: 'linear' | 'exponential' | 'instant'; // forme de l'accélération
  bpmRamp: boolean; // activer le rattrapage progressif du BPM
}

// --- Track Block Model ---
export interface TrackBlock {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: number; // in seconds
  estimatedBpm: number;
  startTime: number; // crop start in seconds
  endTime: number; // crop end in seconds
  speed: number; // 0.5 to 1.5
  volume: number; // 0 to 1
  color: string;
  youtubeId: string;
  youtubeUrl: string;
  youtubeThumbnail: string;
  waveformPeaks: number[];
  showVideo: boolean;
}

// Format seconds into MM:SS or MM:SS.s
function formatTime(sec: number, showMs: boolean = false): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return showMs ? `${mm}:${ss}.${ms}` : `${mm}:${ss}`;
}

// Extract YouTube Video ID from any URL
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regex);
  return match ? match[1] : null;
}

// Generate realistic musical waveform peaks
function generateStructuredPeaks(bpm: number, duration: number, seed: string): number[] {
  const points = 90;
  const peaks: number[] = [];
  const hash = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  for (let i = 0; i < points; i++) {
    const progress = i / points;
    const introEnv = Math.min(1.0, progress * 4);
    const outroEnv = Math.min(1.0, (1 - progress) * 4);
    const chorusPulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 6 + (hash % 10));
    const randomVariation = Math.sin(i * 1.7 + hash) * 0.25 + Math.cos(i * 3.1) * 0.15;

    let height = (0.35 + chorusPulse * 0.4 + randomVariation) * introEnv * outroEnv;
    height = Math.max(0.12, Math.min(1.0, height));
    peaks.push(height);
  }
  return peaks;
}

// Default 4 tracks requested by the user
const INITIAL_BLOCKS: TrackBlock[] = [
  {
    id: 'block-1',
    title: 'Game of Thrones (Main Theme)',
    artist: 'Ramin Djawadi',
    genre: 'Intro Épique & Royale',
    duration: 118,
    estimatedBpm: 85,
    startTime: 10,
    endTime: 45,
    speed: 1.0,
    volume: 1.0,
    color: '#f59e0b',
    youtubeId: 'TZE9gVF1QbA',
    youtubeUrl: 'https://www.youtube.com/watch?v=TZE9gVF1QbA',
    youtubeThumbnail: 'https://img.youtube.com/vi/TZE9gVF1QbA/hqdefault.jpg',
    waveformPeaks: generateStructuredPeaks(85, 118, 'TZE9gVF1QbA'),
    showVideo: true,
  },
  {
    id: 'block-2',
    title: 'Chandelier',
    artist: 'Sia',
    genre: 'Pop Électrisante',
    duration: 232,
    estimatedBpm: 117,
    startTime: 40,
    endTime: 80,
    speed: 1.0,
    volume: 1.0,
    color: '#ec4899',
    youtubeId: '2vjPBrBU-TM',
    youtubeUrl: 'https://www.youtube.com/watch?v=2vjPBrBU-TM',
    youtubeThumbnail: 'https://img.youtube.com/vi/2vjPBrBU-TM/hqdefault.jpg',
    waveformPeaks: generateStructuredPeaks(117, 232, '2vjPBrBU-TM'),
    showVideo: true,
  },
  {
    id: 'block-3',
    title: 'Mambo No. 5 (A Little Bit of...)',
    artist: 'Lou Bega',
    genre: 'Mambo Latino Festif',
    duration: 220,
    estimatedBpm: 174,
    startTime: 25,
    endTime: 65,
    speed: 1.0,
    volume: 1.0,
    color: '#8b5cf6',
    youtubeId: 'EK_LN3XEcnw',
    youtubeUrl: 'https://www.youtube.com/watch?v=EK_LN3XEcnw',
    youtubeThumbnail: 'https://img.youtube.com/vi/EK_LN3XEcnw/hqdefault.jpg',
    waveformPeaks: generateStructuredPeaks(174, 220, 'EK_LN3XEcnw'),
    showVideo: true,
  },
  {
    id: 'block-4',
    title: 'Jailhouse Rock',
    artist: 'Elvis Presley',
    genre: 'Rock\'n\'Roll Vintage',
    duration: 153,
    estimatedBpm: 168,
    startTime: 15,
    endTime: 55,
    speed: 1.0,
    volume: 1.0,
    color: '#06b6d4',
    youtubeId: 'gj0Rz-uP4Mk',
    youtubeUrl: 'https://www.youtube.com/watch?v=gj0Rz-uP4Mk',
    youtubeThumbnail: 'https://img.youtube.com/vi/gj0Rz-uP4Mk/hqdefault.jpg',
    waveformPeaks: generateStructuredPeaks(168, 153, 'gj0Rz-uP4Mk'),
    showVideo: true,
  },
];

// Default transitions between consecutive blocks
const INITIAL_TRANSITIONS: Record<number, TransitionConfig> = {
  0: { duration: 2.5, curve: 'exponential', bpmRamp: true },
  1: { duration: 2.0, curve: 'linear', bpmRamp: true },
  2: { duration: 1.5, curve: 'instant', bpmRamp: false },
};

export default function App() {
  const [blocks, setBlocks] = useState<TrackBlock[]>(INITIAL_BLOCKS);
  const [transitions, setTransitions] = useState<Record<number, TransitionConfig>>(INITIAL_TRANSITIONS);

  // --- Top Master Medley Player State ---
  const masterPlayerRef = useRef<any>(null);
  const [isMasterPlaying, setIsMasterPlaying] = useState<boolean>(false);
  const [masterActiveIndex, setMasterActiveIndex] = useState<number>(0);
  const [masterGlobalTime, setMasterGlobalTime] = useState<number>(0); // 0 to totalMedleyDuration
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const masterMonitorTimerRef = useRef<number | null>(null);

  // --- Individual Block Players Dictionary ---
  const blockPlayersRef = useRef<Record<string, any>>({});
  const [playingBlockId, setPlayingBlockId] = useState<string | null>(null);
  const [blockCurrentTime, setBlockCurrentTime] = useState<Record<string, number>>({});
  const blockMonitorTimerRef = useRef<number | null>(null);

  // --- UI & Search States ---
  const [ytApiReady, setYtApiReady] = useState<boolean>(false);
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
  const [isSearching, setIsSearching] = useState<Record<string, boolean>>({});
  const tapTimesRef = useRef<Record<string, number[]>>({});

  // --- Export Modal ---
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [copiedCue, setCopiedCue] = useState<boolean>(false);

  // --- Calculate Segments Durations & Cumulative Offsets ---
  const blockSegments = useMemo(() => {
    let accumulated = 0;
    return blocks.map((block) => {
      const segDuration = Math.max(0.1, (block.endTime - block.startTime) / (block.speed || 1));
      const startGlobal = accumulated;
      accumulated += segDuration;
      const endGlobal = accumulated;
      return {
        ...block,
        segDuration,
        startGlobal,
        endGlobal,
      };
    });
  }, [blocks]);

  const totalMedleyDuration = useMemo(() => {
    return blockSegments.reduce((acc, b) => acc + b.segDuration, 0);
  }, [blockSegments]);

  // --- Initialize YouTube IFrame API ---
  useEffect(() => {
    const checkApi = () => {
      if (window.YT && window.YT.Player) {
        setYtApiReady(true);
      } else {
        setTimeout(checkApi, 200);
      }
    };
    checkApi();
  }, []);

  // --- Initialize Top Master Player ---
  useEffect(() => {
    if (!ytApiReady) return;
    if (masterPlayerRef.current) return;

    const firstBlock = blocks[0];
    if (!firstBlock) return;

    try {
      masterPlayerRef.current = new window.YT.Player('master-medley-player-slot', {
        videoId: firstBlock.youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: Math.floor(firstBlock.startTime),
        },
        events: {
          onReady: () => {
            // ready
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setIsMasterPlaying(true);
            } else if (event.data === 2 || event.data === 0) {
              setIsMasterPlaying(false);
            }
          },
        },
      });
    } catch (err) {
      console.warn('Failed to init master YouTube player:', err);
    }
  }, [ytApiReady, blocks]);

  // --- Initialize Block Players ---
  const setupBlockPlayer = useCallback((blockId: string, videoId: string, startSec: number) => {
    if (!window.YT || !window.YT.Player) return;
    const container = document.getElementById(`yt-block-container-${blockId}`);
    if (!container) return;

    if (blockPlayersRef.current[blockId]) {
      try {
        blockPlayersRef.current[blockId].destroy();
      } catch {
        // ignore
      }
      delete blockPlayersRef.current[blockId];
    }

    container.innerHTML = `<div id="yt-block-slot-${blockId}"></div>`;

    try {
      blockPlayersRef.current[blockId] = new window.YT.Player(`yt-block-slot-${blockId}`, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: Math.floor(startSec),
        },
        events: {
          onReady: (event: any) => {
            const dur = event.target.getDuration();
            if (dur && dur > 10) {
              setBlocks((prev) =>
                prev.map((b) => (b.id === blockId ? { ...b, duration: Math.floor(dur) } : b))
              );
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setPlayingBlockId(blockId);
            } else if (event.data === 2 || event.data === 0) {
              setPlayingBlockId((curr) => (curr === blockId ? null : curr));
            }
          },
        },
      });
    } catch (err) {
      console.warn(`Failed to init block player ${blockId}:`, err);
    }
  }, []);

  useEffect(() => {
    if (!ytApiReady) return;
    blocks.forEach((block) => {
      if (!blockPlayersRef.current[block.id] && block.youtubeId) {
        setupBlockPlayer(block.id, block.youtubeId, block.startTime);
      }
    });
  }, [ytApiReady, blocks, setupBlockPlayer]);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (masterMonitorTimerRef.current) clearInterval(masterMonitorTimerRef.current);
      if (blockMonitorTimerRef.current) clearInterval(blockMonitorTimerRef.current);
    };
  }, []);

  // --- Stop All Playback ---
  const stopAllPlayback = () => {
    if (masterMonitorTimerRef.current) {
      clearInterval(masterMonitorTimerRef.current);
      masterMonitorTimerRef.current = null;
    }
    if (blockMonitorTimerRef.current) {
      clearInterval(blockMonitorTimerRef.current);
      blockMonitorTimerRef.current = null;
    }

    if (masterPlayerRef.current && typeof masterPlayerRef.current.pauseVideo === 'function') {
      try {
        masterPlayerRef.current.pauseVideo();
      } catch {
        // ignore
      }
    }
    setIsMasterPlaying(false);

    Object.values(blockPlayersRef.current).forEach((player) => {
      try {
        if (player && typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        }
      } catch {
        // ignore
      }
    });
    setPlayingBlockId(null);
  };

  // --- Dynamic BPM / Tempo Ramp Calculation during playback ---
  const calculateRampedPlaybackRate = (blockIndex: number, currentVideoTime: number): number => {
    const currentBlock = blocks[blockIndex];
    if (!currentBlock) return 1.0;

    const baseSpeed = currentBlock.speed || 1.0;
    const nextBlock = blocks[blockIndex + 1];
    const trans = transitions[blockIndex];

    // If no next track or no BPM ramp requested
    if (!nextBlock || !trans || !trans.bpmRamp || trans.curve === 'instant') {
      return baseSpeed;
    }

    const timeUntilEnd = currentBlock.endTime - currentVideoTime;
    const rampDuration = Math.min(trans.duration, (currentBlock.endTime - currentBlock.startTime) * 0.4);

    if (timeUntilEnd > rampDuration) {
      return baseSpeed;
    }

    // Progress of the ramp from 0 (start of ramp) to 1 (end of block)
    const rampProgress = Math.max(0, Math.min(1, 1 - (timeUntilEnd / rampDuration)));

    // Ratio of target BPM to current BPM
    const currentEffectiveBpm = currentBlock.estimatedBpm * baseSpeed;
    const targetEffectiveBpm = nextBlock.estimatedBpm * (nextBlock.speed || 1.0);
    const targetSpeedRatio = targetEffectiveBpm / (currentBlock.estimatedBpm || 1);

    // Apply curve
    let factor = rampProgress;
    if (trans.curve === 'exponential') {
      factor = Math.pow(rampProgress, 2.5); // exponential swelling acceleration
    }

    const computedRate = baseSpeed + (targetSpeedRatio - baseSpeed) * factor;
    // Bound within safe range for YouTube player (0.5 to 2.0)
    return Math.max(0.5, Math.min(2.0, computedRate));
  };

  // --- MASTER MEDLEY PREVIEW PLAYBACK ---
  const playMasterMedleyFrom = (blockIndex: number, startAtVideoTime?: number) => {
    if (blockIndex >= blocks.length) {
      stopAllPlayback();
      setMasterActiveIndex(0);
      setMasterGlobalTime(0);
      return;
    }

    stopAllPlayback();
    setMasterActiveIndex(blockIndex);
    const block = blocks[blockIndex];
    const player = masterPlayerRef.current;
    if (!player) return;

    const startSec = startAtVideoTime !== undefined ? startAtVideoTime : block.startTime;

    try {
      player.loadVideoById({
        videoId: block.youtubeId,
        startSeconds: Math.floor(startSec),
      });

      if (typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(block.speed);
      }

      player.playVideo();
      setIsMasterPlaying(true);

      // Monitoring loop for continuous global scrubber & auto-advance
      masterMonitorTimerRef.current = window.setInterval(() => {
        if (isScrubbing) return;
        try {
          const curTime = player.getCurrentTime();

          // Calculate and apply dynamic BPM ramp if active
          const dynamicRate = calculateRampedPlaybackRate(blockIndex, curTime);
          if (typeof player.setPlaybackRate === 'function') {
            player.setPlaybackRate(dynamicRate);
          }

          // Map curTime to global medley time
          const seg = blockSegments[blockIndex];
          if (seg) {
            const elapsedInSeg = Math.max(0, (curTime - block.startTime) / (block.speed || 1));
            const newGlobalTime = Math.min(totalMedleyDuration, seg.startGlobal + elapsedInSeg);
            setMasterGlobalTime(newGlobalTime);
          }

          // Auto advance to next block when reaching endTime
          if (curTime >= block.endTime) {
            clearInterval(masterMonitorTimerRef.current!);
            masterMonitorTimerRef.current = null;
            playMasterMedleyFrom(blockIndex + 1);
          }
        } catch {
          // ignore
        }
      }, 100);
    } catch (err) {
      console.warn('Master medley error:', err);
    }
  };

  const toggleMasterMedley = () => {
    if (isMasterPlaying) {
      stopAllPlayback();
      return;
    }
    // Resume from current global time
    seekMasterToGlobalTime(masterGlobalTime, true);
  };

  // --- SMOOTH CONTINUOUS SCRUBBING ACROSS THE ENTIRE MEDLEY ---
  const seekMasterToGlobalTime = (targetGlobalTime: number, autoPlay: boolean = isMasterPlaying) => {
    const clampedTime = Math.max(0, Math.min(totalMedleyDuration, targetGlobalTime));
    setMasterGlobalTime(clampedTime);

    // Find which block segment contains this global time
    let targetIndex = blockSegments.findIndex(
      (seg) => clampedTime >= seg.startGlobal && clampedTime <= seg.endGlobal
    );
    if (targetIndex === -1) {
      targetIndex = clampedTime >= totalMedleyDuration ? blockSegments.length - 1 : 0;
    }

    const seg = blockSegments[targetIndex];
    if (!seg) return;

    const offsetInSeg = clampedTime - seg.startGlobal;
    const videoTargetTime = seg.startTime + offsetInSeg * (seg.speed || 1);

    const player = masterPlayerRef.current;
    if (!player) return;

    if (masterActiveIndex === targetIndex) {
      // Same video: smooth seek without reload!
      try {
        player.seekTo(videoTargetTime, true);
        if (autoPlay) {
          player.playVideo();
          setIsMasterPlaying(true);
        }
      } catch {
        // ignore
      }
    } else {
      // Switched to another track
      setMasterActiveIndex(targetIndex);
      if (autoPlay) {
        playMasterMedleyFrom(targetIndex, videoTargetTime);
      } else {
        try {
          player.cueVideoById({
            videoId: seg.youtubeId,
            startSeconds: Math.floor(videoTargetTime),
          });
        } catch {
          // ignore
        }
      }
    }
  };

  // --- INDIVIDUAL BLOCK PREVIEW ---
  const togglePreviewBlock = (block: TrackBlock) => {
    if (playingBlockId === block.id) {
      stopAllPlayback();
      return;
    }

    stopAllPlayback();
    const player = blockPlayersRef.current[block.id];

    if (!player) {
      setupBlockPlayer(block.id, block.youtubeId, block.startTime);
      return;
    }

    try {
      player.seekTo(block.startTime, true);
      if (typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(block.speed);
      }
      player.playVideo();
      setPlayingBlockId(block.id);

      blockMonitorTimerRef.current = window.setInterval(() => {
        try {
          const cur = player.getCurrentTime();
          setBlockCurrentTime((prev) => ({ ...prev, [block.id]: cur }));

          if (cur >= block.endTime) {
            player.pauseVideo();
            player.seekTo(block.startTime, true);
            setBlockCurrentTime((prev) => ({ ...prev, [block.id]: block.startTime }));
            stopAllPlayback();
          }
        } catch {
          // ignore
        }
      }, 100);
    } catch (err) {
      console.warn('Block preview error:', err);
    }
  };

  // --- Update Block Data Helper ---
  const updateBlock = (id: string, updates: Partial<TrackBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const merged = { ...b, ...updates };
          if (merged.startTime < 0) merged.startTime = 0;
          if (merged.endTime > merged.duration) merged.endTime = merged.duration;
          if (merged.startTime >= merged.endTime) {
            merged.startTime = Math.max(0, merged.endTime - 1);
          }
          if (updates.speed && blockPlayersRef.current[id]) {
            try {
              blockPlayersRef.current[id].setPlaybackRate(updates.speed);
            } catch {
              // ignore
            }
          }
          return merged;
        }
        return b;
      })
    );
  };

  // --- Update Transition Data Helper ---
  const updateTransition = (index: number, updates: Partial<TransitionConfig>) => {
    setTransitions((prev) => ({
      ...prev,
      [index]: {
        ...(prev[index] || { duration: 2.0, curve: 'linear', bpmRamp: true }),
        ...updates,
      },
    }));
  };

  // --- Harmonize / Auto-match BPM between two blocks ---
  const harmonizeBpmBetween = (index: number) => {
    const current = blocks[index];
    const next = blocks[index + 1];
    if (!current || !next) return;

    // Target a smooth midway BPM
    const curBpm = current.estimatedBpm;
    const nextBpm = next.estimatedBpm;
    const targetBpm = Math.round((curBpm + nextBpm) / 2);

    const speedCurrent = Math.max(0.6, Math.min(1.4, targetBpm / curBpm));
    const speedNext = Math.max(0.6, Math.min(1.4, targetBpm / nextBpm));

    updateBlock(current.id, { speed: parseFloat(speedCurrent.toFixed(2)) });
    updateBlock(next.id, { speed: parseFloat(speedNext.toFixed(2)) });
  };

  // --- YouTube Search or URL Import ---
  const handleYoutubeSearchOrUrl = async (blockId: string, directInput?: string) => {
    const raw = (directInput ?? searchInputs[blockId] ?? '').trim();
    if (!raw) return;

    setIsSearching((prev) => ({ ...prev, [blockId]: true }));
    const detectedId = extractYouTubeId(raw);

    if (detectedId) {
      const ytUrl = `https://www.youtube.com/watch?v=${detectedId}`;
      const thumb = `https://img.youtube.com/vi/${detectedId}/hqdefault.jpg`;

      let fetchedTitle = '';
      let fetchedAuthor = '';

      try {
        const resp = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(ytUrl)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.title) fetchedTitle = data.title;
          if (data.author_name) fetchedAuthor = data.author_name;
        }
      } catch {
        // ignore
      }

      const title = fetchedTitle || `Vidéo YouTube (${detectedId})`;
      const artist = fetchedAuthor || 'YouTube';
      const bpm = 120;
      const duration = 210;
      const peaks = generateStructuredPeaks(bpm, duration, detectedId);

      updateBlock(blockId, {
        title,
        artist,
        youtubeId: detectedId,
        youtubeUrl: ytUrl,
        youtubeThumbnail: thumb,
        waveformPeaks: peaks,
        startTime: 15,
        endTime: 55,
      });

      setTimeout(() => {
        setupBlockPlayer(blockId, detectedId, 15);
      }, 100);

      setIsSearching((prev) => ({ ...prev, [blockId]: false }));
      return;
    }

    const hash = raw.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const bpm = 90 + (hash % 45);
    const duration = 180;
    const sampleYt = INITIAL_BLOCKS[hash % INITIAL_BLOCKS.length].youtubeId;

    updateBlock(blockId, {
      title: raw,
      artist: 'Recherche YouTube',
      estimatedBpm: bpm,
      duration,
      youtubeId: sampleYt,
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}`,
      youtubeThumbnail: `https://img.youtube.com/vi/${sampleYt}/hqdefault.jpg`,
      waveformPeaks: generateStructuredPeaks(bpm, duration, sampleYt),
    });

    setTimeout(() => {
      setupBlockPlayer(blockId, sampleYt, 15);
    }, 100);

    setIsSearching((prev) => ({ ...prev, [blockId]: false }));
  };

  // --- Tap Tempo Functionality ---
  const handleTapTempo = (blockId: string) => {
    const now = Date.now();
    const existingTaps = tapTimesRef.current[blockId] || [];
    const recentTaps = [...existingTaps.filter((t) => now - t < 2500), now];
    tapTimesRef.current[blockId] = recentTaps;

    if (recentTaps.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < recentTaps.length; i++) {
        intervals.push(recentTaps[i] - recentTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const detectedBpm = Math.round(60000 / avgInterval);

      if (detectedBpm >= 50 && detectedBpm <= 220) {
        updateBlock(blockId, { estimatedBpm: detectedBpm });
      }
    }
  };

  // --- Add a new Block ---
  const addBlock = () => {
    const newId = `block-${Date.now()}`;
    const sample = INITIAL_BLOCKS[blocks.length % INITIAL_BLOCKS.length];
    const peaks = generateStructuredPeaks(sample.estimatedBpm, sample.duration, sample.youtubeId);

    const newBlock: TrackBlock = {
      id: newId,
      title: `${sample.title} (Nouveau)`,
      artist: sample.artist,
      genre: sample.genre,
      duration: sample.duration,
      estimatedBpm: sample.estimatedBpm,
      startTime: 20,
      endTime: 60,
      speed: 1.0,
      volume: 1.0,
      color: sample.color,
      youtubeId: sample.youtubeId,
      youtubeUrl: sample.youtubeUrl,
      youtubeThumbnail: sample.youtubeThumbnail,
      waveformPeaks: peaks,
      showVideo: true,
    };

    setBlocks((prev) => [...prev, newBlock]);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[target];
      updated[target] = temp;
      return updated;
    });
  };

  const duplicateBlock = (block: TrackBlock) => {
    const copy: TrackBlock = {
      ...block,
      id: `block-${Date.now()}`,
      title: `${block.title} (Copie)`,
    };
    setBlocks((prev) => [...prev, copy]);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) return;
    if (playingBlockId === id) stopAllPlayback();
    if (blockPlayersRef.current[id]) {
      try {
        blockPlayersRef.current[id].destroy();
        delete blockPlayersRef.current[id];
      } catch {
        // ignore
      }
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const captureTimeFromVideo = (blockId: string, field: 'start' | 'end') => {
    const player = blockPlayersRef.current[blockId];
    if (player && typeof player.getCurrentTime === 'function') {
      try {
        const cur = Math.round(player.getCurrentTime() * 10) / 10;
        if (field === 'start') {
          updateBlock(blockId, { startTime: cur });
        } else {
          updateBlock(blockId, { endTime: cur });
        }
      } catch {
        // ignore
      }
    }
  };

  // --- DJ Cue Sheet Generation ---
  const generateCueSheet = () => {
    let accumulatedTime = 0;
    const lines = [
      '=========================================================================',
      ' WEDDING MIX STUDIO - FEUILLE DE ROUTE DU MEDLEY DE MARIAGE',
      ` Durée Totale du Medley : ${formatTime(totalMedleyDuration)}`,
      ` Nombre de morceaux : ${blocks.length}`,
      '=========================================================================\n',
    ];

    blocks.forEach((block, idx) => {
      const segDuration = (block.endTime - block.startTime) / block.speed;
      const effectiveBpm = Math.round(block.estimatedBpm * block.speed);
      const ytTimestampUrl = `https://youtu.be/${block.youtubeId}?t=${Math.floor(block.startTime)}s`;
      const trans = transitions[idx];

      lines.push(`▶ [Morceau ${idx + 1}] ${formatTime(accumulatedTime)} -> ${formatTime(accumulatedTime + segDuration)} (Durée: ${segDuration.toFixed(1)}s)`);
      lines.push(`   Titre : "${block.title}" - ${block.artist}`);
      lines.push(`   Lien YouTube direct (calé au début) : ${ytTimestampUrl}`);
      lines.push(`   Points de coupe : Début à ${formatTime(block.startTime, true)} (${block.startTime}s) | Fin à ${formatTime(block.endTime, true)} (${block.endTime}s)`);
      lines.push(`   BPM : ${block.estimatedBpm} BPM (Vitesse: ${block.speed.toFixed(2)}x -> ${effectiveBpm} BPM)`);

      if (idx < blocks.length - 1 && trans) {
        const nextBlock = blocks[idx + 1];
        const nextBpm = Math.round(nextBlock.estimatedBpm * nextBlock.speed);
        lines.push(`   >> Transition vers morceau suivant : Fondu ${trans.duration}s | Forme: ${trans.curve} | Rattrapage BPM: ${trans.bpmRamp ? `${effectiveBpm} -> ${nextBpm} BPM` : 'Off'}`);
      }
      lines.push('-------------------------------------------------------------------------');
      accumulatedTime += segDuration;
    });

    return lines.join('\n');
  };

  const downloadCueSheet = () => {
    const txt = generateCueSheet();
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feuille-de-mix-medley-mariage.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCueSheet = () => {
    const txt = generateCueSheet();
    navigator.clipboard.writeText(txt);
    setCopiedCue(true);
    setTimeout(() => setCopiedCue(false), 2000);
  };

  const downloadStandaloneHtmlPlayer = () => {
    const jsonConfig = JSON.stringify(
      blocks.map((b) => ({
        title: b.title,
        artist: b.artist,
        youtubeId: b.youtubeId,
        startTime: b.startTime,
        endTime: b.endTime,
        speed: b.speed,
        bpm: Math.round(b.estimatedBpm * b.speed),
      })),
      null,
      2
    );

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Medley de Mariage - Lecteur Officiel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://www.youtube.com/iframe_api"></script>
</head>
<body class="bg-slate-950 text-white min-h-screen p-6 font-sans">
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-extrabold text-rose-400">Medley de Mariage</h1>
      <p class="text-slate-400">Lecteur autonome enchaîné aux points de coupe programmés</p>
    </div>
    <div class="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <div id="player" class="w-full h-full"></div>
    </div>
    <div class="flex justify-center gap-4">
      <button id="playBtn" class="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-lg shadow-lg">Lancer le Medley</button>
      <button id="pauseBtn" class="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-lg">Pause</button>
    </div>
    <div id="trackInfo" class="text-center font-mono text-amber-300 font-bold text-lg">Prêt</div>
  </div>
  <script>
    const playlist = ${jsonConfig};
    let player, currentIndex = 0, timer;
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: playlist[0].youtubeId,
        playerVars: { controls: 1, rel: 0, modestbranding: 1 }
      });
    }
    function playStep(idx) {
      if (idx >= playlist.length) { document.getElementById('trackInfo').innerText = "Fin du Medley ! Félicitations aux mariés !"; return; }
      currentIndex = idx;
      const item = playlist[idx];
      document.getElementById('trackInfo').innerText = "Morceau " + (idx+1) + "/" + playlist.length + " : " + item.title + " (" + item.bpm + " BPM)";
      player.loadVideoById({ videoId: item.youtubeId, startSeconds: item.startTime });
      player.setPlaybackRate(item.speed);
      player.playVideo();
      clearInterval(timer);
      timer = setInterval(() => {
        if (player.getCurrentTime() >= item.endTime) {
          clearInterval(timer);
          playStep(idx + 1);
        }
      }, 150);
    }
    document.getElementById('playBtn').onclick = () => playStep(currentIndex);
    document.getElementById('pauseBtn').onclick = () => { player.pauseVideo(); clearInterval(timer); };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lecteur-medley-mariage.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeMasterBlock = blocks[masterActiveIndex] || blocks[0];
  const activeMasterSeg = blockSegments[masterActiveIndex] || blockSegments[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 ring-1 ring-white/20">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent">
                  Wedding Mix Studio
                </h1>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                  <Youtube className="w-3 h-3 text-red-500" /> YouTube Studio DJ
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Navigation fluide sur tout le medley et gestion précise du tempo & des transitions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <button
              onClick={() => addBlock()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 transition shadow-sm cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-rose-400" />
              <span>Ajouter un bloc</span>
            </button>

            <button
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-md shadow-rose-600/25 transition cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Exporter le medley</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ========================================================================= */}
        {/* PREVIEW GLOBALE DU MEDLEY AVEC CURSEUR CONTINU ET RÉGLAGES DE TRANSITION */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 rounded-3xl border-2 border-rose-500/50 p-5 sm:p-6 shadow-2xl shadow-red-950/40 backdrop-blur space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header de la preview */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold">
                <Play className="w-5 h-5 ml-0.5 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Preview Globale du Medley
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                    Curseur Continu 0:00 → {formatTime(totalMedleyDuration)}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Déplacez le curseur n'importe où sur le medley pour écouter et tester les accélérations de tempo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-inner">
                <Clock className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Durée totale du mix</div>
                  <div className="text-base font-black text-amber-300 font-mono">
                    {formatTime(totalMedleyDuration)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Master Video Display & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Embedded Master Video Player */}
            <div className="lg:col-span-7 bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl aspect-video relative flex items-center justify-center">
              <div id="master-medley-player-slot" className="w-full h-full"></div>
            </div>

            {/* Master Console Status & Transition Inspector */}
            <div className="lg:col-span-5 space-y-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800/90 shadow-inner flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    Piste active : Morceau {masterActiveIndex + 1} sur {blocks.length}
                  </span>
                  <span
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded text-slate-950"
                    style={{ backgroundColor: activeMasterBlock.color }}
                  >
                    {Math.round(activeMasterBlock.estimatedBpm * activeMasterBlock.speed)} BPM (Vitesse {activeMasterBlock.speed}x)
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white leading-tight">
                    {activeMasterBlock.title}
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">
                    {activeMasterBlock.artist} • <span className="text-rose-300">{activeMasterBlock.genre}</span>
                  </p>
                </div>

                {/* Transition preview if upcoming track */}
                {masterActiveIndex < blocks.length - 1 && transitions[masterActiveIndex] && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        <span>Rattrapage BPM vers Piste {masterActiveIndex + 2} :</span>
                      </span>
                      <span className="font-mono text-amber-300 font-bold text-[11px]">
                        {Math.round(activeMasterBlock.estimatedBpm * activeMasterBlock.speed)} → {Math.round(blocks[masterActiveIndex + 1].estimatedBpm * blocks[masterActiveIndex + 1].speed)} BPM
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Accélération : <strong className="text-white">{transitions[masterActiveIndex].curve}</strong></span>
                      <span>Fondu : <strong className="text-white">{transitions[masterActiveIndex].duration}s</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Master Playback Controls */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const prevIdx = Math.max(0, masterActiveIndex - 1);
                      seekMasterToGlobalTime(blockSegments[prevIdx].startGlobal, true);
                    }}
                    disabled={masterActiveIndex === 0}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition cursor-pointer"
                    title="Morceau précédent"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={toggleMasterMedley}
                    className={`px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-black text-sm text-white transition shadow-xl cursor-pointer ${
                      isMasterPlaying
                        ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30'
                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-600/30 active:scale-95'
                    }`}
                  >
                    {isMasterPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    <span>{isMasterPlaying ? 'Mettre en Pause' : 'Lancer le Medley'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const nextIdx = Math.min(blocks.length - 1, masterActiveIndex + 1);
                      seekMasterToGlobalTime(blockSegments[nextIdx].startGlobal, true);
                    }}
                    disabled={masterActiveIndex === blocks.length - 1}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition cursor-pointer"
                    title="Morceau suivant"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={() => seekMasterToGlobalTime(0, true)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                  title="Revenir au tout début du medley"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Début</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CURSEUR FLUIDE CONTINU TOUT AU LONG DU MEDLEY (MASTER CONTINUOUS SCRUBBER) */}
          {/* ========================================================================= */}
          <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-inner">
            <div className="flex flex-wrap items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Position globale :</span>
                <span className="text-amber-300 font-bold text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {formatTime(masterGlobalTime, true)}
                </span>
                <span className="text-slate-500">/ {formatTime(totalMedleyDuration)}</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Morceau actif : <strong className="text-white">{activeMasterBlock.title}</strong>
              </div>
            </div>

            {/* Continuous Slider Bar with smooth dragging */}
            <div className="relative w-full py-2">
              <input
                type="range"
                min="0"
                max={Math.max(1, totalMedleyDuration)}
                step="0.2"
                value={masterGlobalTime}
                onMouseDown={() => setIsScrubbing(true)}
                onTouchStart={() => setIsScrubbing(true)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setMasterGlobalTime(val);
                  seekMasterToGlobalTime(val, false);
                }}
                onMouseUp={() => {
                  setIsScrubbing(false);
                  if (isMasterPlaying) seekMasterToGlobalTime(masterGlobalTime, true);
                }}
                onTouchEnd={() => {
                  setIsScrubbing(false);
                  if (isMasterPlaying) seekMasterToGlobalTime(masterGlobalTime, true);
                }}
                className="w-full accent-rose-500 cursor-pointer h-3 bg-slate-800 rounded-lg relative z-20"
              />

              {/* Segment Markers Overlay under the continuous slider */}
              <div className="h-6 w-full rounded-lg bg-slate-900 p-0.5 flex gap-1 overflow-hidden border border-slate-800/80 mt-1">
                {blockSegments.map((seg, idx) => {
                  const isCurrent = masterActiveIndex === idx;
                  return (
                    <div
                      key={seg.id}
                      onClick={() => seekMasterToGlobalTime(seg.startGlobal, true)}
                      style={{
                        flex: Math.max(1, Math.round(seg.segDuration)),
                        backgroundColor: seg.color || '#ec4899',
                      }}
                      className={`h-full rounded transition-all duration-150 flex items-center justify-between text-[10px] font-bold text-white px-2 cursor-pointer select-none ${
                        isCurrent ? 'ring-2 ring-white scale-y-105 shadow-md z-10' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={`Piste ${idx + 1}: ${seg.title} (${Math.round(seg.segDuration)}s)`}
                    >
                      <span className="truncate drop-shadow flex items-center gap-1">
                        {idx + 1}. {seg.title}
                      </span>
                      <span className="text-[9px] opacity-80 font-mono ml-1 shrink-0">{Math.round(seg.segDuration)}s</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* LISTE DES MORCEAUX AVEC MODULES DE TRANSITION ET RATTRAPAGE BPM INTER-PISTES */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Timeline des 4 pistes & Transitions DJ</span>
              </h3>
              <p className="text-xs text-slate-400">
                Configurez les points de crop, la vitesse et la courbe d'accélération entre chaque morceau
              </p>
            </div>

            <button
              onClick={() => addBlock()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un bloc</span>
            </button>
          </div>

          {blocks.map((block, index) => {
            const effectiveBpm = Math.round(block.estimatedBpm * block.speed);
            const cropDuration = Math.max(0, block.endTime - block.startTime);
            const playbackDuration = cropDuration / block.speed;
            const isPlayingThis = playingBlockId === block.id;
            const currentPos = blockCurrentTime[block.id] ?? block.startTime;
            const searchVal = searchInputs[block.id] ?? '';
            const searching = isSearching[block.id] ?? false;

            const trans = transitions[index];
            const nextBlock = blocks[index + 1];

            return (
              <React.Fragment key={block.id}>
                {/* --- BLOC PISTE --- */}
                <div className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition-shadow duration-300 shadow-xl shadow-black/20 p-5 space-y-4">
                  {/* Header Piste */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-slate-950 shadow-inner"
                        style={{ backgroundColor: block.color }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-base tracking-tight">{block.title}</h4>
                          <span className="text-xs text-slate-400">par {block.artist}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {block.genre}
                          </span>
                          <a
                            href={block.youtubeUrl || `https://www.youtube.com/watch?v=${block.youtubeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 hover:text-white border border-red-500/30 flex items-center gap-1 transition"
                            title="Ouvrir sur YouTube"
                          >
                            <Youtube className="w-3 h-3 text-red-500" /> YouTube
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateBlock(block.id, { showVideo: !block.showVideo })}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                          block.showVideo
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={block.showVideo ? 'Masquer la vidéo' : 'Afficher la vidéo'}
                      >
                        <Video className="w-4 h-4 text-red-400" />
                        <span className="hidden sm:inline">{block.showVideo ? 'Masquer vidéo' : 'Voir vidéo'}</span>
                      </button>

                      <button
                        onClick={() => moveBlock(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Déplacer vers le haut"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => moveBlock(index, 'down')}
                        disabled={index === blocks.length - 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Déplacer vers le bas"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => duplicateBlock(block)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
                        title="Dupliquer ce morceau"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => removeBlock(block.id)}
                        disabled={blocks.length <= 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Supprimer ce morceau"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Recherche / URL + Détection BPM */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-red-500" />
                        <span>Recherche vidéo ou URL YouTube :</span>
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        ID YouTube : <code className="text-rose-300 font-mono text-[11px]">{block.youtubeId}</code>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-8 relative flex items-center">
                        <Link className="w-4 h-4 text-red-400 absolute left-3 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Coller l'URL YouTube (ex: https://www.youtube.com/watch?v=...) ou chercher"
                          value={searchVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchInputs((prev) => ({ ...prev, [block.id]: val }));
                            if (extractYouTubeId(val)) {
                              handleYoutubeSearchOrUrl(block.id, val);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-28 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition font-mono"
                        />
                        <button
                          onClick={() => handleYoutubeSearchOrUrl(block.id)}
                          disabled={searching}
                          className="absolute right-1 px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          {searching ? (
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Youtube className="w-3.5 h-3.5" />
                          )}
                          <span>{extractYouTubeId(searchVal) ? 'Charger URL' : 'Rechercher'}</span>
                        </button>
                      </div>

                      <div className="md:col-span-4 flex items-center gap-2">
                        <div className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center flex items-center justify-between">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">BPM Détecté</div>
                            <div className="text-sm font-extrabold text-amber-400 font-mono">
                              {effectiveBpm} <span className="text-[10px] font-normal text-slate-400">BPM</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleTapTempo(block.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1 active:scale-95"
                            title="Tapez en rythme avec la musique pour détecter le tempo"
                          >
                            <Activity className="w-3 h-3" />
                            <span>Tap BPM</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vidéo YouTube locale pour calage */}
                  {block.showVideo && (
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/90 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-300 font-semibold">
                          <Youtube className="w-4 h-4 text-red-500" />
                          <span>Vidéo YouTube officielle & Calage à l'oreille</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => captureTimeFromVideo(block.id, 'start')}
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold border border-amber-500/30 transition cursor-pointer flex items-center gap-1"
                            title="Capture la seconde actuelle de la vidéo comme point de début"
                          >
                            <BookmarkCheck className="w-3 h-3" />
                            <span>Position vidéo = Début</span>
                          </button>

                          <button
                            onClick={() => captureTimeFromVideo(block.id, 'end')}
                            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold border border-rose-500/30 transition cursor-pointer flex items-center gap-1"
                            title="Capture la seconde actuelle de la vidéo comme point de fin"
                          >
                            <BookmarkCheck className="w-3 h-3" />
                            <span>Position vidéo = Fin</span>
                          </button>
                        </div>
                      </div>

                      <div className="relative w-full aspect-video sm:h-60 sm:w-auto mx-auto rounded-lg overflow-hidden bg-black flex items-center justify-center">
                        <div id={`yt-block-container-${block.id}`} className="w-full h-full"></div>
                      </div>
                    </div>
                  )}

                  {/* Forme d'onde (Waveform) & Découpe */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Music className="w-3.5 h-3.5 text-rose-400" />
                        <span>Forme d'onde & Zone découpée</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-300">
                        Début : <span className="text-amber-300 font-bold">{formatTime(block.startTime, true)}</span> • Fin : <span className="text-rose-300 font-bold">{formatTime(block.endTime, true)}</span> • Durée sélectionnée : <span className="text-white font-bold">{cropDuration.toFixed(1)}s</span>
                      </div>
                    </div>

                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                        const clickedTime = ratio * block.duration;
                        const player = blockPlayersRef.current[block.id];
                        if (player && typeof player.seekTo === 'function') {
                          player.seekTo(clickedTime, true);
                        }
                        setBlockCurrentTime((p) => ({ ...p, [block.id]: clickedTime }));
                      }}
                      className="relative h-24 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center px-2 select-none group cursor-pointer"
                      title="Cliquez pour naviguer dans ce morceau"
                    >
                      <div className="absolute inset-0 flex items-center justify-between px-3 gap-0.5 opacity-65">
                        {block.waveformPeaks.map((peak, pIdx) => {
                          const totalPeaks = block.waveformPeaks.length || 90;
                          const posSec = (pIdx / totalPeaks) * block.duration;
                          const isInCrop = posSec >= block.startTime && posSec <= block.endTime;
                          return (
                            <div
                              key={pIdx}
                              style={{
                                height: `${Math.max(12, peak * 88)}%`,
                                backgroundColor: isInCrop ? block.color : '#334155',
                              }}
                              className={`w-1 rounded-full transition-all duration-150 ${
                                isInCrop ? 'opacity-100 shadow-sm' : 'opacity-30'
                              }`}
                            />
                          );
                        })}
                      </div>

                      <div
                        style={{ width: `${(block.startTime / block.duration) * 100}%` }}
                        className="absolute left-0 top-0 bottom-0 bg-slate-950/75 border-r border-amber-500/60 pointer-events-none"
                      />

                      <div
                        style={{
                          left: `${(block.startTime / block.duration) * 100}%`,
                          width: `${((block.endTime - block.startTime) / block.duration) * 100}%`,
                        }}
                        className="absolute top-0 bottom-0 border-y border-amber-400/40 bg-amber-400/5 pointer-events-none"
                      >
                        <div className="absolute left-0 top-1 text-[9px] font-mono text-amber-300 bg-slate-950/90 px-1 rounded border border-amber-400/30">
                          {formatTime(block.startTime)}
                        </div>
                        <div className="absolute right-0 bottom-1 text-[9px] font-mono text-rose-300 bg-slate-950/90 px-1 rounded border border-rose-400/30">
                          {formatTime(block.endTime)}
                        </div>
                      </div>

                      <div
                        style={{ width: `${((block.duration - block.endTime) / block.duration) * 100}%` }}
                        className="absolute right-0 top-0 bottom-0 bg-slate-950/75 border-l border-rose-500/60 pointer-events-none"
                      />

                      {isPlayingThis && (
                        <div
                          style={{
                            left: `${(currentPos / block.duration) * 100}%`,
                          }}
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_#ffffff] z-20 pointer-events-none"
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-white -ml-1 -mt-1 shadow" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Réglages : Début, Fin et Curseur de Vitesse */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {/* Point de Début */}
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5" /> Point de Début
                        </span>
                        <span className="font-mono text-white text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {formatTime(block.startTime, true)} ({block.startTime.toFixed(1)}s)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, block.endTime - 1)}
                        step="0.5"
                        value={block.startTime}
                        onChange={(e) => updateBlock(block.id, { startTime: parseFloat(e.target.value) })}
                        className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>00:00</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateBlock(block.id, { startTime: Math.max(0, block.startTime - 1) })}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                          >
                            -1s
                          </button>
                          <button
                            onClick={() => updateBlock(block.id, { startTime: Math.min(block.endTime - 1, block.startTime + 1) })}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                          >
                            +1s
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Point de Fin */}
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5" /> Point de Fin
                        </span>
                        <span className="font-mono text-white text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {formatTime(block.endTime, true)} ({block.endTime.toFixed(1)}s)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={Math.min(block.duration, block.startTime + 1)}
                        max={block.duration}
                        step="0.5"
                        value={block.endTime}
                        onChange={(e) => updateBlock(block.id, { endTime: parseFloat(e.target.value) })}
                        className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateBlock(block.id, { endTime: Math.max(block.startTime + 1, block.endTime - 1) })}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                          >
                            -1s
                          </button>
                          <button
                            onClick={() => updateBlock(block.id, { endTime: Math.min(block.duration, block.endTime + 1) })}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                          >
                            +1s
                          </button>
                        </div>
                        <span>{formatTime(block.duration)}</span>
                      </div>
                    </div>

                    {/* Vitesse (Tempo 0.5x à 1.5x) */}
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5" /> Vitesse (Tempo)
                        </span>
                        <span className="font-mono text-cyan-300 font-bold text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {block.speed.toFixed(2)}x
                          {block.speed !== 1.0 && (
                            <span className="text-[10px] font-normal text-slate-400 ml-1">
                              ({block.speed > 1.0 ? `+${Math.round((block.speed - 1) * 100)}%` : `${Math.round((block.speed - 1) * 100)}%`})
                            </span>
                          )}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={block.speed}
                        onChange={(e) => updateBlock(block.id, { speed: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>0.5x</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateBlock(block.id, { speed: 0.9 })}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                          >
                            0.9x
                          </button>
                          <button
                            onClick={() => updateBlock(block.id, { speed: 1.0 })}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded cursor-pointer"
                          >
                            1.0x
                          </button>
                          <button
                            onClick={() => updateBlock(block.id, { speed: 1.1 })}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                          >
                            1.1x
                          </button>
                        </div>
                        <span>1.5x</span>
                      </div>
                    </div>
                  </div>

                  {/* Lecteur de Prévisualisation Local */}
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => togglePreviewBlock(block)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white transition shadow-md cursor-pointer ${
                          isPlayingThis
                            ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/25 ring-2 ring-white/50 animate-pulse'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                        }`}
                        title={isPlayingThis ? 'Mettre en pause' : 'Écouter ce morceau découpé'}
                      >
                        {isPlayingThis ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>Prévisualisation de cette piste</span>
                          {isPlayingThis && (
                            <span className="text-[10px] text-amber-400 font-mono">
                              • Lecture en cours ({formatTime(block.startTime)} → {formatTime(block.endTime)})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Position : {formatTime(currentPos)} / {formatTime(block.endTime)} • Durée réelle de passage : {playbackDuration.toFixed(1)}s
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const player = blockPlayersRef.current[block.id];
                          if (player && typeof player.seekTo === 'function') {
                            player.seekTo(block.startTime, true);
                          }
                          setBlockCurrentTime((p) => ({ ...p, [block.id]: block.startTime }));
                        }}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1"
                        title="Revenir au point de début"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Début</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* MODULE INTER-PISTES : CONTRÔLE DU TEMPO, RATTRAPAGE BPM & FORME ACCÉLÉRATION */}
                {/* ========================================================================= */}
                {index < blocks.length - 1 && nextBlock && trans && (
                  <div className="relative py-2 px-4 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-rose-500/30 shadow-lg space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-rose-500/20 text-rose-300">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Transition & Rattrapage BPM : Piste {index + 1} ➔ Piste {index + 2}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {block.title} ({effectiveBpm} BPM) vers {nextBlock.title} ({Math.round(nextBlock.estimatedBpm * nextBlock.speed)} BPM)
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => harmonizeBpmBetween(index)}
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/40 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Ajuste automatiquement les curseurs de vitesse pour synchroniser les deux tempos"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Harmoniser les BPMs</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Durée du fondu */}
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center text-slate-300 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-rose-400" /> Temps de fondu
                          </span>
                          <span className="font-mono text-white text-[11px]">{trans.duration}s</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.5"
                          value={trans.duration}
                          onChange={(e) => updateTransition(index, { duration: parseFloat(e.target.value) })}
                          className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>0s (Cut)</span>
                          <span>2.5s</span>
                          <span>5s</span>
                        </div>
                      </div>

                      {/* Forme de l'accélération */}
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center text-slate-300 font-semibold">
                          <span className="flex items-center gap-1">
                            <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Forme d'accélération
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() => updateTransition(index, { curve: 'linear' })}
                            className={`py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                              trans.curve === 'linear'
                                ? 'bg-cyan-500 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title="Accélération régulière"
                          >
                            Linéaire
                          </button>
                          <button
                            onClick={() => updateTransition(index, { curve: 'exponential' })}
                            className={`py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                              trans.curve === 'exponential'
                                ? 'bg-cyan-500 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title="Montée en puissance progressive vers la fin"
                          >
                            Progressive
                          </button>
                          <button
                            onClick={() => updateTransition(index, { curve: 'instant' })}
                            className={`py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                              trans.curve === 'instant'
                                ? 'bg-cyan-500 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title="Coupure nette / Drop DJ direct"
                          >
                            Coupure
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {trans.curve === 'exponential' ? 'Montée progressive intense' : trans.curve === 'linear' ? 'Progression constante' : 'Coupure nette'}
                        </div>
                      </div>

                      {/* Activer Rattrapage BPM */}
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-slate-300 font-semibold">
                          <span className="flex items-center gap-1">
                            <FastForward className="w-3.5 h-3.5 text-amber-400" /> Rampe Tempo auto
                          </span>
                          <button
                            onClick={() => updateTransition(index, { bpmRamp: !trans.bpmRamp })}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                              trans.bpmRamp
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {trans.bpmRamp ? 'Activé' : 'Désactivé'}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {trans.bpmRamp
                            ? `Le morceau accélère en direct de ${effectiveBpm} vers ${Math.round(nextBlock.estimatedBpm * nextBlock.speed)} BPM avant la transition.`
                            : 'La vitesse reste fixe jusqu\'au changement de piste.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Action : Ajouter un bloc à la timeline & Export global */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pb-8">
          <button
            onClick={() => addBlock()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold bg-slate-900 hover:bg-slate-800 text-rose-300 border-2 border-dashed border-rose-500/40 hover:border-rose-400 transition shadow-lg cursor-pointer active:scale-98"
          >
            <Plus className="w-5 h-5 text-rose-400" />
            <span>Ajouter un bloc à la timeline</span>
          </button>

          <button
            onClick={() => setExportModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-base font-extrabold bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-xl shadow-rose-600/25 transition cursor-pointer active:scale-98"
          >
            <Download className="w-5 h-5" />
            <span>Exporter le medley</span>
          </button>
        </div>
      </main>

      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-lg text-white">Export du Medley de Mariage</h3>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Durée totale calculée :</span>
                  <span className="text-amber-300 font-mono font-bold">{formatTime(totalMedleyDuration)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Nombre de morceaux :</span>
                  <span className="text-white font-semibold">{blocks.length} titres YouTube</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Gestion des transitions :</span>
                  <span className="text-emerald-400 font-bold">Rampes de tempo et fondus paramétrés</span>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={downloadStandaloneHtmlPlayer}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold text-sm shadow-lg shadow-rose-600/25 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4" />
                    <span>Télécharger le Lecteur Web Autonome (.HTML)</span>
                  </div>
                  <Download className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={downloadCueSheet}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Feuille de Route DJ (.TXT)</span>
                  </button>

                  <button
                    onClick={copyCueSheet}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    {copiedCue ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-rose-400" />}
                    <span>{copiedCue ? 'Copié dans le presse-papier !' : 'Copier Timecodes & Liens'}</span>
                  </button>
                </div>
              </div>

              {/* Preview of Cue Sheet */}
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Aperçu de la feuille de route DJ :</div>
                <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto max-h-36 text-slate-300 leading-relaxed">
                  {generateCueSheet()}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Wedding Mix Studio • Medley de Mariage avec Preview fluide, contrôle du tempo et rattrapage BPM
      </footer>
    </div>
  );
}
