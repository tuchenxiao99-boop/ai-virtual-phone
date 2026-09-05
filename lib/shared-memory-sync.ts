import { saveMemoryEntry } from "./memory-storage";

const CONFIG_KEY = "ai_phone_shared_memory_sync_v1";

export type SharedMemorySyncConfig = {
    enabled: boolean;
    characterId: string;
    secret: string;
};

export function loadSharedMemorySyncConfig(): SharedMemorySyncConfig {
    if (typeof window === "undefined") return { enabled: false, characterId: "", secret: "" };
    try {
        const parsed = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}") as Partial<SharedMemorySyncConfig>;
        return {
            enabled: parsed.enabled === true,
            characterId: typeof parsed.characterId === "string" ? parsed.characterId : "",
            secret: typeof parsed.secret === "string" ? parsed.secret : "",
        };
    } catch {
        return { enabled: false, characterId: "", secret: "" };
    }
}

export function saveSharedMemorySyncConfig(config: SharedMemorySyncConfig): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function syncSharedMemory(config = loadSharedMemorySyncConfig()): Promise<{ syncedAt: string }> {
    if (!config.characterId || !config.secret) throw new Error("请选择角色并填写同步口令");

    const response = await fetch("/api/shared-memory", {
        method: "GET",
        headers: { Authorization: `Bearer ${config.secret}` },
        cache: "no-store",
    });
    const data = await response.json().catch(() => ({})) as {
        content?: string;
        sha?: string;
        syncedAt?: string;
        error?: string;
    };
    if (!response.ok || !data.content) throw new Error(data.error || "共享记忆同步失败");

    const now = data.syncedAt || new Date().toISOString();
    await saveMemoryEntry({
        id: `shared-memory:${config.characterId}`,
        characterId: config.characterId,
        sourceApp: "chat",
        type: "core",
        content: data.content,
        importance: 1,
        createdAt: now,
        updatedAt: now,
        metadata: {
            origin: "shared_memory_sync",
            remoteSha: data.sha || "",
        },
    });
    return { syncedAt: now };
}

export async function autoSyncSharedMemory(): Promise<void> {
    const config = loadSharedMemorySyncConfig();
    if (!config.enabled || !config.characterId || !config.secret) return;
    await syncSharedMemory(config);
}
