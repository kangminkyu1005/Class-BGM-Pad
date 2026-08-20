"use client";

import {
  CSSProperties,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlarmClock,
  AudioLines,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clapperboard,
  Hand,
  Headphones,
  ListMusic,
  Megaphone,
  Moon,
  Music,
  PartyPopper,
  Pause,
  Pencil,
  PersonStanding,
  Play,
  Plus,
  Repeat2,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  Square,
  Sun,
  Trash2,
  VolumeX,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  CLASS_BGM_BUCKET,
  CLASS_BGM_TABLE,
  supabase,
} from "./supabase";

type BgmButton = {
  id: string;
  title: string;
  category: string;
  audioUrl: string;
  storagePath: string;
  loop: boolean;
  volume: number;
  color: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
};

type BgmRow = {
  id: string;
  title: string;
  category: string;
  audio_path: string;
  legacy_storage_path: string | null;
  loop: boolean;
  volume: number | string;
  color: string;
  icon: string;
  migration_state: "pending" | "ready" | "failed";
  created_at: string;
  updated_at: string;
};

type ButtonDraft = {
  title: string;
  category: string;
  loop: boolean;
  volume: number;
  color: string;
  icon: string;
};

const COLORS = [
  "#64BAAB",
  "#067772",
  "#123047",
  "#F7C859",
  "#E77468",
  "#6C8CFF",
  "#8B6FB7",
  "#D77A44",
];

type IconChoice = {
  id: string;
  label: string;
  legacyValue: string;
  Icon: LucideIcon;
};

const ICONS: IconChoice[] = [
  { id: "music", label: "음악", legacyValue: "🎵", Icon: Music },
  { id: "audio-lines", label: "리듬", legacyValue: "🎶", Icon: AudioLines },
  { id: "headphones", label: "헤드폰", legacyValue: "🎧", Icon: Headphones },
  { id: "bell", label: "종", legacyValue: "🔔", Icon: Bell },
  { id: "alarm-clock", label: "알람", legacyValue: "⏰", Icon: AlarmClock },
  { id: "party", label: "축하", legacyValue: "🎉", Icon: PartyPopper },
  { id: "hand", label: "박수", legacyValue: "👏", Icon: Hand },
  { id: "quiet", label: "조용히", legacyValue: "🤫", Icon: VolumeX },
  { id: "megaphone", label: "안내", legacyValue: "📢", Icon: Megaphone },
  { id: "stretch", label: "휴식", legacyValue: "🧘", Icon: PersonStanding },
  { id: "zap", label: "에너지", legacyValue: "⚡", Icon: Zap },
  { id: "moon", label: "밤", legacyValue: "🌙", Icon: Moon },
  { id: "sun", label: "낮", legacyValue: "☀️", Icon: Sun },
  { id: "clapperboard", label: "영상", legacyValue: "🎬", Icon: Clapperboard },
  { id: "book", label: "학습", legacyValue: "📚", Icon: BookOpen },
  { id: "complete", label: "완료", legacyValue: "✅", Icon: CircleCheck },
];

const ICON_BY_ID = Object.fromEntries(
  ICONS.map((choice) => [choice.id, choice]),
) as Record<string, IconChoice>;

const ICON_ID_BY_LEGACY_VALUE = Object.fromEntries(
  ICONS.map((choice) => [choice.legacyValue, choice.id]),
) as Record<string, string>;

const CATEGORIES = ["입장/퇴장", "집중", "휴식", "타이머", "효과음", "기타"];
const EMPTY_DRAFT: ButtonDraft = {
  title: "",
  category: "",
  loop: true,
  volume: 1,
  color: COLORS[0],
  icon: ICONS[0].id,
};

function resolveIconId(value: string) {
  if (ICON_BY_ID[value]) return value;
  return ICON_ID_BY_LEGACY_VALUE[value] ?? ICONS[0].id;
}

function SoundIcon({
  icon,
  size = 24,
  strokeWidth = 2,
}: {
  icon: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = ICON_BY_ID[resolveIconId(icon)].Icon;
  return <Icon aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
}

function safeColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : COLORS[0];
}

function toButton(row: BgmRow): BgmButton {
  const { data } = supabase.storage
    .from(CLASS_BGM_BUCKET)
    .getPublicUrl(row.audio_path);

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    audioUrl: data.publicUrl,
    storagePath: row.audio_path,
    loop: row.loop,
    volume: Number(row.volume),
    color: safeColor(row.color),
    icon: resolveIconId(row.icon),
    createdAt: Date.parse(row.created_at) || Date.now(),
    updatedAt: Date.parse(row.updated_at) || Date.now(),
  };
}

function configureAudio(audio: HTMLAudioElement, button: BgmButton) {
  audio.loop = button.loop;
  audio.volume = Math.max(0, Math.min(1, button.volume));
}

function restartAudio(audio: HTMLAudioElement) {
  audio.currentTime = 0;
}

function getSavedSettings() {
  if (typeof window === "undefined") {
    return { defaultLoop: true, defaultVolume: 1 };
  }
  const saved = window.localStorage.getItem("playwell-bgm-settings");
  if (!saved) return { defaultLoop: true, defaultVolume: 1 };
  try {
    const parsed = JSON.parse(saved);
    return {
      defaultLoop: Boolean(parsed.defaultLoop),
      defaultVolume: Number(parsed.defaultVolume ?? 1),
    };
  } catch {
    return { defaultLoop: true, defaultVolume: 1 };
  }
}

function getSavedPlaylist() {
  if (typeof window === "undefined") return [] as string[];
  const saved = window.localStorage.getItem("playwell-bgm-playlist");
  if (!saved) return [] as string[];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export default function Home() {
  const [buttons, setButtons] = useState<BgmButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [category, setCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<BgmButton | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<"pad" | "playlist">("pad");
  const [playlistIds, setPlaylistIds] = useState<string[]>(getSavedPlaylist);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const [playlistPlaying, setPlaylistPlaying] = useState(false);
  const [playlistRepeat, setPlaylistRepeat] = useState(true);
  const [selectingPlaylist, setSelectingPlaylist] = useState(false);
  const [panel, setPanel] = useState<"none" | "add" | "edit" | "settings">(
    "none",
  );
  const [editing, setEditing] = useState<BgmButton | null>(null);
  const [draft, setDraft] = useState<ButtonDraft>(EMPTY_DRAFT);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saveStep, setSaveStep] = useState("");
  const [toast, setToast] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [defaultLoop, setDefaultLoop] = useState(
    () => getSavedSettings().defaultLoop,
  );
  const [defaultVolume, setDefaultVolume] = useState(
    () => getSavedSettings().defaultVolume,
  );
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const preparedButtonRef = useRef("");
  const playlistAudioRef = useRef<HTMLAudioElement | null>(null);
  const playlistSourceRef = useRef("");
  const playlistButtonsRef = useRef<BgmButton[]>([]);
  const playlistIndexRef = useRef(-1);
  const playlistRepeatRef = useRef(true);
  const startPlaylistAtRef = useRef<(index: number) => void>(() => undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const loadButtons = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(CLASS_BGM_TABLE)
      .select(
        "id,title,category,audio_path,legacy_storage_path,loop,volume,color,icon,migration_state,created_at,updated_at",
      )
      .eq("migration_state", "ready")
      .order("created_at", { ascending: true });

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    setButtons(((data ?? []) as BgmRow[]).map(toButton));
    setLoadError("");
    setLoading(false);
  }, []);

  const refreshAdmin = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAdmin(false);
      setAdminEmail("");
      setAuthReady(true);
      return;
    }

    const { data } = await supabase
      .from("playwell_site_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    setIsAdmin(Boolean(data));
    setAdminEmail(user.email ?? "");
    setAuthReady(true);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadButtons(), 0);

    const channel = supabase
      .channel("class-bgm-buttons-public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: CLASS_BGM_TABLE },
        () => void loadButtons(),
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialLoad);
      void supabase.removeChannel(channel);
    };
  }, [loadButtons]);

  useEffect(() => {
    const initialAuthCheck = window.setTimeout(() => void refreshAdmin(), 0);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshAdmin();
    });
    return () => {
      window.clearTimeout(initialAuthCheck);
      subscription.unsubscribe();
    };
  }, [refreshAdmin]);

  useEffect(() => {
    const fallbackAudio = new Audio();
    const playlistAudio = new Audio();
    fallbackAudio.preload = "metadata";
    playlistAudio.preload = "metadata";
    fallbackAudio.addEventListener("playing", () => {
      if (activeAudioRef.current === fallbackAudio) setIsPlaying(true);
    });
    fallbackAudio.addEventListener("pause", () => {
      if (activeAudioRef.current === fallbackAudio) setIsPlaying(false);
    });
    fallbackAudio.addEventListener("ended", () => {
      if (activeAudioRef.current === fallbackAudio) setIsPlaying(false);
    });
    fallbackAudioRef.current = fallbackAudio;
    playlistAudio.addEventListener("playing", () => setPlaylistPlaying(true));
    playlistAudio.addEventListener("pause", () => setPlaylistPlaying(false));
    playlistAudio.addEventListener("ended", () => {
      const list = playlistButtonsRef.current;
      const current = playlistIndexRef.current;
      if (list.length === 0 || current < 0) {
        setPlaylistPlaying(false);
        return;
      }
      const next = current + 1;
      if (next < list.length) {
        startPlaylistAtRef.current(next);
      } else if (playlistRepeatRef.current) {
        startPlaylistAtRef.current(0);
      } else {
        setPlaylistPlaying(false);
      }
    });
    playlistAudioRef.current = playlistAudio;

    return () => {
      activeAudioRef.current = null;
      fallbackAudio.pause();
      playlistAudio.pause();
    };
  }, []);

  const playlistButtons = useMemo(
    () =>
      playlistIds
        .map((id) => buttons.find((button) => button.id === id))
        .filter((button): button is BgmButton => Boolean(button)),
    [buttons, playlistIds],
  );

  const playlistCandidates = useMemo(
    () =>
      [...buttons].sort((a, b) => {
        const aIsBgm = /bgm|배경음/i.test(`${a.category} ${a.title}`) ? 1 : 0;
        const bIsBgm = /bgm|배경음/i.test(`${b.category} ${b.title}`) ? 1 : 0;
        return bIsBgm - aIsBgm || a.createdAt - b.createdAt;
      }),
    [buttons],
  );

  useEffect(() => {
    playlistButtonsRef.current = playlistButtons;
  }, [playlistButtons]);

  useEffect(() => {
    playlistIndexRef.current = playlistIndex;
  }, [playlistIndex]);

  useEffect(() => {
    playlistRepeatRef.current = playlistRepeat;
  }, [playlistRepeat]);

  useEffect(() => {
    window.localStorage.setItem(
      "playwell-bgm-playlist",
      JSON.stringify(playlistIds),
    );
  }, [playlistIds]);

  const stopAll = useCallback(() => {
    activeAudioRef.current = null;
    const fallbackAudio = fallbackAudioRef.current;
    if (fallbackAudio) {
      fallbackAudio.pause();
      fallbackAudio.removeAttribute("src");
      fallbackAudio.load();
    }
    preparedButtonRef.current = "";
    setActive(null);
    setIsPlaying(false);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }
  }, []);

  const pause = useCallback(() => activeAudioRef.current?.pause(), []);
  const resume = useCallback(async () => {
    await activeAudioRef.current?.play();
  }, []);

  const prepare = useCallback((button: BgmButton) => {
    const fallbackAudio = fallbackAudioRef.current;
    if (!fallbackAudio || preparedButtonRef.current === button.id) return;
    fallbackAudio.pause();
    fallbackAudio.src = button.audioUrl;
    fallbackAudio.loop = button.loop;
    fallbackAudio.volume = Math.max(0, Math.min(1, button.volume));
    fallbackAudio.load();
    preparedButtonRef.current = button.id;
  }, []);

  const play = useCallback(
    async (button: BgmButton) => {
      const audio = fallbackAudioRef.current;
      if (!audio) return;

      const previousAudio = activeAudioRef.current;
      activeAudioRef.current = audio;
      if (previousAudio && previousAudio !== audio) {
        previousAudio.pause();
        previousAudio.currentTime = 0;
      }

      setActive(button);
      setIsPlaying(true);
      configureAudio(audio, button);
      prepare(button);
      restartAudio(audio);

      if ("mediaSession" in navigator && !playlistPlaying) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: button.title,
          artist: "PLAYWELL Class BGM",
          album: button.category,
        });
        navigator.mediaSession.setActionHandler("play", () => void resume());
        navigator.mediaSession.setActionHandler("pause", pause);
        navigator.mediaSession.setActionHandler("stop", stopAll);
      }
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
        showToast("음원을 재생하지 못했습니다. 다시 눌러주세요.");
      }
    },
    [pause, playlistPlaying, prepare, resume, showToast, stopAll],
  );

  const startPlaylistAt = useCallback(
    async (index: number) => {
      const list = playlistButtonsRef.current;
      const button = list[index];
      const audio = playlistAudioRef.current;
      if (!button || !audio) return;

      const source = button.audioUrl;
      audio.pause();
      if (playlistSourceRef.current !== source) {
        audio.src = source;
        playlistSourceRef.current = source;
        audio.load();
      }
      audio.loop = false;
      audio.volume = Math.max(0, Math.min(1, button.volume));
      restartAudio(audio);
      playlistIndexRef.current = index;
      setPlaylistIndex(index);
      setPlaylistPlaying(true);

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: button.title,
          artist: "PLAYWELL Class BGM",
          album: `배경음 재생목록 · ${index + 1}/${list.length}`,
        });
        navigator.mediaSession.setActionHandler("play", () => {
          void playlistAudioRef.current?.play();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          playlistAudioRef.current?.pause();
        });
        navigator.mediaSession.setActionHandler("previoustrack", () => {
          const current = playlistIndexRef.current;
          startPlaylistAtRef.current(current > 0 ? current - 1 : list.length - 1);
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          const current = playlistIndexRef.current;
          startPlaylistAtRef.current((current + 1) % list.length);
        });
      }

      try {
        await audio.play();
      } catch {
        setPlaylistPlaying(false);
        showToast("배경음을 재생하지 못했습니다. 다시 눌러주세요.");
      }
    },
    [showToast],
  );

  useEffect(() => {
    startPlaylistAtRef.current = (index) => {
      void startPlaylistAt(index);
    };
  }, [startPlaylistAt]);

  function togglePlaylist() {
    const audio = playlistAudioRef.current;
    if (!audio) return;
    if (playlistButtons.length === 0) {
      setSelectingPlaylist(true);
      showToast("먼저 재생할 배경음을 선택해주세요.");
      return;
    }
    if (playlistIndex < 0) {
      void startPlaylistAt(0);
    } else if (playlistPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  }

  function skipPlaylist(direction: -1 | 1) {
    if (playlistButtons.length === 0) return;
    const current = playlistIndex < 0 ? 0 : playlistIndex;
    const next =
      (current + direction + playlistButtons.length) % playlistButtons.length;
    void startPlaylistAt(next);
  }

  function stopPlaylist() {
    const audio = playlistAudioRef.current;
    audio?.pause();
    if (audio) restartAudio(audio);
    setPlaylistPlaying(false);
    setPlaylistIndex(-1);
    playlistIndexRef.current = -1;
  }

  function toggleTrack(id: string) {
    setPlaylistIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  }

  function moveTrack(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= playlistIds.length) return;
    setPlaylistIds((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    if (playlistIndex === index) setPlaylistIndex(nextIndex);
    else if (playlistIndex === nextIndex) setPlaylistIndex(index);
  }

  function removeTrack(id: string) {
    const removingIndex = playlistIds.indexOf(id);
    if (removingIndex === playlistIndex) stopPlaylist();
    setPlaylistIds((current) => current.filter((currentId) => currentId !== id));
    if (removingIndex < playlistIndex) setPlaylistIndex((current) => current - 1);
  }

  const categories = useMemo(
    () =>
      Array.from(new Set(buttons.map((button) => button.category))).sort(
        (a, b) => a.localeCompare(b, "ko"),
      ),
    [buttons],
  );

  const visibleButtons = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return buttons.filter((button) => {
      const categoryMatch = category === "전체" || button.category === category;
      const searchMatch =
        !keyword ||
        button.title.toLowerCase().includes(keyword) ||
        button.category.toLowerCase().includes(keyword);
      return categoryMatch && searchMatch;
    });
  }, [buttons, category, search]);

  function openAdd() {
    setEditing(null);
    setDraft({
      ...EMPTY_DRAFT,
      loop: defaultLoop,
      volume: defaultVolume,
    });
    setFile(null);
    setProgress(0);
    setSaveStep("");
    setPanel("add");
  }

  function openEdit(button: BgmButton) {
    setEditing(button);
    setDraft({
      title: button.title,
      category: button.category,
      loop: button.loop,
      volume: button.volume,
      color: button.color,
      icon: button.icon,
    });
    setFile(null);
    setProgress(0);
    setSaveStep("");
    setPanel("edit");
  }

  async function uploadAudio(selectedFile: File) {
    setSaveStep("음원 업로드 중");
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !["mp3", "wav", "m4a"].includes(extension)) {
      throw new Error("mp3, wav, m4a 음원만 사용할 수 있습니다.");
    }
    const storagePath = `audio/${crypto.randomUUID()}.${extension}`;
    const contentType =
      selectedFile.type ||
      ({ mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4" }[extension] ??
        "application/octet-stream");
    const { data, error } = await supabase.storage
      .from(CLASS_BGM_BUCKET)
      .upload(storagePath, selectedFile, {
        cacheControl: "31536000",
        contentType,
        upsert: false,
      });
    if (error) throw error;
    setProgress(1);
    return {
      audioUrl: supabase.storage
        .from(CLASS_BGM_BUCKET)
        .getPublicUrl(data.path).data.publicUrl,
      storagePath: data.path,
    };
  }

  async function saveButton(event: FormEvent) {
    event.preventDefault();
    if (!isAdmin) {
      showToast("관리자 로그인 후 수정할 수 있습니다.");
      return;
    }
    const title = draft.title.trim();
    const nextCategory = draft.category.trim();
    if (!title || !nextCategory) {
      showToast("버튼 이름과 카테고리를 입력해주세요.");
      return;
    }
    if (!editing && !file) {
      showToast("음원 파일을 선택해주세요.");
      return;
    }
    if (file && !/\.(mp3|wav|m4a)$/i.test(file.name)) {
      showToast("mp3, wav, m4a 음원만 사용할 수 있습니다.");
      return;
    }
    if (file && file.size > 50 * 1024 * 1024) {
      showToast("음원 파일은 50MB 이하만 사용할 수 있습니다.");
      return;
    }

    setSaving(true);
    setProgress(0);
    let uploaded: { audioUrl: string; storagePath: string } | null = null;
    try {
      if (file) uploaded = await uploadAudio(file);
      setSaveStep("버튼 정보 저장 중");
      const payload = {
        title,
        category: nextCategory,
        loop: draft.loop,
        volume: draft.volume,
        color: safeColor(draft.color),
        icon: resolveIconId(draft.icon),
        ...(uploaded ? { audio_path: uploaded.storagePath } : {}),
        migration_state: "ready" as const,
        updated_at: new Date().toISOString(),
      };
      if (editing) {
        const { error } = await supabase
          .from(CLASS_BGM_TABLE)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        if (uploaded && editing.storagePath) {
          await supabase.storage
            .from(CLASS_BGM_BUCKET)
            .remove([editing.storagePath]);
          if (active?.id === editing.id) stopAll();
        }
        showToast("BGM 버튼을 수정했습니다.");
      } else {
        if (!uploaded) throw new Error("음원 파일을 선택해주세요.");
        const { error } = await supabase.from(CLASS_BGM_TABLE).insert({
          id: crypto.randomUUID(),
          ...payload,
          audio_path: uploaded.storagePath,
          legacy_storage_path: null,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
        showToast("새 BGM 버튼을 추가했습니다.");
      }
      await loadButtons();
      setPanel("none");
    } catch (error) {
      if (uploaded) {
        await supabase.storage
          .from(CLASS_BGM_BUCKET)
          .remove([uploaded.storagePath]);
      }
      showToast(
        `저장하지 못했습니다. ${error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}`,
      );
    } finally {
      setSaving(false);
      setSaveStep("");
    }
  }

  async function removeButton() {
    if (!editing) return;
    if (!isAdmin) {
      showToast("관리자 로그인 후 삭제할 수 있습니다.");
      return;
    }
    if (!window.confirm(`"${editing.title}" 버튼과 음원을 삭제할까요?`)) return;
    setSaving(true);
    try {
      let storageCleanupFailed = false;
      if (active?.id === editing.id) stopAll();
      const { error } = await supabase
        .from(CLASS_BGM_TABLE)
        .delete()
        .eq("id", editing.id);
      if (error) throw error;
      if (editing.storagePath) {
        const { error: storageError } = await supabase.storage
          .from(CLASS_BGM_BUCKET)
          .remove([editing.storagePath]);
        storageCleanupFailed = Boolean(storageError);
      }
      await loadButtons();
      setPanel("none");
      showToast(
        storageCleanupFailed
          ? "버튼은 삭제했지만 음원 파일 정리가 필요합니다."
          : "BGM 버튼을 삭제했습니다.",
      );
    } catch (error) {
      showToast(
        `삭제하지 못했습니다. ${error instanceof Error ? error.message : ""}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function signInAdmin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) showToast(`로그인을 시작하지 못했습니다. ${error.message}`);
  }

  async function signOutAdmin() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast(`로그아웃하지 못했습니다. ${error.message}`);
      return;
    }
    setIsAdmin(false);
    setAdminEmail("");
    setPanel("none");
    showToast("관리자 로그아웃을 완료했습니다.");
  }

  function saveSettings() {
    window.localStorage.setItem(
      "playwell-bgm-settings",
      JSON.stringify({ defaultLoop, defaultVolume }),
    );
    setPanel("none");
    showToast("새 버튼의 기본 설정을 저장했습니다.");
  }

  const currentPlaylistButton =
    playlistIndex >= 0 ? playlistButtons[playlistIndex] : null;
  const dockButton = currentPlaylistButton ?? active;

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true" />
          <div>
            <strong>PLAYWELL</strong>
            <span>JUKJEON · CLASS TOOL</span>
          </div>
        </div>
        <button
          className="icon-control"
          type="button"
          onClick={() => setPanel("settings")}
          aria-label="설정 열기"
          title="설정"
        >
          <Settings aria-hidden="true" size={21} />
        </button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">CLASS BGM PAD</p>
          <h1>
            <span className="hero-line">수업의 분위기를</span>
            <span className="hero-line">한 번의 터치로 바꿔요.</span>
          </h1>
          <p className="hero-description">
            필요한 음악과 효과음을 바로 재생하고, 수업의 흐름에 더 집중하세요.
          </p>
        </div>
        <div className="hero-status" aria-label="BGM 버튼 현황">
          <span className="status-mark" aria-hidden="true">
            <SoundIcon
              icon={currentPlaylistButton?.icon ?? active?.icon ?? ICONS[0].id}
              size={30}
            />
          </span>
          <div>
            <span>
              {currentPlaylistButton
                ? playlistPlaying
                  ? "배경음 재생 중"
                  : "배경음 일시정지"
                : active
                  ? isPlaying
                    ? "효과음 재생 중"
                    : "효과음 준비"
                  : "준비 완료"}
            </span>
            <strong>
              {currentPlaylistButton?.title ??
                active?.title ??
                `${buttons.length}개의 사운드 버튼`}
            </strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="workspace-head">
          <div>
            <p className="eyebrow">
              {workspaceView === "pad" ? "QUICK SOUND PAD" : "BGM PLAYLIST"}
            </p>
            <h2>{workspaceView === "pad" ? "효과음 버튼" : "배경음 재생목록"}</h2>
          </div>
          {workspaceView === "pad" && isAdmin ? (
            <button className="primary-button" type="button" onClick={openAdd}>
              <Plus aria-hidden="true" size={19} /> 새 버튼 추가
            </button>
          ) : workspaceView === "playlist" ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => setSelectingPlaylist((current) => !current)}
            >
              <Plus aria-hidden="true" size={19} />
              {selectingPlaylist ? "선택 완료" : "배경음 선택"}
            </button>
          ) : null}
        </div>

        <div className="workspace-switch" aria-label="사운드 재생 방식">
          <button
            type="button"
            className={workspaceView === "pad" ? "is-selected" : ""}
            onClick={() => setWorkspaceView("pad")}
            aria-pressed={workspaceView === "pad"}
          >
            <Zap aria-hidden="true" size={18} />
            효과음
          </button>
          <button
            type="button"
            className={workspaceView === "playlist" ? "is-selected" : ""}
            onClick={() => setWorkspaceView("playlist")}
            aria-pressed={workspaceView === "playlist"}
          >
            <ListMusic aria-hidden="true" size={18} />
            배경음
            {playlistButtons.length > 0 && (
              <span className="switch-count">{playlistButtons.length}</span>
            )}
          </button>
        </div>

        {workspaceView === "pad" ? (
          <>
            <div className="tools">
              <label className="search-box">
                <span className="visually-hidden">사운드 검색</span>
                <Search aria-hidden="true" size={20} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="사운드 이름 또는 카테고리 검색"
                />
              </label>
              <div className="category-row" aria-label="카테고리 필터">
                {["전체", ...categories].map((item) => (
                  <button
                    className={`category-chip ${category === item ? "is-selected" : ""}`}
                    type="button"
                    key={item}
                    onClick={() => setCategory(item)}
                    aria-pressed={category === item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="state-panel">
                <span className="loader" aria-hidden="true" />
                <strong>사운드 버튼을 불러오고 있어요.</strong>
              </div>
            ) : loadError ? (
              <div className="state-panel error-state">
                <strong>목록을 불러오지 못했습니다.</strong>
                <span>{loadError}</span>
              </div>
            ) : visibleButtons.length === 0 ? (
              <div className="state-panel">
                <span className="empty-note" aria-hidden="true">
                  <Music size={25} />
                </span>
                <strong>
                  {buttons.length === 0
                    ? "아직 등록된 사운드가 없어요."
                    : "조건에 맞는 사운드가 없어요."}
                </strong>
                <span>
                  {buttons.length === 0
                    ? "새 버튼을 추가해 첫 수업 음악을 준비해보세요."
                    : "검색어나 카테고리를 바꿔보세요."}
                </span>
              </div>
            ) : (
              <div className="sound-grid">
                {visibleButtons.map((button) => {
                  const isActive = active?.id === button.id;
                  const cardStyle = {
                    "--button-color": safeColor(button.color),
                  } as CSSProperties;
                  return (
                    <article
                      className={`sound-card ${isActive ? "is-active" : ""}`}
                      style={cardStyle}
                      key={button.id}
                    >
                      <button
                        className="sound-play"
                        type="button"
                        onPointerDown={() => prepare(button)}
                        onClick={() => void play(button)}
                        aria-label={`${button.title} 재생`}
                      >
                        <span className="sound-icon" aria-hidden="true">
                          <SoundIcon icon={button.icon} />
                        </span>
                        <span className="sound-content">
                          <span className="sound-state">
                            {isActive
                              ? isPlaying
                                ? "재생 중"
                                : "일시정지"
                              : button.loop
                                ? "반복 재생"
                                : "한 번 재생"}
                          </span>
                          <strong>{button.title}</strong>
                          <span>{button.category}</span>
                        </span>
                        <span className="play-mark" aria-hidden="true">
                          {isActive && isPlaying ? (
                            <Pause size={17} fill="currentColor" />
                          ) : (
                            <Play size={17} fill="currentColor" />
                          )}
                        </span>
                      </button>
                      {isAdmin && (
                        <button
                          className="edit-button"
                          type="button"
                          onClick={() => openEdit(button)}
                          aria-label={`${button.title} 수정`}
                          title={`${button.title} 수정`}
                        >
                          <Pencil aria-hidden="true" size={18} />
                          <span className="visually-hidden">편집</span>
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="playlist-view">
            <section className="playlist-player" aria-label="배경음 재생 제어">
              <div className="playlist-now">
                <span
                  className="playlist-cover"
                  style={{
                    background:
                      playlistIndex >= 0
                        ? safeColor(playlistButtons[playlistIndex]?.color ?? COLORS[0])
                        : undefined,
                  }}
                  aria-hidden="true"
                >
                  <SoundIcon
                    icon={playlistButtons[playlistIndex]?.icon ?? "music"}
                    size={26}
                  />
                </span>
                <div>
                  <span>
                    {playlistPlaying
                      ? "지금 재생 중"
                      : playlistIndex >= 0
                        ? "일시정지"
                        : "배경음 준비 완료"}
                  </span>
                  <strong>
                    {playlistButtons[playlistIndex]?.title ??
                      (playlistButtons.length > 0
                        ? `${playlistButtons.length}곡을 순서대로 재생해요`
                        : "재생할 곡을 선택해주세요")}
                  </strong>
                </div>
              </div>
              <div className="playlist-controls">
                <button
                  type="button"
                  onClick={() => skipPlaylist(-1)}
                  disabled={playlistButtons.length === 0}
                  aria-label="이전 배경음"
                >
                  <SkipBack aria-hidden="true" size={20} fill="currentColor" />
                </button>
                <button
                  type="button"
                  className="playlist-main-control"
                  onClick={togglePlaylist}
                  aria-label={playlistPlaying ? "배경음 일시정지" : "배경음 재생"}
                >
                  {playlistPlaying ? (
                    <Pause aria-hidden="true" size={22} fill="currentColor" />
                  ) : (
                    <Play aria-hidden="true" size={22} fill="currentColor" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => skipPlaylist(1)}
                  disabled={playlistButtons.length === 0}
                  aria-label="다음 배경음"
                >
                  <SkipForward aria-hidden="true" size={20} fill="currentColor" />
                </button>
                <button
                  type="button"
                  className={playlistRepeat ? "is-active" : ""}
                  onClick={() => setPlaylistRepeat((current) => !current)}
                  aria-label={playlistRepeat ? "전체 반복 켜짐" : "전체 반복 꺼짐"}
                  aria-pressed={playlistRepeat}
                >
                  <Repeat2 aria-hidden="true" size={19} />
                </button>
              </div>
            </section>

            {selectingPlaylist && (
              <section className="playlist-picker" aria-label="배경음 여러 개 선택">
                <div className="playlist-section-head">
                  <div>
                    <strong>배경음 여러 개 선택</strong>
                    <span>선택한 순서대로 재생목록에 추가됩니다.</span>
                  </div>
                  <span>{playlistButtons.length}곡 선택</span>
                </div>
                <div className="playlist-picker-grid">
                  {playlistCandidates.map((button) => {
                    const selected = playlistIds.includes(button.id);
                    return (
                      <button
                        type="button"
                        className={selected ? "is-selected" : ""}
                        onClick={() => toggleTrack(button.id)}
                        aria-pressed={selected}
                        key={button.id}
                      >
                        <span
                          className="picker-icon"
                          style={{ color: safeColor(button.color) }}
                          aria-hidden="true"
                        >
                          <SoundIcon icon={button.icon} size={20} />
                        </span>
                        <span>
                          <strong>{button.title}</strong>
                          <small>{button.category}</small>
                        </span>
                        <span className="picker-check" aria-hidden="true">
                          {selected ? <Check size={16} strokeWidth={3} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="playlist-list-section">
              <div className="playlist-section-head">
                <div>
                  <strong>재생 순서</strong>
                  <span>위에서 아래로 차례대로 재생됩니다.</span>
                </div>
                {playlistButtons.length > 0 && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      stopPlaylist();
                      setPlaylistIds([]);
                    }}
                  >
                    모두 비우기
                  </button>
                )}
              </div>

              {playlistButtons.length === 0 ? (
                <div className="playlist-empty">
                  <ListMusic aria-hidden="true" size={28} />
                  <strong>아직 선택한 배경음이 없어요.</strong>
                  <span>‘배경음 선택’을 눌러 여러 곡을 추가해보세요.</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelectingPlaylist(true)}
                  >
                    <Plus aria-hidden="true" size={18} />
                    배경음 선택
                  </button>
                </div>
              ) : (
                <ol className="playlist-list">
                  {playlistButtons.map((button, index) => {
                    const current = index === playlistIndex;
                    return (
                      <li className={current ? "is-current" : ""} key={button.id}>
                        <button
                          type="button"
                          className="playlist-track-main"
                          onClick={() => void startPlaylistAt(index)}
                          aria-label={`${button.title}부터 재생`}
                        >
                          <span className="track-number" aria-hidden="true">
                            {current && playlistPlaying ? (
                              <AudioLines size={18} />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span
                            className="track-icon"
                            style={{ color: safeColor(button.color) }}
                            aria-hidden="true"
                          >
                            <SoundIcon icon={button.icon} size={20} />
                          </span>
                          <span className="track-copy">
                            <strong>{button.title}</strong>
                            <small>{button.category}</small>
                          </span>
                          <Play aria-hidden="true" size={17} fill="currentColor" />
                        </button>
                        <div className="track-actions">
                          <button
                            type="button"
                            onClick={() => moveTrack(index, -1)}
                            disabled={index === 0}
                            aria-label={`${button.title} 순서를 위로 이동`}
                          >
                            <ChevronUp aria-hidden="true" size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTrack(index, 1)}
                            disabled={index === playlistButtons.length - 1}
                            aria-label={`${button.title} 순서를 아래로 이동`}
                          >
                            <ChevronDown aria-hidden="true" size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTrack(button.id)}
                            aria-label={`${button.title} 재생목록에서 제거`}
                          >
                            <Trash2 aria-hidden="true" size={17} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>PLAYWELL · JUKJEON</span>
        <span>질문하고, 실험하고, 확인하고, 다시 바꾸는 수업</span>
      </footer>

      {dockButton && (
        <aside className="player-dock" aria-label="현재 재생 중인 음원">
          <div className="dock-accent" style={{ background: dockButton.color }} />
          <span className="dock-icon" aria-hidden="true">
            <SoundIcon icon={dockButton.icon} size={22} />
          </span>
          <div className="dock-copy">
            <span>{currentPlaylistButton ? "BGM PLAYLIST" : "SOUND EFFECT"}</span>
            <strong>{dockButton.title}</strong>
          </div>
          <button
            type="button"
            className="dock-control"
            onClick={() =>
              void (currentPlaylistButton
                ? togglePlaylist()
                : isPlaying
                  ? pause()
                  : resume())
            }
            aria-label={
              currentPlaylistButton
                ? playlistPlaying
                  ? "배경음 일시정지"
                  : "배경음 다시 재생"
                : isPlaying
                  ? "효과음 일시정지"
                  : "효과음 다시 재생"
            }
          >
            {(currentPlaylistButton ? playlistPlaying : isPlaying) ? (
              <Pause aria-hidden="true" size={18} fill="currentColor" />
            ) : (
              <Play aria-hidden="true" size={18} fill="currentColor" />
            )}
          </button>
          <button
            type="button"
            className="dock-stop"
            onClick={() => {
              stopAll();
              stopPlaylist();
            }}
            aria-label="전체 정지"
          >
            <Square aria-hidden="true" size={15} fill="currentColor" />
            <span>전체 정지</span>
          </button>
        </aside>
      )}

      {panel !== "none" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setPanel("none");
          }}
        >
          {panel === "settings" ? (
            <section className="modal settings-modal" role="dialog" aria-modal="true">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">DEFAULT SETTINGS</p>
                  <h2>새 버튼 기본 설정</h2>
                </div>
                <button
                  className="close-button"
                  type="button"
                  onClick={() => setPanel("none")}
                  aria-label="닫기"
                >
                  <X aria-hidden="true" size={22} />
                </button>
              </div>
              <div className="form-section">
                <label className="toggle-row">
                  <span>
                    <strong>반복 재생</strong>
                    <small>새 버튼을 만들 때 기본으로 적용합니다.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={defaultLoop}
                    onChange={(event) => setDefaultLoop(event.target.checked)}
                  />
                </label>
                <label className="field">
                  <span>
                    기본 볼륨 <strong>{Math.round(defaultVolume * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={defaultVolume}
                    onChange={(event) => setDefaultVolume(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="admin-access">
                <div className="admin-access-copy">
                  <p className="eyebrow">ADMIN ACCESS</p>
                  <strong>콘텐츠 관리</strong>
                  {!authReady ? (
                    <span>관리자 상태를 확인하고 있습니다.</span>
                  ) : isAdmin ? (
                    <span>{adminEmail || "승인된 관리자"}로 로그인했습니다.</span>
                  ) : adminEmail ? (
                    <span>현재 계정은 이 사이트의 관리자로 등록되지 않았습니다.</span>
                  ) : (
                    <span>음원 추가·수정·삭제는 승인된 관리자만 사용할 수 있습니다.</span>
                  )}
                </div>
                {authReady &&
                  (adminEmail ? (
                    <button
                      className="secondary-button admin-auth-button"
                      type="button"
                      onClick={() => void signOutAdmin()}
                    >
                      로그아웃
                    </button>
                  ) : (
                    <button
                      className="secondary-button admin-auth-button"
                      type="button"
                      onClick={() => void signInAdmin()}
                    >
                      Google로 관리자 로그인
                    </button>
                  ))}
              </div>
              <button
                className="primary-button full-button"
                type="button"
                onClick={saveSettings}
              >
                기본 설정 저장
              </button>
            </section>
          ) : (
            <form className="modal" onSubmit={saveButton}>
              <div className="modal-head">
                <div>
                  <p className="eyebrow">
                    {panel === "add" ? "ADD NEW SOUND" : "EDIT SOUND"}
                  </p>
                  <h2>{panel === "add" ? "새 BGM 버튼 추가" : "BGM 버튼 수정"}</h2>
                </div>
                <button
                  className="close-button"
                  type="button"
                  onClick={() => setPanel("none")}
                  disabled={saving}
                  aria-label="닫기"
                >
                  <X aria-hidden="true" size={22} />
                </button>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>버튼 이름</span>
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="예: 수업 시작 음악"
                    maxLength={40}
                    autoFocus
                  />
                </label>

                <label className="field">
                  <span>카테고리</span>
                  <input
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    placeholder="예: 입장/퇴장"
                    maxLength={30}
                  />
                </label>
              </div>

              <div className="suggestions" aria-label="추천 카테고리">
                {CATEGORIES.map((item) => (
                  <button
                    type="button"
                    className="mini-chip"
                    key={item}
                    onClick={() =>
                      setDraft((current) => ({ ...current, category: item }))
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>

              <fieldset className="choice-field">
                <legend>버튼 색상</legend>
                <div className="color-options">
                  {COLORS.map((color) => (
                    <button
                      type="button"
                      className={`color-option ${draft.color === color ? "is-selected" : ""}`}
                      style={{ background: color }}
                      key={color}
                      onClick={() =>
                        setDraft((current) => ({ ...current, color }))
                      }
                      aria-label={`${color} 색상 선택`}
                      aria-pressed={draft.color === color}
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset className="choice-field">
                <legend>아이콘</legend>
                <div className="icon-options">
                  {ICONS.map(({ id, label, Icon }) => (
                    <button
                      type="button"
                      className={`icon-option ${draft.icon === id ? "is-selected" : ""}`}
                      key={id}
                      onClick={() =>
                        setDraft((current) => ({ ...current, icon: id }))
                      }
                      aria-label={`${label} 아이콘 선택`}
                      aria-pressed={draft.icon === id}
                      title={label}
                    >
                      <Icon aria-hidden="true" size={22} />
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="file-field">
                <span>{file ? file.name : editing ? "음원을 교체하려면 선택하세요" : "음원 파일을 선택하세요"}</span>
                <strong>파일 선택</strong>
                <input
                  type="file"
                  accept=".mp3,.wav,.m4a,audio/*"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <div className="form-grid">
                <label className="toggle-row compact">
                  <span>
                    <strong>반복 재생</strong>
                    <small>음원이 끝나면 다시 시작</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={draft.loop}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        loop: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="field volume-field">
                  <span>
                    볼륨 <strong>{Math.round(draft.volume * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={draft.volume}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        volume: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              {saving && (
                <div className="progress" aria-live="polite">
                  <span style={{ width: `${Math.max(8, progress * 100)}%` }} />
                  <strong>
                    {saveStep}
                    {progress > 0 && progress < 1
                      ? ` · ${Math.round(progress * 100)}%`
                      : ""}
                  </strong>
                </div>
              )}

              <div className="modal-actions">
                {editing && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => void removeButton()}
                    disabled={saving}
                  >
                    버튼 삭제
                  </button>
                )}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPanel("none")}
                  disabled={saving}
                >
                  취소
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  {saving ? "저장 중…" : "저장하기"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span aria-hidden="true">
            <Check size={17} strokeWidth={3} />
          </span>
          {toast}
        </div>
      )}
    </main>
  );
}
