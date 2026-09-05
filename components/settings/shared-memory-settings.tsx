"use client";

import { useMemo, useState } from "react";
import { Brain, Loader2, RefreshCw } from "lucide-react";
import { loadCharacters } from "@/lib/character-storage";
import {
    loadSharedMemorySyncConfig,
    saveSharedMemorySyncConfig,
    syncSharedMemory,
    type SharedMemorySyncConfig,
} from "@/lib/shared-memory-sync";
import { Input, Select, Toggle } from "@/components/ui/form";

export function SharedMemorySettings({ onNotice }: { onNotice?: (message: string) => void }) {
    const characters = useMemo(() => loadCharacters(), []);
    const [config, setConfig] = useState<SharedMemorySyncConfig>(() => {
        const saved = loadSharedMemorySyncConfig();
        return {
            ...saved,
            characterId: saved.characterId || characters[0]?.id || "",
        };
    });
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState("");
    const [lastSyncedAt, setLastSyncedAt] = useState("");

    const persist = (next: SharedMemorySyncConfig) => {
        setConfig(next);
        saveSharedMemorySyncConfig(next);
    };

    const handleSync = async () => {
        const next = { ...config, secret: config.secret.trim() };
        persist(next);
        setSyncing(true);
        setError("");
        try {
            const result = await syncSharedMemory(next);
            setLastSyncedAt(result.syncedAt);
            onNotice?.("共享记忆已写入角色核心记忆");
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "共享记忆同步失败");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex flex-col gap-[16px]">
            <div className="ui-group-card !items-stretch">
                <div className="flex items-start gap-3">
                    <div className="ui-icon-circle shrink-0"><Brain size={20} /></div>
                    <div className="flex-1 flex flex-col gap-1">
                        <span className="menu-label font-medium">顾先生共享记忆</span>
                        <span className="menu-desc !mt-0">
                            从私人 GitHub 记忆库读取最新内容，并覆盖写入所选角色的一条核心记忆。
                        </span>
                    </div>
                </div>
            </div>

            <div className="ui-group-card !items-stretch">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                        <span className="menu-label font-medium">同步到角色</span>
                        <Select
                            value={config.characterId}
                            onChange={event => persist({ ...config, characterId: event.target.value })}
                        >
                            <option value="">请选择角色</option>
                            {characters.map(character => (
                                <option key={character.id} value={character.id}>{character.name}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="menu-label font-medium">同步口令</span>
                        <Input
                            type="password"
                            value={config.secret}
                            placeholder="Vercel 中的 MEMORY_SYNC_SECRET"
                            autoComplete="off"
                            onChange={event => setConfig(current => ({ ...current, secret: event.target.value }))}
                        />
                        <span className="menu-desc !mt-0">口令只保存在这台设备的本地数据中。</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 flex flex-col gap-1 min-w-0">
                            <span className="menu-label">打开 Float 时自动同步</span>
                            <span className="menu-desc !mt-0">启用后，每次重新打开应用都会刷新核心记忆。</span>
                        </div>
                        <Toggle
                            checked={config.enabled}
                            onChange={enabled => persist({ ...config, enabled })}
                        />
                    </div>
                    <button
                        type="button"
                        className="ui-btn ui-btn-primary w-full justify-center"
                        disabled={syncing}
                        onClick={() => void handleSync()}
                    >
                        {syncing
                            ? <><Loader2 size={16} className="animate-spin" /> 同步中…</>
                            : <><RefreshCw size={16} /> 立即同步并保存</>}
                    </button>
                    {lastSyncedAt ? (
                        <span className="menu-desc !mt-0 text-center">
                            最近同步：{new Date(lastSyncedAt).toLocaleString()}
                        </span>
                    ) : null}
                    {error ? <span className="text-red-500 ts-12 text-center">{error}</span> : null}
                </div>
            </div>
        </div>
    );
}
