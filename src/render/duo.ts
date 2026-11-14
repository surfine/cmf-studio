// The iPhone Duo is not rendered by three.js: Apple's own scene viewer runs in
// a frame (assets/iphone-duo/viewer.html) and this module is its one
// conversation partner. Every message is on one channel and from one origin.

const CHANNEL = "ai6-cmf-duo";
const LOAD_TIMEOUT_MS = 60_000;
const SNAPSHOT_TIMEOUT_MS = 15_000;
/** The recording itself plus slack for encoding. */
const RECORD_SLACK_MS = 20_000;

type Outgoing =
  | { type: "colors"; parts: Readonly<Record<string, string>>; colors: Readonly<Record<string, string>> }
  | { type: "view"; name: string }
  | { type: "fold"; progress: number }
  | { type: "suspend" }
  | { type: "resume" }
  | { type: "snapshot"; id: number }
  | { type: "record"; id: number; durationMs: number };

interface Incoming {
  readonly channel: typeof CHANNEL;
  readonly type: "ready" | "angle" | "error" | "snapshot" | "video" | "video-error";
  readonly angle?: string;
  readonly message?: string;
  readonly id?: number;
  readonly blob?: Blob;
  readonly mime?: string;
}

function isIncoming(data: unknown): data is Incoming {
  // Reading one optional field of an object already checked to be one.
  return typeof data === "object" && data !== null && (data as { channel?: unknown }).channel === CHANNEL;
}

interface Pending {
  resolve(message: Incoming): void;
  reject(error: Error): void;
}

export class AbortedError extends Error {
  override readonly name = "AbortError";
}

export class DuoViewer {
  readonly #frame: HTMLIFrameElement;
  readonly #origin = window.location.origin;
  readonly #pending = new Map<number, Pending>();
  #sequence = 0;
  #ready = false;
  #disposed = false;
  #onAngle: (angle: string) => void;
  #onFailure: (error: Error) => void = () => {};
  readonly #listener = (event: MessageEvent): void => this.#receive(event);

  private constructor(frame: HTMLIFrameElement, onAngle: (angle: string) => void) {
    this.#frame = frame;
    this.#onAngle = onAngle;
  }

  /**
   * Mounts the viewer in `container` and resolves once its scene reports ready.
   * `signal` aborts the load (a device switch); the frame is then removed.
   */
  static load(
    container: HTMLElement,
    title: string,
    url: string,
    onAngle: (angle: string) => void,
    signal: AbortSignal,
  ): Promise<DuoViewer> {
    const frame = document.createElement("iframe");
    frame.className = "cmf-duo-frame";
    frame.title = title;
    // Our own bundled document, served beside this page: same origin, so the
    // viewer's relative asset paths resolve and its scripts stay in the frame.
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.src = url;
    const viewer = new DuoViewer(frame, onAngle);
    return new Promise((resolve, reject) => {
      const fail = (error: Error): void => {
        window.clearTimeout(timeout);
        viewer.dispose();
        reject(error);
      };
      const timeout = window.setTimeout(() => fail(new Error("timeout")), LOAD_TIMEOUT_MS);
      signal.addEventListener("abort", () => fail(new AbortedError("Model changed")), { once: true });
      viewer.#onFailure = fail;
      viewer.#onReady = () => {
        window.clearTimeout(timeout);
        viewer.#onFailure = () => {};
        resolve(viewer);
      };
      window.addEventListener("message", viewer.#listener);
      container.append(frame);
    });
  }

  #onReady: () => void = () => {};

  get ready(): boolean {
    return this.#ready && !this.#disposed;
  }

  set onAngle(listener: (angle: string) => void) {
    this.#onAngle = listener;
  }

  #receive(event: MessageEvent): void {
    if (event.source !== this.#frame.contentWindow || event.origin !== this.#origin || !isIncoming(event.data)) return;
    const message = event.data;
    switch (message.type) {
      case "ready":
        this.#ready = true;
        this.#onReady();
        return;
      case "angle":
        if (message.angle) this.#onAngle(message.angle);
        return;
      case "error":
        this.#ready = false;
        this.#onFailure(new Error(message.message || "viewer"));
        return;
      default: {
        if (message.id === undefined) return;
        const pending = this.#pending.get(message.id);
        if (!pending) return;
        this.#pending.delete(message.id);
        const ok = (message.type === "snapshot" || message.type === "video") && Boolean(message.blob?.size);
        if (ok) pending.resolve(message);
        else pending.reject(new Error(message.message || message.type));
      }
    }
  }

  send(message: Outgoing): void {
    if (!this.ready) return;
    this.#frame.contentWindow?.postMessage({ channel: CHANNEL, ...message }, this.#origin);
  }

  #request(make: (id: number) => Outgoing, timeoutMs: number): Promise<Incoming> {
    if (!this.ready) return Promise.reject(new Error("not ready"));
    const id = ++this.#sequence;
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error("timeout"));
      }, timeoutMs);
      this.#pending.set(id, {
        resolve: (message) => {
          window.clearTimeout(timeout);
          resolve(message);
        },
        reject: (error) => {
          window.clearTimeout(timeout);
          reject(error);
        },
      });
      this.send(make(id));
    });
  }

  /** A PNG of the scene as it stands. */
  async snapshot(): Promise<Blob> {
    const message = await this.#request((id) => ({ type: "snapshot", id }), SNAPSHOT_TIMEOUT_MS);
    if (!message.blob) throw new Error("snapshot");
    return message.blob;
  }

  /** A recording of the fold, with its MIME type. */
  async record(durationMs = 5500): Promise<{ blob: Blob; mime: string }> {
    const message = await this.#request((id) => ({ type: "record", id, durationMs }), durationMs + RECORD_SLACK_MS);
    if (!message.blob) throw new Error("video");
    return { blob: message.blob, mime: message.mime || "video/webm" };
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#ready = false;
    window.removeEventListener("message", this.#listener);
    for (const pending of this.#pending.values()) pending.reject(new AbortedError("Model changed"));
    this.#pending.clear();
    this.#frame.remove();
  }
}
