import { Injectable } from '@angular/core';

export interface VolumeSettings {
  master: number;
  bgm: number;
  sfx: number;
  voice: number;
}

@Injectable({ providedIn: 'root' })
export class BgmService {
  private bgm?: HTMLAudioElement;
  private volume = this.loadVolume();

  play(): void {
    if (typeof Audio === 'undefined') {
      return;
    }

    if (!this.bgm) {
      this.bgm = new Audio('/bgm.mp3');
      this.bgm.loop = true;
      this.bgm.preload = 'auto';
    }

    this.applyBgmVolume();
    if (this.bgm.paused) {
      this.bgm.play().catch(() => undefined);
    }
  }

  stop(): void {
    this.bgm?.pause();
    if (this.bgm) {
      this.bgm.currentTime = 0;
    }
  }

  getVolume(): number {
    return this.volume.master;
  }

  setVolume(value: number): void {
    this.setVolumePart('master', value);
  }

  getSettings(): VolumeSettings {
    return { ...this.volume };
  }

  setVolumePart(part: keyof VolumeSettings, value: number): void {
    this.volume = { ...this.volume, [part]: this.clamp(value) };
    this.applyBgmVolume();
    this.saveVolume();
  }

  bgmVolume(): number {
    return this.volume.master * this.volume.bgm;
  }

  sfxVolume(): number {
    return this.volume.master * this.volume.sfx;
  }

  voiceVolume(): number {
    return this.volume.master * this.volume.voice;
  }

  private applyBgmVolume(): void {
    if (this.bgm) {
      this.bgm.volume = this.bgmVolume();
    }
  }

  private saveVolume(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('volumeSettings', JSON.stringify(this.volume));
      localStorage.setItem('gameVolume', String(this.volume.master));
    }
  }

  private loadVolume(): VolumeSettings {
    const defaults: VolumeSettings = { master: 0.7, bgm: 1, sfx: 1, voice: 1 };
    if (typeof localStorage === 'undefined') {
      return defaults;
    }

    const savedSettings = localStorage.getItem('volumeSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as Partial<VolumeSettings>;
        return {
          master: this.clamp(parsed.master ?? defaults.master),
          bgm: this.clamp(parsed.bgm ?? defaults.bgm),
          sfx: this.clamp(parsed.sfx ?? defaults.sfx),
          voice: this.clamp(parsed.voice ?? defaults.voice)
        };
      } catch {
        return defaults;
      }
    }

    const oldVolume = Number(localStorage.getItem('gameVolume'));
    return Number.isFinite(oldVolume) ? { ...defaults, master: this.clamp(oldVolume) } : defaults;
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
