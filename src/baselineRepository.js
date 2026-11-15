const STORAGE_KEY = 'terrawatch.historical-baselines.v1';

/** Local persistence boundary for AOI baselines. */
export const baselineRepository = {
  async list() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      throw new Error('Browser storage is unavailable. Enable local storage and try again.');
    }
    if (!raw) return [];
    try {
      const baselines = JSON.parse(raw);
      if (!Array.isArray(baselines)) throw new Error('invalid data');
      return baselines;
    } catch {
      throw new Error('Saved baselines could not be read. The local storage data may be damaged.');
    }
  },

  async getByAreaId(areaId) {
    return (await this.list()).find((baseline) => baseline.areaId === areaId) || null;
  },

  /** Create one baseline per AOI, replacing it only when the caller explicitly confirms. */
  async save(baseline, { replace = false } = {}) {
    if (!baseline?.areaId || !baseline?.areaName || !Array.isArray(baseline.observations)) {
      throw new Error('The baseline record is incomplete and could not be saved.');
    }
    const baselines = await this.list();
    const existingIndex = baselines.findIndex((record) => record.areaId === baseline.areaId);
    if (existingIndex >= 0 && !replace) {
      throw new Error('A baseline already exists for this area. Confirm replacement before saving another.');
    }

    const record = {
      ...baseline,
      id: globalThis.crypto?.randomUUID?.() || `baseline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...baselines];
    if (existingIndex >= 0) updated.splice(existingIndex, 1, record);
    else updated.push(record);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      throw new Error('The baseline could not be saved. Check available browser storage and try again.');
    }
    return record;
  },
};
