/**
 * js/engine/events.js — Bus de eventos desacoplado emit/on/off para comunicación entre subsistemas.
 * Issue #4 — Cambio de niveles | Rama: feature/sistema-niveles
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Registra un listener para un tipo de evento.
   * @param {string} event
   * @param {(payload: any) => void} callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Elimina un listener registrado.
   * @param {string} event
   * @param {(payload: any) => void} callback
   */
  off(event, callback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Dispara un evento con su carga de datos.
   * @param {string} event
   * @param {any} [payload]
   */
  emit(event, payload = null) {
    const set = this.listeners.get(event);
    if (set) {
      for (const callback of set) {
        try {
          callback(payload);
        } catch (err) {
          console.error(`[events] Error en listener de "${event}":`, err);
        }
      }
    }
  }

  /**
   * Limpia todos los eventos (útil al reiniciar partida).
   */
  clear() {
    this.listeners.clear();
  }
}

export const events = new EventBus();
